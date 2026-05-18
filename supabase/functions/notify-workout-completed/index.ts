import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type WorkoutLog = {
  id: string
  student_id: string
  routine_id: string
  routine_day_id: string
  week_number: number
  completed_at: string
  student_note: string | null
}

type SetType = 'reps' | 'time'

type Profile = {
  id: string
  email: string
  full_name?: string | null
  name?: string | null
}

type Routine = {
  id: string
  name: string
}

type RoutineDay = {
  id: string
  day_number: number
  name: string | null
}

type ExerciseNoteRow = {
  note: string
  block_exercise_id: string
}

type BlockExerciseRow = {
  id: string
  exercise: {
    name: string
  } | null
}

type LoggedSet = {
  block_exercise_id: string
  set_number: number
  actual_reps: number | null
  actual_weight_kg: number | null
  actual_seconds: number | null
}

type PrescribedSet = {
  id: string
  block_exercise_id: string
  week_number: number
  set_number: number
  set_type: SetType
  quantity: number
  weight_kg: number | null
}

type DetailedBlockExercise = {
  id: string
  exercise_id: string
  position: number
  note: string | null
  active?: boolean | null
  exercise: {
    name: string
  } | null
  prescribed_sets: PrescribedSet[]
}

type DetailedRoutineBlock = {
  id: string
  block_letter: string
  block_order: number
  block_exercises: DetailedBlockExercise[]
}

type DetailedRoutineDay = RoutineDay & {
  routine_blocks: DetailedRoutineBlock[]
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '')

const normalizeAppUrl = (url: string) => {
  try {
    return new URL(url).origin
  } catch {
    return normalizeBaseUrl(url)
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value))

const formatPrescribed = (set: PrescribedSet) => {
  const quantity = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity} reps`
  const weight = set.weight_kg != null ? ` / ${set.weight_kg}kg` : ''
  return quantity + weight
}

const formatActual = (loggedSet: LoggedSet | undefined, setType: SetType) => {
  if (!loggedSet) return '-'

  const quantity = setType === 'time'
    ? (loggedSet.actual_seconds != null ? `${loggedSet.actual_seconds}"` : '-')
    : (loggedSet.actual_reps != null ? `${loggedSet.actual_reps} reps` : '-')
  const weight = loggedSet.actual_weight_kg != null ? ` / ${loggedSet.actual_weight_kg}kg` : ''

  if (quantity === '-' && !weight) return '-'
  return quantity + weight
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const trainerEmail = Deno.env.get('TRAINER_EMAIL')
    const appUrl = Deno.env.get('APP_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!resendApiKey || !trainerEmail || !appUrl || !supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables for workout notification')
      return jsonResponse({ error: 'Missing required configuration' }, 500)
    }

    const { workoutLogId } = await req.json().catch(() => ({ workoutLogId: null }))

    if (!workoutLogId || typeof workoutLogId !== 'string') {
      return jsonResponse({ error: 'workoutLogId is required' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })

    const { data: log, error: logError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('id', workoutLogId)
      .single<WorkoutLog>()

    if (logError || !log) {
      console.error('Could not load workout log for notification', logError)
      return jsonResponse({ error: 'Workout log not found' }, 404)
    }

    const [
      { data: student, error: studentError },
      { data: routine, error: routineError },
      { data: routineDay, error: routineDayError },
      exerciseNotesResult,
      loggedSetsResult,
      routineDayDetailsResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', log.student_id)
        .single<Profile>(),
      supabase
        .from('routines')
        .select('id, name')
        .eq('id', log.routine_id)
        .single<Routine>(),
      supabase
        .from('routine_days')
        .select('id, day_number, name')
        .eq('id', log.routine_day_id)
        .single<RoutineDay>(),
      supabase
        .from('workout_exercise_notes')
        .select('note, block_exercise_id')
        .eq('workout_log_id', log.id)
        .returns<ExerciseNoteRow[]>(),
      supabase
        .from('logged_sets')
        .select('block_exercise_id, set_number, actual_reps, actual_weight_kg, actual_seconds')
        .eq('workout_log_id', log.id)
        .returns<LoggedSet[]>(),
      supabase
        .from('routine_days')
        .select(`
          id,
          day_number,
          name,
          routine_blocks(
            id,
            block_letter,
            block_order,
            block_exercises(
              id,
              exercise_id,
              position,
              note,
              active,
              exercise:exercises(name),
              prescribed_sets(*)
            )
          )
        `)
        .eq('id', log.routine_day_id)
        .single<DetailedRoutineDay>(),
    ])

    if (studentError || routineError || routineDayError || loggedSetsResult.error || routineDayDetailsResult.error) {
      console.error('Could not load workout notification details', {
        studentError,
        routineError,
        routineDayError,
        loggedSetsError: loggedSetsResult.error,
        routineDayDetailsError: routineDayDetailsResult.error,
      })
      return jsonResponse({ error: 'Could not load workout details' }, 500)
    }

    if (exerciseNotesResult.error) {
      console.error('Could not load workout exercise notes for notification', exerciseNotesResult.error)
    }

    const exerciseNotes = exerciseNotesResult.error ? [] : exerciseNotesResult.data
    const loggedSets = loggedSetsResult.data || []
    const routineDayDetails = routineDayDetailsResult.data
    const blockExerciseIds = (exerciseNotes || []).map(note => note.block_exercise_id)
    const exerciseNameByBlockExerciseId = new Map<string, string>()

    if (blockExerciseIds.length > 0) {
      const { data: blockExercises, error: blockExercisesError } = await supabase
        .from('block_exercises')
        .select('id, exercise:exercises(name)')
        .in('id', blockExerciseIds)
        .returns<BlockExerciseRow[]>()

      if (blockExercisesError) {
        console.error('Could not load exercise names for workout notification', blockExercisesError)
        return jsonResponse({ error: 'Could not load exercise notes' }, 500)
      }

      for (const blockExercise of blockExercises || []) {
        exerciseNameByBlockExerciseId.set(
          blockExercise.id,
          blockExercise.exercise?.name || 'Ejercicio'
        )
      }
    }

    const studentName = student?.full_name || student?.name || student?.email || 'Un alumno'
    const routineName = routine?.name || 'su rutina'
    const dayLabel = routineDay?.day_number ? `Día ${routineDay.day_number}` : 'un día'
    const detailUrl = `${normalizeAppUrl(appUrl)}/admin/students/${log.student_id}/workouts/${log.id}`
    const trimmedStudentNote = log.student_note?.trim()
    const notesWithExerciseNames = (exerciseNotes || [])
      .map(note => ({
        exerciseName: exerciseNameByBlockExerciseId.get(note.block_exercise_id) || 'Ejercicio',
        note: note.note.trim(),
      }))
      .filter(note => note.note.length > 0)
    const loggedSetByKey = new Map<string, LoggedSet>()
    const exerciseNoteByBlockExerciseId = new Map<string, string>()

    for (const loggedSet of loggedSets) {
      loggedSetByKey.set(`${loggedSet.block_exercise_id}:${loggedSet.set_number}`, loggedSet)
    }

    for (const note of exerciseNotes || []) {
      const trimmedNote = note.note.trim()
      if (trimmedNote) exerciseNoteByBlockExerciseId.set(note.block_exercise_id, trimmedNote)
    }

    const sortedBlocks = [...(routineDayDetails?.routine_blocks || [])].sort(
      (a, b) => a.block_order - b.block_order
    )

    const workoutDetailText = sortedBlocks.flatMap(block => {
      const blockLines = [`Bloque ${block.block_letter}`]
      const sortedExercises = [...(block.block_exercises || [])].sort(
        (a, b) => a.position - b.position
      )

      for (const exercise of sortedExercises) {
        const exerciseName = exercise.exercise?.name || 'Ejercicio'
        const exerciseNote = exerciseNoteByBlockExerciseId.get(exercise.id)
        const prescribedSets = [...(exercise.prescribed_sets || [])]
          .filter(set => set.week_number === log.week_number)
          .sort((a, b) => a.set_number - b.set_number)

        blockLines.push(`- ${block.block_letter}${exercise.position} · ${exerciseName}`)
        if (exercise.note?.trim()) blockLines.push(`  Nota prescripta: ${exercise.note.trim()}`)
        if (exerciseNote) blockLines.push(`  Comentario del alumno: ${exerciseNote}`)

        for (const set of prescribedSets) {
          const loggedSet = loggedSetByKey.get(`${exercise.id}:${set.set_number}`)
          blockLines.push(
            `  Serie ${set.set_number}: prescrito ${formatPrescribed(set)} | registrado ${formatActual(loggedSet, set.set_type)}`
          )
        }
      }

      return blockLines
    }).join('\n')

    const workoutDetailHtml = sortedBlocks.map(block => {
      const sortedExercises = [...(block.block_exercises || [])].sort(
        (a, b) => a.position - b.position
      )
      const exercisesHtml = sortedExercises.map(exercise => {
        const exerciseName = exercise.exercise?.name || 'Ejercicio'
        const exerciseNote = exerciseNoteByBlockExerciseId.get(exercise.id)
        const prescribedSets = [...(exercise.prescribed_sets || [])]
          .filter(set => set.week_number === log.week_number)
          .sort((a, b) => a.set_number - b.set_number)
        const rowsHtml = prescribedSets.map(set => {
          const loggedSet = loggedSetByKey.get(`${exercise.id}:${set.set_number}`)
          return `
            <tr>
              <td style="border-top: 1px solid #e5e7eb; padding: 8px; color: #4b5563;">${set.set_number}</td>
              <td style="border-top: 1px solid #e5e7eb; padding: 8px; color: #4b5563;">${escapeHtml(formatPrescribed(set))}</td>
              <td style="border-top: 1px solid #e5e7eb; padding: 8px; color: #111827; font-weight: 600;">${escapeHtml(formatActual(loggedSet, set.set_type))}</td>
            </tr>
          `
        }).join('')

        return `
          <div style="padding: 12px 0; border-top: 1px solid #f3f4f6;">
            <h3 style="font-size: 15px; margin: 0 0 6px; color: #111827;">
              ${escapeHtml(`${block.block_letter}${exercise.position} · ${exerciseName}`)}
            </h3>
            ${
              exercise.note?.trim()
                ? `<p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;"><strong>Nota prescripta:</strong> ${escapeHtml(exercise.note.trim())}</p>`
                : ''
            }
            ${
              exerciseNote
                ? `<p style="margin: 0 0 8px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px; color: #1d4ed8; font-size: 13px;"><strong>Comentario del alumno:</strong> ${escapeHtml(exerciseNote)}</p>`
                : ''
            }
            <table style="border-collapse: collapse; width: 100%; font-size: 13px;">
              <thead>
                <tr>
                  <th align="left" style="padding: 6px 8px; color: #6b7280; font-weight: 600;">Serie</th>
                  <th align="left" style="padding: 6px 8px; color: #6b7280; font-weight: 600;">Prescrito</th>
                  <th align="left" style="padding: 6px 8px; color: #6b7280; font-weight: 600;">Registrado</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `
      }).join('')

      return `
        <section style="margin-top: 18px;">
          <h2 style="font-size: 16px; margin: 0; padding: 8px 10px; background: #f3f4f6; color: #111827;">
            Bloque ${escapeHtml(block.block_letter)}
          </h2>
          ${exercisesHtml}
        </section>
      `
    }).join('')

    const subject = `💪 ${studentName} completó un entrenamiento`
    const completedAt = formatDate(log.completed_at)
    const exerciseNotesText = notesWithExerciseNames
      .map(note => `- ${note.exerciseName}: "${note.note}"`)
      .join('\n')
    const text = [
      `${studentName} acaba de completar ${dayLabel} — Semana ${log.week_number} de ${routineName}.`,
      '',
      `Fecha: ${completedAt}`,
      trimmedStudentNote ? `\n📝 Nota del entrenamiento:\n"${trimmedStudentNote}"` : '',
      exerciseNotesText ? `\n💬 Notas por ejercicio:\n${exerciseNotesText}` : '',
      workoutDetailText ? `\n📋 Detalle del entrenamiento:\n${workoutDetailText}` : '',
      '',
      `→ Ver detalle completo: ${detailUrl}`,
    ]
      .filter(Boolean)
      .join('\n')

    const exerciseNotesHtml = notesWithExerciseNames
      .map(note => `<li><strong>${escapeHtml(note.exerciseName)}:</strong> "${escapeHtml(note.note)}"</li>`)
      .join('')

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <p>
          <strong>${escapeHtml(studentName)}</strong> acaba de completar
          <strong>${escapeHtml(dayLabel)}</strong> — Semana ${log.week_number}
          de <strong>${escapeHtml(routineName)}</strong>.
        </p>
        <p><strong>Fecha:</strong> ${escapeHtml(completedAt)}</p>
        ${
          trimmedStudentNote
            ? `<h2 style="font-size: 16px; margin: 24px 0 8px;">📝 Nota del entrenamiento</h2>
               <blockquote style="border-left: 4px solid #e5e7eb; margin: 0; padding-left: 12px;">"${escapeHtml(trimmedStudentNote)}"</blockquote>`
            : ''
        }
        ${
          exerciseNotesHtml
            ? `<h2 style="font-size: 16px; margin: 24px 0 8px;">💬 Notas por ejercicio</h2>
               <ul>${exerciseNotesHtml}</ul>`
            : ''
        }
        ${
          workoutDetailHtml
            ? `<h2 style="font-size: 16px; margin: 24px 0 8px;">📋 Detalle del entrenamiento</h2>
               ${workoutDetailHtml}`
            : ''
        }
        <p style="margin-top: 24px;">
          <a href="${escapeHtml(detailUrl)}" style="color: #2563eb;">Ver detalle completo</a>
        </p>
      </div>
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'XIM App <onboarding@resend.dev>',
        to: trainerEmail,
        subject,
        text,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Resend workout notification failed', {
        status: resendResponse.status,
        body: resendError,
      })
      return jsonResponse({ error: 'Could not send notification email' }, 502)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('Unexpected workout notification error', err)
    return jsonResponse({ error: 'Unexpected error' }, 500)
  }
})
