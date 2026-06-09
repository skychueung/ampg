import { useLocation, useNavigate } from 'react-router-dom'
import {
  Dna, Beaker, ClipboardList, Server, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/LanguageContext'

export default function Sidebar({ mode = 'server', onModeChange }: { mode?: 'local' | 'server'; onModeChange?: (mode: 'local' | 'server') => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const navItems = [
    { label: 'AMPGen Server-Only', icon: Server, path: '/server-mode' },
    { label: t('nav.ampGeneration'), icon: Dna, path: '/generation' },
    { label: t('nav.taskCenter'), icon: ClipboardList, path: '/task-center' },
    { label: t('nav.candidateLibrary'), icon: Beaker, path: '/candidate-library' },
    { label: t('nav.reports'), icon: FileText, path: '/reports' },
  ]

  const isActive = (path: string) => {
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
        <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[6px] p-2">
          <button
            onClick={() => onModeChange?.('server')}
            className={cn(
              'w-full text-[12px] font-semibold py-1.5 rounded-[4px] transition-colors duration-150',
              mode === 'server' ? 'bg-[#14B8A6] text-white' : 'text-[#0F766E]'
            )}
          >
            SERVER_PRODUCTION
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-[#0F766E]">
            服务器生成专用版
          </p>
        </div>
      </div>
    </aside>
  )
}
