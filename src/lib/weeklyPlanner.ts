import { addDays, dateKey, monday, weekEvents } from './planner'
import type { PlannerData, WeeklyClass, WeeklyPlan } from './planner'
export const workdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// Compatibilidad de lectura: el primer guardado conserva los datos antiguos
// y guarda el nuevo esquema independiente, sin fechas ni recurrencias.
export function readWeeklyPlan(data: PlannerData): WeeklyPlan {
    if (data.weeklyPlan) return data.weeklyPlan
    const current = monday(dateKey(new Date()))
    const candidates = [...new Set([current, addDays(current, 7), ...data.lessons.map(item => monday(item.date)).sort().reverse(), ...Object.values(data.overrides).flatMap(item => item ? [monday(item.date)] : [])])]
    for (const week of candidates) {
        const events = weekEvents(data, week)
        if (events.length) return { classes: events.filter(item => new Date(item.date + 'T12:00:00').getDay() % 6 !== 0).map(item => ({ id: item.key, day: (new Date(item.date + 'T12:00:00').getDay() + 6) % 7, studentId: item.studentId, title: item.title, venueId: item.venueId, start: item.start, duration: item.duration, notes: item.notes })) }
    }
    return { classes: [] }
}
export const sameClass = (a: WeeklyClass | undefined, b: WeeklyClass | undefined) => a && b
    ? (a.kind ?? 'class') === (b.kind ?? 'class') && a.id === b.id && a.day === b.day && a.title === b.title && a.studentId === b.studentId && a.venueId === b.venueId && a.start === b.start && a.duration === b.duration && a.notes === b.notes
    : a === b
export function changedClasses(plan: WeeklyPlan) {
    if (!plan.draft) return []
    return [...new Set([...plan.draft.original, ...plan.draft.classes].map(item => item.id))].filter(id => !sameClass(plan.draft!.original.find(item => item.id === id), plan.draft!.classes.find(item => item.id === id)))
}
export function confirmWeeklyDraft(plan: WeeklyPlan): WeeklyPlan {
    if (!plan.draft) return plan
    const ids = changedClasses(plan)
    for (const id of ids) {
        if (!sameClass(plan.draft.original.find(item => item.id === id), plan.classes.find(item => item.id === id))) throw new Error('El armado actual cambió desde que creaste el borrador. Descartalo y probá los cambios de nuevo.')
    }
    return { classes: [...plan.classes.filter(item => !ids.includes(item.id)), ...plan.draft.classes.filter(item => ids.includes(item.id))] }
}
export function weeklyConflicts(classes: WeeklyClass[], travel: number) {
    const warnings: { ids: string[]; message: string }[] = []
    const sorted = [...classes].sort((a, b) => a.day - b.day || a.start - b.start)
    sorted.forEach((a, i) => sorted.slice(i + 1).forEach(b => {
        if (a.day !== b.day) return
        const gap = b.start - a.start - a.duration
        if (gap < 0) warnings.push({ ids: [a.id, b.id], message: `${workdays[a.day]}: ${a.title} y ${b.title} se superponen.` })
        else if (a.venueId && b.venueId && a.venueId !== b.venueId && gap < travel) warnings.push({ ids: [a.id, b.id], message: `${workdays[a.day]}: ${a.title} → ${b.title}, ${gap} min de traslado; necesitás ${travel}.` })
    }))
    return warnings
}
export function weeklySlots(classes: WeeklyClass[], days: number[], from: number, to: number, duration: number, venueId: string, travel: number, excludeId?: string) {
    const slots: { day: number; start: number }[] = []
    for (const day of [...days].sort()) for (let start = from; start + duration <= to; start += 15) {
        if (classes.filter(item => item.day === day && item.id !== excludeId).every(item => {
            const buffer = !item.venueId || !venueId || item.venueId === venueId ? 0 : travel
            return start + duration + buffer <= item.start || start >= item.start + item.duration + buffer
        })) slots.push({ day, start })
        if (slots.length >= 12) return slots
    }
    return slots
}
