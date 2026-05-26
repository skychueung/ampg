import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider, useTranslation } from './i18n/LanguageContext'
import Layout from './components/Layout'
import PageLoading from './components/PageLoading'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Generation = lazy(() => import('./pages/Generation'))
const AmpFilter = lazy(() => import('./pages/AmpFilter'))
const CandidateLibrary = lazy(() => import('./pages/CandidateLibrary'))
const PeptideDetail = lazy(() => import('./pages/PeptideDetail'))
const TaskCenter = lazy(() => import('./pages/TaskCenter'))
const ServerMode = lazy(() => import('./pages/ServerMode'))
const Admin = lazy(() => import('./pages/Admin'))
const ReportExport = lazy(() => import('./pages/ReportExport'))
const AMPGenWorkflow = lazy(() => import('./pages/AMPGenWorkflowPage'))
const GenerationRunDetail = lazy(() => import('./pages/GenerationRunDetailPage'))

function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  let title = 'AMPGen Agent Platform'
  if (pathname.startsWith('/server-mode')) title = t('server.title')
  else if (pathname.startsWith('/admin')) title = t('admin.title')
  else if (pathname.startsWith('/dashboard')) title = t('dashboard.title')
  else if (pathname.startsWith('/generation')) title = t('generation.title')
  else if (pathname.startsWith('/amp-filter')) title = t('filter.title')
  else if (pathname.startsWith('/candidate-library')) title = t('library.title')
  else if (pathname.startsWith('/peptide/')) title = t('detail.physicochemicalTitle')
  else if (pathname.startsWith('/task-center')) title = t('tasks.title')
  else if (pathname.startsWith('/reports')) title = t('reports.title')
  else if (pathname.startsWith('/ampgen-workflow')) title = 'AMPGen Workflow'
  else if (pathname.startsWith('/generation-runs/')) title = 'Generation Run Detail'

  return <Layout title={title}>{children}</Layout>
}

export default function App() {
  return (
    <LanguageProvider>
      <PageTitleProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generation" element={<Generation />} />
            <Route path="/amp-filter" element={<AmpFilter />} />
            <Route path="/candidate-library" element={<CandidateLibrary />} />
            <Route path="/peptide/:id" element={<PeptideDetail />} />
            <Route path="/task-center" element={<TaskCenter />} />
            <Route path="/server-mode" element={<ServerMode />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reports" element={<ReportExport />} />
            <Route path="/ampgen-workflow" element={<AMPGenWorkflow />} />
            <Route path="/generation-runs/:runId" element={<GenerationRunDetail />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </PageTitleProvider>
    </LanguageProvider>
  )
}
