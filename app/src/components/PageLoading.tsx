import { Loader2 } from 'lucide-react'

export default function PageLoading() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex items-center gap-2 text-[#6B7280]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-[14px]">Loading page...</span>
      </div>
    </div>
  )
}
