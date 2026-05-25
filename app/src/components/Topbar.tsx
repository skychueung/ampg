import { Bell, Languages } from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

interface TopbarProps {
  title: string
  subtitle?: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { language, setLanguage, t } = useTranslation()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en')
  }

  return (
    <header className="h-[64px] bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between px-6 fixed top-0 left-[224px] right-0 z-40">
      <div className="flex items-center gap-2">
        <h1 className="text-[20px] font-semibold text-[#111827]">{title}</h1>
        {subtitle && (
          <>
            <span className="text-[#9CA3AF] mx-1">/</span>
            <span className="text-[14px] text-[#6B7280]">{subtitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors border border-[#E5E7EB]"
          title={language === 'en' ? t('language.switchToZh') : t('language.switchToEn')}
        >
          <Languages size={14} />
          <span>{language === 'en' ? 'EN' : 'ZH'}</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FCD34D] text-[12px] font-medium text-[#D97706]">
          {t('common.disclaimer')}
        </span>

        <button className="p-2 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#F0FDFA] border border-[#14B8A6] flex items-center justify-center">
          <span className="text-[12px] font-semibold text-[#14B8A6]">U</span>
        </div>
      </div>
    </header>
  )
}
