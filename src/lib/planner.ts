export interface Venue {
    id: string
    name: string
    color: string
}
export interface Lesson {
    id: string
    studentId: string
    title: string
    venueId: string
    date: string
    start: number
    duration: number
    repeat: 'once' | 'weekly' | 'monthly'
    until?: string
    notes: string
}
export interface Occurrence extends Lesson {
    key: string
}
export interface WeekDraft {
    original: Occurrence[]
    events: Occurrence[]
}
export interface WeeklyClass {
    kind?: 'class' | 'activity' | 'transfer'
    destinationVenueId?: string
    id: string
    day: number
    studentId: string
    title: string
    venueId: string
    start: number
    duration: number
    notes: string
}
export interface WeeklyPlan {
    classes: WeeklyClass[]
    draft?: { original: WeeklyClass[]; classes: WeeklyClass[] }
}
export interface PlannerData {
    weeklyPlan?: WeeklyPlan
    venues: Venue[]
    lessons: Lesson[]
    overrides: Record<string, Occurrence | null>
    drafts: Record<string, WeekDraft>
    travelMinutes: number
}
export const emptyPlanner = (): PlannerData => ({ venues: [], lessons: [], overrides: {}, drafts: {}, travelMinutes: 30 })
export function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function addDays(date: string, n: number): string {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + n)
    return dateKey(d)
}
export function monday(date: string): string {
    return addDays(date, -((new Date(date + 'T12:00:00').getDay() + 6) % 7))
}
export const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
export const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
export function weekEvents(data: PlannerData, week: string): Occurrence[] {
    const events = new Map<string, Occurrence>()
    for (let i = 0; i < 7; i++) {
        const date = addDays(week, i)
        for (const lesson of data.lessons) {
            if (date < lesson.date || (lesson.until && date > lesson.until))
                continue
            const match = lesson.repeat === 'once' ? date === lesson.date
                : lesson.repeat === 'weekly' ? new Date(date + 'T12:00:00').getDay() === new Date(lesson.date + 'T12:00:00').getDay()
                    : date.slice(8) === lesson.date.slice(8)
            if (match) {
                const key = `${lesson.id}:${date}`
                if (!(key in data.overrides))
                    events.set(key, { ...lesson, date, key })
            }
        }
    }
    for (const [key, event] of Object.entries(data.overrides)) {
        if (event && event.date >= week && event.date <= addDays(week, 6))
            events.set(key, event)
    }
    return [...events.values()].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
}
export function changed(a: Occurrence | undefined, b: Occurrence | undefined): boolean {
    if (!a || !b)
        return a !== b
    const fields: (keyof Occurrence)[] = ['key', 'id', 'studentId', 'title', 'venueId', 'date', 'start', 'duration', 'repeat', 'until', 'notes']
    return fields.some(field => a[field] !== b[field])
}
export function applyDraft(data: PlannerData, week: string): PlannerData {
    const draft = data.drafts[week]
    if (!draft)
        return data
    const current = weekEvents(data, week)
    for (const old of draft.original) {
        const next = draft.events.find(e => e.key === old.key)
        if (changed(old, next) && changed(old, current.find(e => e.key === old.key))) {
            throw new Error('La agenda confirmada cambió desde que creaste el borrador. Revisá la agenda actual y creá un borrador nuevo para evitar sobrescribir cambios.')
        }
    }
    const overrides = { ...data.overrides }
    for (const old of draft.original) {
        const next = draft.events.find(e => e.key === old.key)
        if (changed(old, next))
            overrides[old.key] = next || null
    }
    for (const next of draft.events)
        if (!draft.original.some(e => e.key === next.key))
            overrides[next.key] = next
    const drafts = { ...data.drafts }
    delete drafts[week]
    return { ...data, overrides, drafts }
}
export function conflicts(events: Occurrence[], travel: number): {
    keys: string[]
    message: string
}[] {
    const result: {
        keys: string[]
        message: string
    }[] = []
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
    for (let i = 0; i < sorted.length; i++)
        for (let j = i + 1; j < sorted.length; j++) {
            const a = sorted[i], b = sorted[j]
            if (a.date !== b.date)
                continue
            const gap = b.start - (a.start + a.duration)
            if (gap < 0)
                result.push({ keys: [a.key, b.key], message: `${a.title} y ${b.title}: clases superpuestas (${a.date}).` })
            else if (a.venueId !== b.venueId && gap < travel)
                result.push({ keys: [a.key, b.key], message: `${a.title} → ${b.title}: ${gap} min para trasladarse; necesitás ${travel} (${a.date}).` })
        }
    return result
}
// Buscar horarios dentro de la disponibilidad indicada, sin cruces ni traslados imposibles.
export function findSlots(events: Occurrence[], week: string, weekdays: number[], from: number, to: number, duration: number, venueId: string, travel: number, excludeKey?: string): {
    date: string
    start: number
}[] {
    const result: {
        date: string
        start: number
    }[] = []
    const others = events.filter(e => e.key !== excludeKey)
    for (const day of [...weekdays].sort()) {
        const date = addDays(week, day)
        for (let start = from; start + duration <= to; start += 15) {
            const fits = others.filter(e => e.date === date).every(e => {
                const buffer = e.venueId !== venueId ? travel : 0
                return start + duration + buffer <= e.start || start >= e.start + e.duration + buffer
            })
            if (fits) {
                result.push({ date, start })
                if (result.length >= 12)
                    return result
            }
        }
    }
    return result
}
// Distribuir grupos superpuestos en columnas, sin ocultar clases detrás de otras.
export function layoutEvents(events: { key: string; start: number; duration: number }[]): Record<string, {
    column: number
    columns: number
}> {
    const result: Record<string, {
        column: number
        columns: number
    }> = {}
    const sorted = [...events].sort((a, b) => a.start - b.start || b.duration - a.duration)
    let group: { key: string; start: number; duration: number }[] = [], end = -1
    const flush = () => {
        const lanes: number[] = []
        for (const event of group) {
            let column = lanes.findIndex(until => until <= event.start)
            if (column < 0)
                column = lanes.length
            lanes[column] = event.start + event.duration
            result[event.key] = { column, columns: 0 }
        }
        for (const event of group)
            result[event.key].columns = lanes.length
    }
    for (const event of sorted) {
        if (event.start >= end) {
            flush()
            group = []
            end = -1
        }
        group.push(event)
        end = Math.max(end, event.start + event.duration)
    }
    flush()
    return result
}

// Cuenta ocurrencias vigentes, no las filas originales anuladas por excepciones.
export function venueHasClasses(data: PlannerData, venueId: string): boolean {
    if (Object.values(data.overrides).some(event => event?.venueId === venueId)) return true
    if (Object.values(data.drafts).some(draft => [...draft.original, ...draft.events].some(event => event.venueId === venueId))) return true
    return data.lessons.some(lesson => {
        if (lesson.venueId !== venueId) return false
        let date = lesson.date
        // Tras agotar las excepciones, la próxima ocurrencia necesariamente está vigente.
        let remaining = Object.keys(data.overrides).length + 1
        while (remaining > 0 && (!lesson.until || date <= lesson.until)) {
            const matches = lesson.repeat !== 'monthly' || date.slice(8) === lesson.date.slice(8)
            if (matches) {
                if (!(`${lesson.id}:${date}` in data.overrides)) return true
                remaining--
            }
            if (lesson.repeat === 'once') break
            date = addDays(date, lesson.repeat === 'weekly' ? 7 : 1)
        }
        return false
    })
}
