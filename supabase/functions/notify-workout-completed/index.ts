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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value))

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
      { data: exerciseNotes, error: notesError },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, name')
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
    ])

    if (studentError || routineError || routineDayError || notesError) {
      console.error('Could not load workout notification details', {
        studentError,
        routineError,
        routineDayError,
        notesError,
      })
      return jsonResponse({ error: 'Could not load workout details' }, 500)
    }

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
    const detailUrl = `${normalizeBaseUrl(appUrl)}/admin/students/${log.student_id}/workouts/${log.id}`
    const trimmedStudentNote = log.student_note?.trim()
    const notesWithExerciseNames = (exerciseNotes || [])
      .map(note => ({
        exerciseName: exerciseNameByBlockExerciseId.get(note.block_exercise_id) || 'Ejercicio',
        note: note.note.trim(),
      }))
      .filter(note => note.note.length > 0)

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
