import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Dna, FlaskConical, Beaker,
  ClipboardList, Server, FileText, Shield, Workflow, Wrench,
  BarChart3, GitCompare, Dna as DnaIcon, ClipboardCheck,
  Layers, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/LanguageContext'
import { IS_SERVER_ONLY } from '@/lib/serverOnly'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const allNavItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { label: t('nav.ampGeneration'), icon: Dna, path: '/generation' },
    { label: t('nav.ampFilter'), icon: FlaskConical, path: '/amp-filter' },
    { label: t('nav.candidateLibrary'), icon: Beaker, path: '/candidate-library' },
    { label: t('nav.taskCenter'), icon: ClipboardList, path: '/task-center' },
    { label: 'AMPGen Workflow', icon: Workflow, path: '/ampgen-workflow' },
    { label: 'Peptide Analytics', icon: BarChart3, path: '/peptide-analytics' },
    { label: 'Run Comparison', icon: GitCompare, path: '/run-comparison' },
    { label: 'Sequence Explorer', icon: DnaIcon, path: '/sequence-explorer' },
    { label: 'Candidate Review', icon: ClipboardCheck, path: '/candidate-review' },
    { label: 'Local Maintenance', icon: Wrench, path: '/maintenance', hidden: IS_SERVER_ONLY },
    { label: 'Server Batches', icon: Layers, path: '/server-batches' },
    { label: t('nav.serverProduction'), icon: Server, path: '/server-mode' },
    { label: t('nav.reports'), icon: FileText, path: '/reports' },
    { label: t('nav.admin'), icon: Shield, path: '/admin' },
  ]

  const navItems = allNavItems.filter((item) => !item.hidden)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[224px] bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col z-50">
      <div className="h-[64px] flex items-center px-4 border-b border-[#E5E7EB]">
        <span className="text-[14px] font-bold text-[#111827] leading-tight">{t('common.platformName')}</span>
        <span className="ml-1.5 w-2 h-2 rounded-full bg-[#14B8A6] inline-block flex-shrink-0" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] font-medium transition-colors duration-150',
                'text-[#6B7280] hover:bg-[#F3F4F6]',
                active && 'bg-[#F0FDFA] text-[#14B8A6] border-l-[3px] border-l-[#14B8A6]'
              )}
              style={active ? { paddingLeft: '9px' } : { paddingLeft: '12px' }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[#E5E7EB]">
        <div className="bg-[#F0FDFA] border border-[#14B8A6] rounded-[6px] p-2 text-center">
          <p className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-wider">SERVER_PRODUCTION</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">服务器生成专用版</p>
        </div>
      </div>
    </aside>
  )
}
