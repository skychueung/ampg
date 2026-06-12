import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Server, Layers, ClipboardCheck, Shield, ArrowRight, Dna } from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
}

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const capabilities = [
    {
      icon: Server,
      title: 'Server Production',
      desc: 'GPU-backed batch generation and large-scale candidate scoring in server production mode.',
    },
    {
      icon: Layers,
      title: 'Batch Queue',
      desc: 'Chunked production runs supporting up to 100,000 candidates with automatic queue management.',
    },
    {
      icon: ClipboardCheck,
      title: 'Candidate Review',
      desc: 'Computational shortlist and ranking interface for predicted antimicrobial peptide candidates.',
    },
    {
      icon: Shield,
      title: 'Scientific Boundary',
      desc: 'All outputs are computational predictions and require independent experimental validation.',
    },
  ]

  const quickEntries = [
    { label: t('nav.dashboard') as string, path: '/dashboard', desc: 'Overview & generation entry' },
    { label: t('nav.ampGeneration') as string, path: '/generation', desc: 'Start a new peptide generation run' },
    { label: 'Server Batches', path: '/server-batches', desc: 'Manage production batch queues' },
  ]

  return (
    <div className="space-y-10 pb-8">
      {/* Hero */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="hero-gradient rounded-2xl border border-sky-100 p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Dna size={220} className="text-teal-600" />
        </div>

        <motion.div variants={fadeInUp} className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-sky-200 text-[12px] font-semibold text-sky-700 shadow-sm mb-5">
            <Dna size={14} />
            Xianghu Laboratory · 湘湖实验室
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-3">
            AMPGen Server-Only Platform
          </h1>
          <p className="text-[16px] md:text-[18px] text-slate-600 max-w-2xl leading-relaxed">
            AI-guided antimicrobial peptide generation and computational screening platform
          </p>
        </motion.div>

        <motion.div variants={fadeInUp} className="relative z-10 mt-6 max-w-3xl">
          <p className="text-[14px] text-slate-500 leading-relaxed">
            Built for production-scale computational candidate generation. All scores are computational
            predictions and require independent experimental validation.
          </p>
        </motion.div>

        <motion.div variants={fadeInUp} className="relative z-10 mt-8 flex flex-wrap gap-3">
          {quickEntries.map((entry) => (
            <button
              key={entry.path}
              onClick={() => navigate(entry.path)}
              className="group flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm card-hover text-left"
            >
              <div>
                <p className="text-[14px] font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                  {entry.label}
                </p>
                <p className="text-[12px] text-slate-500">{entry.desc}</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </motion.div>
      </motion.section>

      {/* Capability Cards */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {capabilities.map((cap) => {
          const Icon = cap.icon
          return (
            <motion.div
              key={cap.title}
              variants={fadeInUp}
              className="bg-white border border-slate-200 rounded-xl p-5 card-hover"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 flex items-center justify-center mb-4">
                <Icon size={20} className="text-teal-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 mb-1">{cap.title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">{cap.desc}</p>
            </motion.div>
          )
        })}
      </motion.section>

      {/* Footer Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
      >
        <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-amber-800">
            {t('common.disclaimer') as string}
          </p>
          <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
            {t('common.disclaimerFull') as string}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
