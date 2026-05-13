import { Layout } from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'

export function Profile() {
  const { profile } = useAuth()

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-gray-600">Tu información personal la administra tu entrenadora.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <p className="text-gray-900">{profile?.full_name || profile?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{profile?.email}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
