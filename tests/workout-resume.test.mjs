import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function setup() {
  const storage = new Map()
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  const load = (file, modules, globals = {}) => {
    const exports = {}
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    vm.runInNewContext(code, { exports, require: name => modules[name], localStorage, ...globals })
    return exports
  }
  const persistence = load('src/lib/workoutResume.ts', {})
  let path = '/'
  const navigations = []
  const refs = []
  let refIndex = 0
  let initializedFor = null
  let effect
  const auth = { loading: false, user: { id: 'student-a' }, profile: { role: 'consulta' }, isDisabled: false }
  const component = load('src/components/routines/WorkoutResume.tsx', {
    react: {
      useRef: initial => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
      useState: () => [initializedFor, value => { initializedFor = value }],
      useEffect: callback => { effect = callback },
    },
    'react/jsx-runtime': { jsx: () => null, Fragment: 'fragment' },
    'react-router-dom': {
      useLocation: () => { const url = new URL(path, 'https://xim.test'); return { pathname: url.pathname, search: url.search } },
      useNavigate: () => (target, options) => navigations.push({ target, options }),
    },
    '../../context/AuthContext': { useAuth: () => auth },
    '../../lib/workoutResume': persistence,
  })
  const render = nextPath => { path = nextPath; refIndex = 0; component.WorkoutResume({ children: null }); effect() }
  return { persistence, auth, navigations, render, storage, load }
}
const pending = { path: '/workout/day-a?week=2', routineId: 'routine-a', sequenceAnchorLogId: 'log-a', scrollY: 680 }

test('reapertura desde inicio recupera día y semana del usuario autenticado', () => {
  const h = setup()
  h.persistence.writeOpenWorkout('student-a', pending)
  h.render('/')
  assert.equal(h.navigations[0].target, pending.path)
  assert.equal(h.navigations[0].options.replace, true)
})

test('navegar voluntariamente al inicio borra la referencia y no vuelve al entrenamiento', () => {
  const h = setup()
  h.persistence.writeOpenWorkout('student-a', pending)
  h.render(pending.path)
  h.render('/')
  h.render('/')
  assert.equal(h.persistence.readOpenWorkout('student-a'), null)
  assert.equal(h.navigations.length, 0)
})

test('no restaura antes de autenticar ni reemplaza un enlace a otra pantalla', () => {
  const h = setup()
  h.persistence.writeOpenWorkout('student-a', pending)
  h.auth.loading = true
  h.render('/')
  assert.equal(h.navigations.length, 0)
  h.auth.loading = false
  h.render('/history')
  assert.equal(h.navigations.length, 0)
})

test('la referencia de otro usuario no se restaura; completarla impide restauraciones futuras', () => {
  const h = setup()
  h.persistence.writeOpenWorkout('student-b', pending)
  h.render('/')
  assert.equal(h.navigations.length, 0)
  h.persistence.writeOpenWorkout('student-a', pending)
  h.persistence.clearOpenWorkout('student-a')
  assert.equal(h.persistence.readOpenWorkout('student-a'), null)
  assert.equal(h.persistence.readOpenWorkout('student-b').path, pending.path)
})

test('datos corruptos y URLs externas no provocan redirecciones', () => {
  const h = setup()
  h.storage.set('xim_open_workout_v1_student-a', '{broken')
  assert.equal(h.persistence.readOpenWorkout('student-a'), null)
  h.persistence.writeOpenWorkout('student-a', { ...pending, path: 'https://external.test' })
  h.render('/')
  assert.equal(h.navigations.length, 0)
})

test('el scroll se restaura al estar listo y no recrea la referencia tras completar', () => {
  const h = setup()
  h.persistence.writeOpenWorkout('student-a', pending)
  const listeners = new Map()
  let frame
  const window = {
    scrollY: 0,
    scrollTo: ({ top }) => { window.scrollY = top },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
  }
  const hook = h.load('src/hooks/useWorkoutResume.ts', {
    react: { useEffect: effect => effect() },
    'react-router-dom': {
      useLocation: () => ({ pathname: '/workout/day-a', search: '?week=2' }),
      useNavigate: () => target => h.navigations.push({ target }),
    },
    '../lib/workoutResume': h.persistence,
  }, {
    window,
    document: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: callback => { frame = callback; return 1 },
    cancelAnimationFrame() {},
  })
  hook.useWorkoutResume('student-a', 'routine-a', 'log-a', false)
  assert.equal(frame, undefined)
  hook.useWorkoutResume('student-a', 'routine-a', 'log-a', true)
  frame()
  assert.equal(window.scrollY, 680)
  window.scrollY = 920
  listeners.get('scroll')()
  assert.equal(h.persistence.readOpenWorkout('student-a').scrollY, 920)
  h.persistence.clearOpenWorkout('student-a')
  listeners.get('pagehide')()
  assert.equal(h.persistence.readOpenWorkout('student-a'), null)
})
