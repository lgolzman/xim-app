import { useAuth } from '../context/AuthContext'
import { Exercises } from './Exercises'
import { StudentHome } from './StudentHome'

export function Home() {
  const { isAdmin } = useAuth()

  // Admin ve la biblioteca de ejercicios, alumnos ven "¿Qué entreno hoy?"
  if (isAdmin) {
    return <Exercises />
  }

  return <StudentHome />
}
