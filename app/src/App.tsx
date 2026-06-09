import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider, useTranslation } from './i18n/LanguageContext'
import Layout from './components/Layout'
import PageLoading from './components/PageLoading'

const Generation = lazy(() => import('./pages/Generation'))
const CandidateLibrary = lazy(() => import('./pages/CandidateLibrary'))
const PeptideDetail = lazy(() => import('./pages/PeptideDetail'))
const TaskCenter = lazy(() => import('./pages/TaskCenter'))
const ServerMode = lazy(() => import('./pages/ServerMode'))
const ReportExport = lazy(() => import('./pages/ReportExport'))
const GenerationRunDetail = lazy(() => import('./pages/GenerationRunDetailPage'))
const ServerBatchPage = lazy(() => import('./pages/ServerBatchPage'))

function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  let title = 'AMPGen Agent Platform'
  if (pathname.startsWith('/server-mode')) title = 'AMPGen Server-Only'
  else if (pathname.startsWith('/generation')) title = t('generation.title')
  else if (pathname.startsWith('/candidate-library')) title = t('library.title')
  else if (pathname.startsWith('/peptide/')) title = t('detail.physicochemicalTitle')
  else if (pathname.startsWith('/task-center')) title = t('tasks.title')
  else if (pathname.startsWith('/reports')) title = t('reports.title')
  else if (pathname.startsWith('/generation-runs/')) title = 'Generation Run Detail'

  return <Layout title={title}>{children}</Layout>
}

export default function App() {
  return (
    <LanguageProvider>
      <PageTitleProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/dashboard" element={<Navigate to="/server-mode" replace />} />
            <Route path="/generation" element={<Generation />} />
            <Route path="/amp-filter" element={<Navigate to="/server-mode" replace />} />
            <Route path="/candidate-library" element={<CandidateLibrary />} />
            <Route path="/peptide/:id" element={<PeptideDetail />} />
            <Route path="/task-center" element={<TaskCenter />} />
            <Route path="/server-mode" element={<ServerMode />} />
            <Route path="/admin" element={<Navigate to="/server-mode" replace />} />
            <Route path="/reports" element={<ReportExport />} />
            <Route path="/ampgen-workflow" element={<Navigate to="/server-mode" replace />} />
            <Route path="/generation-runs/:runId" element={<GenerationRunDetail />} />
            <Route path="/peptide-analytics" element={<Navigate to="/server-mode" replace />} />
            <Route path="/run-comparison" element={<Navigate to="/server-mode" replace />} />
            <Route path="/sequence-explorer" element={<Navigate to="/server-mode" replace />} />
            <Route path="/candidate-review" element={<Navigate to="/server-mode" replace />} />
            <Route path="/maintenance" element={<Navigate to="/server-mode" replace />} />
            <Route path="/server-batches" element={<ServerBatchPage />} />
            <Route path="/" element={<Navigate to="/server-mode" replace />} />
          </Routes>
        </Suspense>
      </PageTitleProvider>
    </LanguageProvider>
  )
}
