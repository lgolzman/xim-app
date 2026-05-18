import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { StudentManager } from '../../components/admin/StudentManager'
import { StudentActivityReport } from '../../components/admin/StudentActivityReport'

type Tab = 'students' | 'reports'

export function Students() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'reports' ? 'reports' : 'students'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students', label: 'Alumnos' },
    { id: 'reports', label: 'Reportes' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
          <p className="text-gray-600">Gestiona alumnos y actividad reciente</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSearchParams(tab.id === 'reports' ? { tab: 'reports' } : {})
                  }}
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
            {activeTab === 'students' && <StudentManager />}
            {activeTab === 'reports' && <StudentActivityReport />}
          </div>
        </div>
      </div>
    </Layout>
  )
}
