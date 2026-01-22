import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { ChangePasswordModal } from '../auth/ChangePasswordModal'

export function Header() {
  const { user, profile, signOut, isAdmin } = useAuth()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menú"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

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
              <Button variant="ghost" size="sm" onClick={() => setIsPasswordModalOpen(true)}>
                Cambiar clave
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Cerrar sesión
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ejercicios
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium px-2 py-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Administración
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  )
}
