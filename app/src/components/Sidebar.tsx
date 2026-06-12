import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Dna, FlaskConical, Beaker,
  ClipboardList, Server, FileText, Shield, Workflow, Wrench,
  BarChart3, GitCompare, Dna as DnaIcon, ClipboardCheck,
  Layers, Home, Atom,
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
    <aside className="fixed left-0 top-0 h-full w-[224px] bg-white border-r border-slate-200 flex flex-col z-50">
      {/* Branded Header */}
      <div className="h-[72px] px-4 border-b border-slate-100 flex flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-sm">
            <Atom size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[16px] font-bold text-slate-800 tracking-tight">AMPGen</span>
              <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">Server-Only</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Xianghu Laboratory · 湘湖实验室</p>
          </div>
        </div>
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
                'group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-all duration-150',
                'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                active && 'bg-teal-50/80 text-teal-700 border-l-[3px] border-l-teal-500'
              )}
              style={active ? { paddingLeft: '9px' } : { paddingLeft: '12px' }}
            >
              <Icon size={16} className={cn('transition-colors', active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600')} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="bg-gradient-to-br from-teal-50 to-sky-50 border border-teal-200 rounded-lg p-3 text-center">
          <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">SERVER_PRODUCTION</p>
          <p className="text-[10px] text-slate-500 mt-1">服务器生成专用版</p>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className="status-dot" />
            <span className="text-[10px] text-teal-700 font-medium">System Online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
