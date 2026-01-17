import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

export function Header() {
  const { user, profile, signOut, isAdmin } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              XIM
            </Link>

            {user && (
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Ejercicios
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Administración
                  </Link>
                )}
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-gray-600">{profile?.email}</span>
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${isAdmin
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {profile?.role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Cerrar sesión
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
