import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { AccountDisabled } from './pages/AccountDisabled'
import { Home } from './pages/Home'
import { Profile } from './pages/Profile'
import { Exercises } from './pages/Exercises'
import { WorkoutExecution } from './pages/WorkoutExecution'
import { WorkoutHistory } from './pages/WorkoutHistory'
import { WorkoutDetail } from './pages/WorkoutDetail'
import { RoutineOverview } from './pages/RoutineOverview'
import { Admin } from './pages/Admin'
import { StudentDetail } from './pages/admin/StudentDetail'
import { AdminWorkoutDetail } from './pages/admin/AdminWorkoutDetail'
import { RoutineNew } from './pages/admin/RoutineNew'
import { RoutineEdit } from './pages/admin/RoutineEdit'
import { RoutineOverviewAdmin } from './pages/admin/RoutineOverviewAdmin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account-disabled" element={<AccountDisabled />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <Exercises />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workout/:dayId"
            element={
              <ProtectedRoute>
                <WorkoutExecution />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <WorkoutHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history/:logId"
            element={
              <ProtectedRoute>
                <WorkoutDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/routine"
            element={
              <ProtectedRoute>
                <RoutineOverview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students/:studentId"
            element={
              <ProtectedRoute requireAdmin>
                <StudentDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students/:studentId/workouts/:logId"
            element={
              <ProtectedRoute requireAdmin>
                <AdminWorkoutDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/routines/new"
            element={
              <ProtectedRoute requireAdmin>
                <RoutineNew />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/routines/:routineId/edit"
            element={
              <ProtectedRoute requireAdmin>
                <RoutineEdit />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/routines/:routineId/view"
            element={
              <ProtectedRoute requireAdmin>
                <RoutineOverviewAdmin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
