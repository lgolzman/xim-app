import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { emptyPlanner } from '../lib/planner'
import type { PlannerData } from '../lib/planner'
export function usePlanner(ownerId: string | undefined) {
    const [data, setData] = useState<PlannerData>(emptyPlanner)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const version = useRef<number | null>(null)
    const lock = useRef(false)
    const load = useCallback(async () => {
        if (!ownerId)
            return
        setLoading(true)
        setError('')
        const result = await supabase.from('admin_planners').select('data, revision').eq('owner_id', ownerId).maybeSingle()
        if (result.error)
            setError('No se pudo cargar la agenda. Verificá que esté instalada la migración 018. ' + result.error.message)
        else {
            setData(result.data?.data || emptyPlanner())
            version.current = result.data?.revision ?? null
        }
        setLoading(false)
    }, [ownerId])
    useEffect(() => { void load(); }, [load])
    const save = async (next: PlannerData) => {
        if (!ownerId || lock.current || loading)
            return false
        lock.current = true
        setBusy(true)
        setError('')
        try {
            const revision = version.current
            const result = revision === null
                ? await supabase.from('admin_planners').insert({ owner_id: ownerId, data: next, revision: 1 }).select('revision').single()
                : await supabase.from('admin_planners').update({ data: next, revision: revision + 1 }).eq('owner_id', ownerId).eq('revision', revision).select('revision').single()
            if (result.error)
                throw result.error
            version.current = result.data.revision
            setData(next)
            return true
        }
        catch (err) {
            setError('No se guardaron los cambios. Si la agenda cambió en otra pestaña, recargala antes de continuar. ' + (err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Error de conexión.'))
            return false
        }
        finally {
            lock.current = false
            setBusy(false)
        }
    }
    return { data, loading, busy, error, save, reload: load }
}
