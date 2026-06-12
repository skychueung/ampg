import { AlertTriangle } from 'lucide-react'
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
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-800 mb-1">
              Scientific Boundary
            </p>
            <p className="text-[12px] text-amber-700 leading-relaxed">
              <strong>{t('common.disclaimer')}</strong> — {t('common.disclaimerFull')}
            </p>
            <p className="text-[12px] text-amber-600 mt-1">
              「科学边界」— 所有分数、预测和指标均为计算预测，需独立实验验证。
            </p>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
