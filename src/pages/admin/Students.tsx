import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { StudentManager } from '../../components/admin/StudentManager'
import { StudentActivityReport } from '../../components/admin/StudentActivityReport'
import { UpcomingIncreasesReport } from '../../components/admin/UpcomingIncreasesReport'

type Tab = 'students' | 'reports'
type ReportTab = 'activity' | 'increases'

export function Students() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'reports' ? 'reports' : 'students'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const initialReport = searchParams.get('report') === 'increases' ? 'increases' : 'activity'
  const [activeReport, setActiveReport] = useState<ReportTab>(initialReport)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students', label: 'Alumnos' },
    { id: 'reports', label: 'Reportes' },
  ]
  const reportTabs: { id: ReportTab; label: string }[] = [
    { id: 'activity', label: 'Actividad de entrenamientos' },
    { id: 'increases', label: 'Aumentos próximos' },
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
                    setSearchParams(tab.id === 'reports'
                      ? { tab: 'reports', report: activeReport }
                      : {})
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
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {reportTabs.map(report => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => {
                          setActiveReport(report.id)
                          setSearchParams({ tab: 'reports', report: report.id })
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${
                          activeReport === report.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {report.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeReport === 'activity' && <StudentActivityReport />}
                {activeReport === 'increases' && <UpcomingIncreasesReport />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
