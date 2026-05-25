import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  value: number
  label: string
  color?: 'teal' | 'green' | 'amber'
  delay?: number
}

export default function StatCard({ icon, value, label, color = 'teal', delay = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 800
    const startTime = performance.now()
    const timer = setTimeout(() => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime - delay
        if (elapsed < 0) {
          requestAnimationFrame(animate)
          return
        }
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.round(eased * value))
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  const colorClasses = {
    teal: {
      bg: 'bg-[#F0FDFA]',
      text: 'text-[#14B8A6]',
    },
    green: {
      bg: 'bg-emerald-50',
      text: 'text-[#10B981]',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-[#F59E0B]',
    },
  }

  const c = colorClasses[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000, ease: 'easeOut' }}
      className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-4 hover:border-[#14B8A6] transition-colors duration-200"
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-[6px] flex items-center justify-center', c.bg)}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <div className="text-[28px] font-bold text-[#111827] leading-tight">
            {displayValue.toLocaleString()}
          </div>
          <div className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mt-0.5">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
