import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED'

interface StatusBadgeProps {
  status: TaskStatus
  showIcon?: boolean
}

const statusConfig: Record<TaskStatus, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  icon: React.ElementType | null
}> = {
  PENDING: {
    label: 'Pending',
    bgColor: 'bg-gray-50',
    textColor: 'text-[#6B7280]',
    borderColor: 'border-[#6B7280]',
    icon: Clock,
  },
  RUNNING: {
    label: 'Running',
    bgColor: 'bg-amber-50',
    textColor: 'text-[#D97706]',
    borderColor: 'border-[#F59E0B]',
    icon: Loader2,
  },
  SUCCEEDED: {
    label: 'Succeeded',
    bgColor: 'bg-emerald-50',
    textColor: 'text-[#059669]',
    borderColor: 'border-[#10B981]',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Failed',
    bgColor: 'bg-red-50',
    textColor: 'text-[#DC2626]',
    borderColor: 'border-[#EF4444]',
    icon: XCircle,
  },
  BLOCKED: {
    label: 'Blocked',
    bgColor: 'bg-gray-50',
    textColor: 'text-[#6B7280]',
    borderColor: 'border-[#6B7280]',
    icon: Clock,
  },
}

export default function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        status === 'RUNNING' && 'animate-pulse-amber'
      )}
    >
      {showIcon && Icon && (
        <Icon size={12} className={status === 'RUNNING' ? 'animate-spin' : ''} />
      )}
      {config.label}
    </span>
  )
}
