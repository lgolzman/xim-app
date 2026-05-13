import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function AccountDisabled() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Cuenta inhabilitada
          </h1>

          <p className="text-gray-600 mb-6">
            Tu cuenta ha sido inhabilitada temporalmente. Si creés que esto es un error o necesitás más información, por favor contactá a tu entrenadora.
          </p>

          <Link to="/login">
            <Button variant="secondary" className="w-full">
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
