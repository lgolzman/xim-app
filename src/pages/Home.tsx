import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StudentHome } from './StudentHome'

export function Home() {
  const { isAdmin } = useAuth()

  // Admin entra directo al listado de alumnos, alumnos ven "¿Qué entreno hoy?"
  if (isAdmin) {
    return <Navigate to="/admin/students" replace />
  }

  return <StudentHome />
}
