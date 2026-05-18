import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { MovementPatternManager } from '../components/admin/MovementPatternManager'
import { MuscleManager } from '../components/admin/MuscleManager'
import { InvitationManager } from '../components/admin/InvitationManager'

type Tab = 'patterns' | 'muscles' | 'invitations'

export function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('patterns')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'patterns', label: 'Patrones de Movimiento' },
    { id: 'muscles', label: 'Músculos' },
    { id: 'invitations', label: 'Invitaciones' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-600">Gestiona los datos maestros de la aplicación</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-6 py-3 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'patterns' && <MovementPatternManager />}
            {activeTab === 'muscles' && <MuscleManager />}
            {activeTab === 'invitations' && <InvitationManager />}
          </div>
        </div>
      </div>
    </Layout>
  )
}
