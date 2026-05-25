import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LanguageProvider, useTranslation } from './i18n/LanguageContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Generation from './pages/Generation'
import AmpFilter from './pages/AmpFilter'
import CandidateLibrary from './pages/CandidateLibrary'
import PeptideDetail from './pages/PeptideDetail'
import TaskCenter from './pages/TaskCenter'
import ServerMode from './pages/ServerMode'
import Admin from './pages/Admin'
import ReportExport from './pages/ReportExport'

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

  return <Layout title={title}>{children}</Layout>
}

export default function App() {
  return (
    <LanguageProvider>
      <PageTitleProvider>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageTitleProvider>
    </LanguageProvider>
  )
}
