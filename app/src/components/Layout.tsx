import { useTranslation } from '@/i18n/LanguageContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface LayoutProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function Layout({ title, subtitle, children }: LayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5]">
      <Sidebar />
      <Topbar title={title} subtitle={subtitle} />
      <main className="ml-[224px] mt-[64px] p-6 min-h-[calc(100dvh-64px)]">
        <div className="mb-6 p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FCD34D] flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#92400E]">
              <strong>{t('common.disclaimer')}</strong> - {t('common.disclaimerFull')}
            </p>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
