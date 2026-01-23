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
              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menú"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3">
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className="px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ejercicios
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Administración
                </Link>
              )}
            </nav>
            <div className="sm:hidden mt-3 pt-3 border-t border-gray-200 px-3">
              <span className="text-sm text-gray-600">{profile?.email}</span>
              <span
                className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs font-medium
                  ${isAdmin
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {profile?.role}
              </span>
            </div>
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
