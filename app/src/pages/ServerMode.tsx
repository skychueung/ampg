import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  Server,
  Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const trackingFields = [
  'run_id',
  'task_id / job_id',
  'mode',
  'status',
  'created_at',
  'updated_at',
  'elapsed time',
  'log path',
  'output path',
  'error message',
  'peptide count',
  'amp_score completeness',
  'mic_saureus completeness',
  'mic_ecoli completeness',
  'toxicity_risk null / 未接入',
  'hemolysis_risk null / 未接入',
]

const disabledModes = ['LOCAL_DEMO', 'LOCAL_REAL_SMOKE', 'demo', 'mock', 'local smoke']

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
}

export default function ServerMode() {
  return (
    <div className="space-y-5">
      <motion.div {...fadeUp} className="border-b border-[#E5E7EB] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#F0FDFA]">
            <Server size={22} className="text-[#0F766E]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">AMPGen Server-Only</h1>
            <p className="mt-0.5 text-[14px] text-[#4B5563]">服务器生成专用版</p>
          </div>
        </div>
        <p className="mt-4 max-w-[920px] text-[14px] leading-6 text-[#374151]">
          本服务器版仅用于服务器真实生成与任务追踪，不提供本地演示模式。
        </p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-[8px] border border-[#D1FAE5] bg-[#F0FDF4] p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#166534]">
              <CheckCircle2 size={16} />
              SERVER_PRODUCTION only
            </div>
            <p className="mt-2 text-[13px] leading-5 text-[#166534]">
              前端提交和后端接口均限制为 SERVER_PRODUCTION。
            </p>
          </section>
          <section className="rounded-[8px] border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#1D4ED8]">
              <Activity size={16} />
              New ports
            </div>
            <p className="mt-2 font-mono text-[13px] leading-5 text-[#1E40AF]">
              frontend 18700<br />
              backend 18701
            </p>
          </section>
          <section className="rounded-[8px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#92400E]">
              <Shield size={16} />
              Scientific boundary
            </div>
            <p className="mt-2 text-[13px] leading-5 text-[#92400E]">
              toxicity / hemolysis 未接入前保持 null；所有候选仍为 computational ranking。
            </p>
          </section>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="rounded-[8px] border border-[#E5E7EB] bg-white p-5"
        >
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#111827]">
            <ClipboardList size={17} className="text-[#14B8A6]" />
            服务器运行追踪字段
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {trackingFields.map((field) => (
              <div key={field} className="rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <span className="text-[12px] font-medium text-[#374151]">{field}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-5 text-[#6B7280]">
            字段来自任务、run、artifact 和 peptide API；接口未返回的字段显示为 not available / 当前接口未返回，不伪造路径、评分完整性或风险值。
          </p>
        </motion.section>

        <motion.aside
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="space-y-4"
        >
          <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
              <FolderOpen size={16} className="text-[#14B8A6]" />
              访问地址
            </h2>
            <div className="mt-3 space-y-2 font-mono text-[12px] text-[#374151]">
              <div>http://192.168.31.218:18700</div>
              <div>http://192.168.31.218:18701/api/health</div>
            </div>
          </section>

          <section className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#991B1B]">
              <AlertTriangle size={16} />
              已禁用入口
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {disabledModes.map((mode) => (
                <span key={mode} className="rounded-full border border-[#FECACA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#991B1B]">
                  {mode}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#E5E7EB] bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
              <FileText size={16} className="text-[#14B8A6]" />
              操作
            </h2>
            <div className="mt-3 grid gap-2">
              <Link className="rounded-[6px] bg-[#14B8A6] px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-[#0F766E]" to="/generation">
                提交 SERVER_PRODUCTION
              </Link>
              <Link className="rounded-[6px] border border-[#E5E7EB] px-3 py-2 text-center text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB]" to="/task-center">
                查看任务追踪
              </Link>
            </div>
          </section>
        </motion.aside>
      </div>
    </div>
  )
}
