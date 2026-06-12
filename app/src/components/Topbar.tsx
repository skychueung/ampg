import { Bell, Languages, ShieldAlert } from 'lucide-react'
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
    <header className="h-[64px] bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 fixed top-0 left-[224px] right-0 z-40">
      {/* Left: Page Title + Breadcrumb */}
      <div className="flex flex-col justify-center">
        <h1 className="text-[18px] font-bold text-slate-800">{title}</h1>
        {subtitle && (
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <span>AMPGen</span>
            <span className="text-slate-300">/</span>
            <span>{subtitle}</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
          <span className="status-dot" />
          System Online
        </div>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors border border-slate-200"
          title={language === 'en' ? t('language.switchToZh') : t('language.switchToEn')}
        >
          <Languages size={14} />
          <span>{language === 'en' ? 'EN' : 'ZH'}</span>
        </button>

        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-medium text-amber-700">
          <ShieldAlert size={13} />
          {t('common.disclaimer')}
        </span>

        <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-sm">
          <span className="text-[12px] font-semibold text-white">U</span>
        </div>
      </div>
    </header>
  )
}
