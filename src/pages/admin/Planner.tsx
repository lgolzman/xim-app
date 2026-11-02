import { useCallback, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useStudents } from '../../hooks/useStudents'
import { usePlanner } from '../../hooks/usePlanner'
import { clock, layoutEvents, minutes } from '../../lib/planner'
import type { WeeklyClass, WeeklyPlan } from '../../lib/planner'
import { changedClasses, confirmWeeklyDraft, readWeeklyPlan, sameClass, weeklyConflicts, weeklySlots, workdays } from '../../lib/weeklyPlanner'
import './planner.css'
const colors = ['#0f766e', '#7c3aed', '#c2410c', '#0369a1', '#be185d', '#4d7c0f']
interface ClassEditor extends WeeklyClass { isNew: boolean }
export function Planner() {
    const { user } = useAuth()
    const studentSource = useStudents()
    const planner = usePlanner(user?.id)
    return <PlannerView planner={planner} studentSource={studentSource}/>
}
export function PlannerView({ planner, studentSource }: {
    planner: ReturnType<typeof usePlanner>
    studentSource: Pick<ReturnType<typeof useStudents>, 'students' | 'error'>
}) {
    const { data, loading, busy, error, save, reload } = planner
    const { students, error: studentError } = studentSource
    const scale = 2 / 3
    const plan = readWeeklyPlan(data)
    const [dayCount, setDayCount] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ? 1 : 5)
    const [firstDay, setFirstDay] = useState(0)
    const swipe = useRef<{ x: number; y: number } | null>(null)
    const shownDays = workdays.map((label, day) => ({ label, day })).slice(firstDay, firstDay + dayCount)
    const [mode, setMode] = useState<'current' | 'draft'>('current')
    const [venueFilter, setVenueFilter] = useState('')
    const [studentFilter, setStudentFilter] = useState('')
    const [search, setSearch] = useState('')
    const [newSlot, setNewSlot] = useState<{ day: number; start: number } | null>(null)
    const [editor, setEditor] = useState<ClassEditor | null>(null)
    const [classDays, setClassDays] = useState<number[]>([0])
    const [venueOpen, setVenueOpen] = useState(false)
    const [venueName, setVenueName] = useState('')
    const [venueColor, setVenueColor] = useState(colors[0])
    const [availableDays, setAvailableDays] = useState([0, 1, 2, 3, 4])
    const [availableFrom, setAvailableFrom] = useState(8 * 60)
    const [availableTo, setAvailableTo] = useState(21 * 60)
    const [showSlots, setShowSlots] = useState(false)
    const [formError, setFormError] = useState('')
    const [applyError, setApplyError] = useState('')
    const [message, setMessage] = useState('')
    const [moveKey, setMoveKey] = useState<string | null>(null)
    const [drag, setDrag] = useState<{ id: string; x: number; y: number; pointer: number; offset: number } | null>(null)
    const dragged = useRef(false)
    const [dragHover, setDragHover] = useState<{ x: number; y: number } | null>(null)
    const inDraft = mode === 'draft' && !!plan.draft
    const classes = inDraft ? plan.draft!.classes : plan.classes
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
    const terms = normalize(search).split(/\s+/).filter(Boolean)
    const visible = classes.filter(item => {
        const student = students.find(s => s.id === item.studentId)
        const haystack = normalize([item.title, item.notes, student?.full_name, student?.name, student?.email, data.venues.find(v => v.id === item.venueId)?.name, data.venues.find(v => v.id === item.destinationVenueId)?.name, workdays[item.day], item.kind === 'transfer' ? 'traslado' : item.kind === 'activity' ? 'actividad' : 'clase'].filter(Boolean).join(' '))
        return terms.every(term => haystack.includes(term)) && (!venueFilter || item.venueId === venueFilter || item.destinationVenueId === venueFilter) && (!studentFilter || item.studentId === studentFilter)
    })
    const transferMinutes = classes.filter(item => item.kind === 'transfer').reduce((sum, item) => sum + item.duration, 0)
    const transferTime = transferMinutes >= 60 ? `${Math.floor(transferMinutes / 60)} h${transferMinutes % 60 ? ` ${transferMinutes % 60} min` : ''}` : `${transferMinutes} min`
    const warnings = weeklyConflicts(classes, 0)
    const changes = changedClasses(plan)
    const disabled = busy || loading || !!error
    const calendarScroll = useCallback((node: HTMLDivElement | null) => { if (node) node.scrollTop = 7 * 60 * scale }, [scale])
    const savePlan = (next: WeeklyPlan) => save({ ...data, weeklyPlan: next })
    const saveClasses = (next: WeeklyClass[]) => savePlan(inDraft ? { ...plan, draft: { ...plan.draft!, classes: next } } : { ...plan, classes: next })
    function openEditor(item?: WeeklyClass, kind: 'class' | 'activity' | 'transfer' = 'class', slot?: { day: number; start: number }) {
        setFormError(''); setShowSlots(false); setMoveKey(null)
        setNewSlot(null)
        setClassDays([item?.day ?? slot?.day ?? 0])
        setEditor(item ? { ...item, isNew: false } : { id: crypto.randomUUID(), kind, day: slot?.day ?? 0, studentId: '', title: '', venueId: '', start: slot?.start ?? 540, duration: Math.min(60, 1440 - (slot?.start ?? 540)), notes: '', isNew: true })
    }
    function venueInUse(id: string) {
        return [...plan.classes, ...(plan.draft?.original ?? []), ...(plan.draft?.classes ?? [])].some(item => item.venueId === id || item.destinationVenueId === id)
    }
    async function removeVenue(id: string) {
        const venue = data.venues.find(item => item.id === id)
        if (!venue || disabled || venueInUse(id) || !window.confirm(`¿Eliminar la sede “${venue.name}”?`)) return
        if (await save({ ...data, weeklyPlan: plan, venues: data.venues.filter(item => item.id !== id) })) {
            if (venueFilter === id) setVenueFilter('')
            setMessage('Sede eliminada.')
        }
    }
    async function beginDraft() {
        setMoveKey(null); setApplyError('')
        if (plan.draft || await savePlan({ ...plan, draft: { original: plan.classes.map(item => ({ ...item })), classes: plan.classes.map(item => ({ ...item })) } })) setMode('draft')
    }
    async function saveLesson(e: FormEvent) {
        e.preventDefault()
        if (!editor || disabled) return
        if (!editor.title.trim() || ((editor.kind ?? 'class') === 'class' && !editor.venueId) || !classDays.length || classDays.some(day => !Number.isInteger(day) || day < 0 || day > 4) || !Number.isInteger(editor.start) || !Number.isInteger(editor.duration) || editor.start < 0 || editor.duration < (editor.kind === 'transfer' ? 1 : 15) || editor.start + editor.duration > 1440) {
            setFormError('Indicá nombre, sede para las clases, al menos un día y un horario válido (duración positiva; clases y actividades de al menos 15 minutos, dentro del mismo día).')
            return
        }
        const additions = [...classDays].sort().map(day => ({ id: editor.isNew ? crypto.randomUUID() : editor.id, kind: editor.kind ?? 'class', day, studentId: (editor.kind ?? 'class') === 'class' ? editor.studentId : '', title: editor.title.trim(), venueId: editor.venueId, destinationVenueId: editor.kind === 'transfer' ? editor.destinationVenueId || '' : '', start: editor.start, duration: editor.duration, notes: editor.notes }))
        if (await saveClasses([...classes.filter(item => editor.isNew || item.id !== editor.id), ...additions])) {
            setEditor(null)
            setMessage(inDraft ? 'Cambios guardados en el borrador.' : `${additions.length === 1 ? 'Bloque guardado' : `${additions.length} bloques guardados`} en el armado semanal.`)
        }
    }
    async function removeLesson() {
        if (!editor || editor.isNew || disabled || !window.confirm(inDraft ? '¿Quitar este bloque del borrador?' : '¿Eliminar este bloque del armado semanal?')) return
        if (await saveClasses(classes.filter(item => item.id !== editor.id))) { setEditor(null); setMessage(inDraft ? 'Clase quitada del borrador.' : 'Clase eliminada del armado semanal.') }
    }
    async function moveLesson(id: string, day: number, start: number) {
        if (disabled || !Number.isInteger(day) || day < 0 || day > 4) return
        const lesson = classes.find(item => item.id === id)
        if (!lesson) return
        const next = { ...lesson, day, start: Math.max(0, Math.min(1440 - lesson.duration, Math.round(start / 15) * 15)) }
        if (await saveClasses(classes.map(item => item.id === id ? next : item))) {
            setMoveKey(null); setMessage(inDraft ? 'Clase movida en el borrador. Falta aplicar los cambios.' : 'Clase movida en el armado semanal.')
        }
    }
    async function finishDrag(e: PointerEvent<HTMLButtonElement>) {
        if (!drag || e.pointerId !== drag.pointer) return
        const previous = drag
        setDrag(null); setDragHover(null)
        const column = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-planner-day]')
        if (column) await moveLesson(previous.id, Number(column.dataset.plannerDay), (e.clientY - column.getBoundingClientRect().top - previous.offset) / scale)
    }
    async function apply() {
        if (disabled || !window.confirm(`¿Aplicar ${changes.length} cambios al armado semanal?${warnings.length ? ' Hay avisos de horarios para revisar.' : ''}`)) return
        try {
            setApplyError('')
            if (await savePlan(confirmWeeklyDraft(plan))) { setMode('current'); setMoveKey(null); setMessage('Cambios aplicados al armado semanal.') }
        } catch (err) { setApplyError(err instanceof Error ? err.message : 'No se pudo aplicar el borrador.') }
    }
    async function discard() {
        if (disabled || !window.confirm('¿Descartar el borrador?')) return
        if (await savePlan({ classes: plan.classes })) { setMode('current'); setMoveKey(null); setApplyError('') }
    }
    return <Layout><div className="planner">
        <div className="planner-heading"><div><p className="planner-eyebrow">XIM · ORGANIZACIÓN</p><h1>Semana laboral</h1><p>Clases y actividades de lunes a viernes, por día y horario.</p></div><button className="pl-button" disabled={disabled} onClick={() => openEditor()}>＋ Agregar clase</button><button className="pl-button" disabled={disabled} onClick={() => openEditor(undefined, 'activity')}>＋ Agregar actividad</button><button className="pl-button" disabled={disabled} onClick={() => openEditor(undefined, 'transfer')}>＋ Agregar traslado</button></div>
        {error && <div className="pl-error" role="alert">{error} <button disabled={busy} onClick={() => void reload()}>Recargar</button></div>}
        {applyError && <p className="pl-error" role="alert">{applyError}</p>}
        {studentError && <p role="alert">No se pudieron cargar los alumnos: {studentError}</p>}
        {message && <p className="pl-message" role="status">{message}</p>}
        {loading ? <p>Cargando semana…</p> : <>
            {!data.weeklyPlan && (data.lessons.length > 0 || Object.keys(data.drafts).length > 0) && <p className="pl-empty">Se adaptó una semana de la agenda anterior al nuevo armado laboral. Revisá las clases antes de guardar. Los datos y borradores anteriores se conservan como respaldo; los sábados y domingos quedan fuera de esta vista.</p>}
            <div className="pl-toolbar"><strong>Lunes a viernes</strong><div className="pl-modes"><button className={!inDraft ? 'selected' : ''} onClick={() => { setMode('current'); setMoveKey(null) }}>Armado actual</button><button disabled={disabled} className={inDraft ? 'selected' : ''} onClick={() => void beginDraft()}>{plan.draft ? 'Retomar borrador' : 'Probar cambios'}</button></div></div>
            {inDraft && <div className="pl-draft"><div><strong>Estás probando cambios · {changes.length} modificaciones</strong><p>Se guarda cada cambio en el borrador. El armado actual se conserva hasta aplicar los cambios.</p></div><div><button disabled={disabled} onClick={() => void discard()}>Descartar</button><button className="pl-button" disabled={disabled || !changes.length} onClick={() => void apply()}>Aplicar cambios</button></div></div>}
            <div className="pl-view-controls"><div className="pl-modes" aria-label="Cantidad de días">{[1, 2, 5].map(count => <button key={count} aria-pressed={dayCount === count} className={dayCount === count ? 'selected' : ''} onClick={() => { setDayCount(count); setFirstDay(Math.min(firstDay, 5 - count)) }}>{count === 5 ? 'Semana' : `${count} ${count === 1 ? 'día' : 'días'}`}</button>)}</div></div>
            <div className="pl-filters"><label>Buscar<input type="search" value={search} placeholder="Nombre, sede, actividad…" onChange={e => setSearch(e.target.value)}/></label><label>Sede<select value={venueFilter} onChange={e => setVenueFilter(e.target.value)}><option value="">Todas las sedes</option>{data.venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Alumno<select value={studentFilter} onChange={e => setStudentFilter(e.target.value)}><option value="">Todos los alumnos</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name || s.email}</option>)}</select></label><button disabled={disabled} onClick={() => setVenueOpen(true)}>Administrar sedes</button></div>
            <div className="pl-summary"><span><strong>{classes.filter(item => (item.kind ?? 'class') === 'class').length}</strong> clases</span><span><strong>{classes.filter(item => item.kind === 'activity' || item.kind === 'transfer').length}</strong> actividades</span><span><strong>{Number((classes.reduce((sum, item) => sum + item.duration, 0) / 60).toFixed(1))}</strong> horas semanales</span><span><strong>{transferTime}</strong> en traslados</span><span className={warnings.length ? 'pl-warning-text' : ''}>{warnings.length ? `${warnings.length} avisos para revisar` : 'Sin cruces de horarios'}</span><span>{busy ? 'Guardando…' : inDraft ? 'Borrador guardado' : 'Armado actual'}</span></div>
            {!classes.length && <div className="pl-empty">Agregá clases o actividades eligiendo los días y horarios de tu semana laboral.</div>}
            <p className="pl-footnote">Con el mouse podés arrastrar los bloques. En el celular, tocá un bloque y elegí “Mover en la grilla”; deslizar el dedo solo desplaza la vista.</p>
            {moveKey && <div className="pl-move-notice" role="status">Mover {classes.find(item => item.id === moveKey)?.title}: tocá el horario de destino en la grilla. <button onClick={() => setMoveKey(null)}>Cancelar movimiento</button></div>}
            {!!terms.length && <p className="pl-message" role="status">{visible.length} de {classes.length} bloques coinciden con la búsqueda.</p>}
            <div className={dayCount < 5 ? 'pl-scroll pl-focused' : 'pl-scroll'} ref={calendarScroll} style={{ touchAction: dayCount < 5 ? 'pan-y pinch-zoom' : 'auto' }} onPointerDownCapture={e => {
                if (e.pointerType === 'touch' && dayCount < 5) { swipe.current = { x: e.clientX, y: e.clientY }; dragged.current = false }
            }} onPointerMoveCapture={e => {
                if (swipe.current && Math.abs(e.clientX - swipe.current.x) > 40 && Math.abs(e.clientX - swipe.current.x) > Math.abs(e.clientY - swipe.current.y) * 1.5) dragged.current = true
            }} onPointerUpCapture={e => {
                const start = swipe.current; swipe.current = null
                if (!start) return
                const dx = e.clientX - start.x, dy = e.clientY - start.y
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    dragged.current = true
                    setFirstDay(Math.max(0, Math.min(5 - dayCount, firstDay + (dx < 0 ? 1 : -1))))
                }
            }} onPointerCancelCapture={() => { swipe.current = null }}><div className="pl-calendar" style={{ gridTemplateColumns: `48px repeat(${dayCount}, minmax(0, 1fr))` }}><div className="pl-day-header pl-time-header">Hora</div>{shownDays.map(({ label, day }) => <div className="pl-day-header" key={day}>{dayCount < 5 && day === firstDay && <button className="pl-day-nav" aria-label="Día anterior" disabled={firstDay === 0} onClick={() => setFirstDay(Math.max(0, firstDay - 1))}>‹</button>}<strong>{label}</strong><small>{Number((classes.filter(item => item.day === day).reduce((sum, item) => sum + item.duration, 0) / 60).toFixed(1))} h</small>{dayCount < 5 && day === firstDay + dayCount - 1 && <button className="pl-day-nav" aria-label="Día siguiente" disabled={firstDay + dayCount >= 5} onClick={() => setFirstDay(Math.min(5 - dayCount, firstDay + 1))}>›</button>}</div>)}
                <div className="pl-times" style={{ height: 1440 * scale }}>{Array.from({ length: 24 }, (_, i) => <span key={i} style={{ top: i * 60 * scale }}>{clock(i * 60)}</span>)}</div>
                {shownDays.map(({ day }) => {
                    const daily = visible.filter(item => item.day === day)
                    const positions = layoutEvents(daily.map(item => ({ ...item, key: item.id })))
                    return <div key={day} data-planner-day={day} className={`pl-day ${moveKey ? 'pl-drop-target' : ''}`} style={{ height: 1440 * scale, backgroundSize: `100% ${60 * scale}px` }} onClick={e => {
                        if (e.target !== e.currentTarget || disabled || dragged.current) return
                        const start = (e.clientY - e.currentTarget.getBoundingClientRect().top) / scale
                        if (moveKey) void moveLesson(moveKey, day, start)
                        else setNewSlot({ day, start: Math.max(0, Math.min(1425, Math.round(start / 15) * 15)) })
                    }} onPointerDown={e => { if (e.target === e.currentTarget) dragged.current = false }}>
                        {daily.map(item => {
                            const venue = data.venues.find(v => v.id === item.venueId)
                            const original = plan.draft?.original.find(previous => previous.id === item.id)
                            const modified = inDraft && !sameClass(original, item)
                            const { column, columns } = positions[item.id]
                            return <button key={item.id} className={`pl-event ${item.kind === 'transfer' ? 'pl-transfer' : item.kind === 'activity' ? 'pl-activity' : ''} ${modified ? 'modified' : ''} ${drag?.id === item.id ? 'dragging' : ''} ${moveKey === item.id ? 'moving' : ''}`} disabled={disabled} style={{ top: item.start * scale, height: item.duration * scale, background: (venue?.color || '#64748b') + '18', borderLeftColor: venue?.color || '#64748b', left: `calc(${column / columns * 100}% + 3px)`, width: `calc(${100 / columns}% - 6px)`, touchAction: 'auto', cursor: 'grab' }} title={`${item.kind === 'transfer' ? 'Traslado: ' : item.kind === 'activity' ? 'Actividad: ' : 'Clase: '}${item.title} · ${clock(item.start)}–${clock(item.start + item.duration)} · ${venue?.name || ''}`} onPointerDown={e => {
                                dragged.current = false
                                if (e.pointerType === 'mouse' && e.button === 0 && !moveKey) { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: item.id, x: e.clientX, y: e.clientY, pointer: e.pointerId, offset: e.clientY - e.currentTarget.getBoundingClientRect().top }) }
                            }} onPointerMove={e => { if (drag?.id === item.id && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) setDragHover({ x: e.clientX, y: e.clientY }) }} onPointerUp={e => {
                                if (drag && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) { dragged.current = true; void finishDrag(e) }
                                else { setDrag(null); setDragHover(null) }
                            }} onPointerCancel={() => { dragged.current = true; setDrag(null); setDragHover(null) }} onClick={() => { if (!dragged.current && !moveKey) openEditor(item) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(item) } }}>
                                <span className="pl-event-time">{clock(item.start)}–{clock(item.start + item.duration)} {warnings.some(w => w.ids.includes(item.id)) ? '⚠' : ''}</span><strong>{item.kind === 'transfer' ? '→ ' : item.kind === 'activity' ? '◇ ' : ''}{item.title}</strong>{venue && item.duration >= 45 && <span className="pl-event-venue">{venue.name}</span>}
                            </button>
                        })}
                    </div>
                })}
            </div></div>
            {!!warnings.length && <div className="pl-warnings"><strong>Horarios para revisar</strong>{warnings.map((w, i) => <p key={i}>⚠ {w.message}</p>)}</div>}
            {inDraft && !!changes.length && <details className="pl-changes"><summary>Ver los {changes.length} cambios propuestos</summary>{changes.map(id => {
                const old = plan.draft!.original.find(item => item.id === id), next = plan.draft!.classes.find(item => item.id === id)
                return <p key={id}><strong>{next?.title || old?.title}</strong>: {old ? `${workdays[old.day]} ${clock(old.start)}` : 'Nueva clase'} → {next ? `${workdays[next.day]} ${clock(next.start)}` : 'Eliminada'}</p>
            })}</details>}
            <p className="pl-footnote">◇ Actividad · → Traslado · Cada traslado se carga como bloque con su propia duración. Los avisos consideran todas las clases y actividades, aunque haya filtros activos.</p>
        </>}
        {drag && dragHover && <div className="pl-drag-ghost" style={{ left: dragHover.x + 12, top: dragHover.y + 12 }}>{classes.find(item => item.id === drag.id)?.title}<small>Soltá para mover · intervalos de 15 min</small></div>}
        <Modal isOpen={!!newSlot} onClose={() => setNewSlot(null)} title="Agregar en este horario">
            {newSlot && <div className="pl-form"><p>{workdays[newSlot.day]} · {clock(newSlot.start)}</p><button className="pl-button" onClick={() => openEditor(undefined, 'class', newSlot)}>Clase</button><button className="pl-button" onClick={() => openEditor(undefined, 'activity', newSlot)}>Actividad</button><button className="pl-button" onClick={() => openEditor(undefined, 'transfer', newSlot)}>Traslado</button></div>}
        </Modal>
        <Modal isOpen={!!editor} onClose={() => { if (!busy) setEditor(null) }} title={editor?.kind === 'transfer' ? editor.isNew ? 'Agregar traslado' : 'Editar traslado' : editor?.kind === 'activity' ? editor.isNew ? 'Agregar actividad' : 'Editar actividad' : editor?.isNew ? 'Agregar clase' : 'Editar clase'}>
            {editor && <form className="pl-form" onSubmit={e => void saveLesson(e)}>
                {(editor.kind ?? 'class') === 'class' && <label>Alumno (opcional para bloqueos personales)<select value={editor.studentId} onChange={e => { const student = students.find(s => s.id === e.target.value); setEditor({ ...editor, studentId: e.target.value, title: student ? student.full_name || student.name || student.email || 'Clase' : editor.title }) }}><option value="">Sin alumno / bloqueo personal</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name || s.email}</option>)}</select></label>}
                <label>Nombre de la clase o compromiso<input required maxLength={120} value={editor.title} onChange={e => setEditor({ ...editor, title: e.target.value })}/></label>
                <label>{editor.kind === 'transfer' ? 'Origen (opcional)' : editor.kind === 'activity' ? 'Sede (opcional)' : 'Sede'}<select required={(editor.kind ?? 'class') === 'class'} value={editor.venueId} onChange={e => setEditor({ ...editor, venueId: e.target.value })}><option value="">{(editor.kind ?? 'class') === 'class' ? 'Seleccionar sede' : 'Sin sede'}</option>{data.venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
                {editor.kind === 'transfer' && <label>Destino (opcional)<select value={editor.destinationVenueId || ''} onChange={e => setEditor({ ...editor, destinationVenueId: e.target.value })}><option value="">Sin sede</option>{data.venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
                <fieldset className="pl-class-days"><legend>{editor.isNew ? 'Días' : 'Día'}</legend><p>{editor.isNew ? 'Elegí uno o varios días con el mismo horario.' : 'Elegí el día de esta clase.'}</p><div className="pl-day-options">{workdays.map((day, i) => <label key={day}><input type={editor.isNew ? 'checkbox' : 'radio'} name="class-day" checked={classDays.includes(i)} onChange={e => setClassDays(editor.isNew ? e.target.checked ? [...classDays, i] : classDays.filter(d => d !== i) : [i])}/>{day.slice(0, 3)}</label>)}</div></fieldset>
                <div className="pl-form-row"><label>Horario<input required type="time" step="900" value={clock(editor.start)} onChange={e => setEditor({ ...editor, start: minutes(e.target.value) })}/></label><label>Minutos<input required type="number" min={editor.kind === 'transfer' ? 1 : 15} max="1440" step="1" value={editor.duration} onChange={e => setEditor({ ...editor, duration: Number(e.target.value) })}/></label></div>
                <details className="pl-slot-finder"><summary>Buscar dónde encajar esta clase</summary><p>Marcá los días disponibles. La búsqueda contempla las clases y los traslados.</p><div className="pl-day-options">{workdays.map((day, i) => <label key={day}><input type="checkbox" checked={availableDays.includes(i)} onChange={e => { setAvailableDays(e.target.checked ? [...availableDays, i] : availableDays.filter(d => d !== i)); setShowSlots(false) }}/>{day.slice(0, 3)}</label>)}</div><div className="pl-form-row"><label>Desde<input type="time" value={clock(availableFrom)} onChange={e => { setAvailableFrom(minutes(e.target.value)); setShowSlots(false) }}/></label><label>Hasta<input type="time" value={clock(availableTo)} onChange={e => { setAvailableTo(minutes(e.target.value)); setShowSlots(false) }}/></label><button type="button" disabled={((editor.kind ?? 'class') === 'class' && !editor.venueId) || editor.duration < (editor.kind === 'transfer' ? 1 : 15) || availableFrom >= availableTo} onClick={() => setShowSlots(true)}>Buscar huecos</button></div>{showSlots && <div className="pl-slots">{(() => {
                    const slots = weeklySlots(classes, availableDays, availableFrom, availableTo, editor.duration, editor.venueId, 0, editor.isNew ? undefined : editor.id)
                    return slots.length ? slots.map(slot => <button type="button" key={`${slot.day}:${slot.start}`} onClick={() => { setClassDays([slot.day]); setEditor({ ...editor, start: slot.start }) }}>{workdays[slot.day]} · {clock(slot.start)}</button>) : <p>No hay huecos compatibles. Probá otra franja o reorganizá el armado en un borrador.</p>
                })()}</div>}</details>
                <label>Notas / disponibilidad del alumno<textarea maxLength={1000} value={editor.notes} onChange={e => setEditor({ ...editor, notes: e.target.value })}/></label>
                {formError && <p className="pl-error" role="alert">{formError}</p>}{error && <p className="pl-error" role="alert">{error}</p>}
                <p className="pl-footnote">{inDraft ? 'Se guarda en el borrador hasta aplicar los cambios.' : 'Se guarda en tu armado de semana laboral.'}</p>
                <div className="pl-actions">{!editor.isNew && <><button type="button" disabled={disabled} onClick={() => { setMoveKey(editor.id); setEditor(null) }}>Mover en la grilla</button><button type="button" disabled={disabled} onClick={() => void removeLesson()}>{editor.kind === 'transfer' ? 'Eliminar traslado' : editor.kind === 'activity' ? 'Eliminar actividad' : 'Eliminar clase'}</button></>}<button className="pl-button" disabled={disabled}>{busy ? 'Guardando…' : 'Guardar'}</button></div>
            </form>}
        </Modal>
        <Modal isOpen={venueOpen} onClose={() => { if (!busy) setVenueOpen(false) }} title="Sedes"><div className="pl-venue-list">{data.venues.map(venue => <div key={venue.id}><span>{venue.name}{venueInUse(venue.id) && <small>En uso por clases o borradores; no se puede eliminar.</small>}</span><button type="button" disabled={disabled || venueInUse(venue.id)} onClick={() => void removeVenue(venue.id)} aria-label={`Eliminar sede ${venue.name}`}>Eliminar</button></div>)}</div><h3>Nueva sede</h3><form className="pl-form" onSubmit={async e => {
            e.preventDefault()
            if (disabled || !venueName.trim()) return
            if (await save({ ...data, weeklyPlan: plan, venues: [...data.venues, { id: crypto.randomUUID(), name: venueName.trim(), color: venueColor }] })) { setVenueName(''); setVenueOpen(false) }
        }}><label>Nombre<input required maxLength={80} placeholder="Gimnasio, domicilio, online…" value={venueName} onChange={e => setVenueName(e.target.value)}/></label><label>Color<input type="color" value={venueColor} onChange={e => setVenueColor(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<button disabled={disabled} className="pl-button">Guardar sede</button></form></Modal>
    </div></Layout>
}
