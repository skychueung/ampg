import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Dna,
  SlidersHorizontal,
  Server,
  Cpu,
  X,
  Eye,
  Info,
} from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'
import Layout from '@/components/Layout'
import StatusBadge from '@/components/StatusBadge'
import { createGenerationRun, getGenerationRunPeptides } from '@/api/generation'
import { createServerBatch, getServerBatch } from '@/api/serverBatches'
import type { GenerationRun } from '@/api/generation'
import { getTask, getTaskLogs, cancelTask, type TaskRecord } from '@/api/tasks'
import { getRuntimeConfig } from '@/api/system'
import type { RuntimeConfig } from '@/api/system'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type GenMode = 'Sequence-based' | 'MSA-based' | 'MSA-conditional'
type ModelBackend = 'SERVER_PRODUCTION'
type GenStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED' | 'CANCELLED'

interface GeneratedPeptide {
  id: string
  sequence: string
  length: number
  net_charge: number
  hydrophobic_fraction: number
  status: string
  source?: string
}

interface RunResult extends GenerationRun {
  message?: string
  error_message?: string
}

/* ------------------------------------------------------------------ */
/*  Easing preset                                                      */
/* ------------------------------------------------------------------ */
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Generation() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  /* -- form state -- */
  const [genMode, setGenMode] = useState<GenMode>('Sequence-based')
  const [peptideCount, setPeptideCount] = useState<number>(5)
  const [customCount, setCustomCount] = useState<string>('25')
  const [isCustom, setIsCustom] = useState(false)
  const [minLen, setMinLen] = useState<number>(15)
  const [maxLen, setMaxLen] = useState<number>(35)
  const [modelBackend, setModelBackend] = useState<ModelBackend>('SERVER_PRODUCTION')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [temperature, setTemperature] = useState<number>(1.0)
  const [topP, setTopP] = useState<number>(0.95)

  /* -- generation state -- */
  const [genStatus, setGenStatus] = useState<GenStatus>('IDLE')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedPeptide[]>([])
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [taskInfo, setTaskInfo] = useState<TaskRecord | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [elapsed, setElapsed] = useState<number>(0)
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* load runtime config on mount */
  useEffect(() => {
    getRuntimeConfig().then(setRuntimeConfig).catch(() => {})
  }, [])

  const countValue = isCustom ? parseInt(customCount) || 0 : peptideCount

  /* cleanup interval on unmount */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [])

  /* -- handlers -- */
  const handleGenerate = useCallback(async () => {
    const count = countValue

    /* AMPGen Server-Only permits only SERVER_PRODUCTION. */
    if (modelBackend === 'SERVER_PRODUCTION') {
      if (!runtimeConfig?.server_production_enabled) {
        setGenStatus('BLOCKED')
        setTaskId(`task-${Date.now()}`)
        setGenerated([])
        setRunResult(null)
        setErrorMsg('Server production backend is not enabled.')
        return
      }
      const maxCount = runtimeConfig?.server_production_max_count || 100000
      const singleRunLimit = runtimeConfig?.server_production_single_run_limit || 100
      if (count > maxCount) {
        setGenStatus('BLOCKED')
        setTaskId(`task-${Date.now()}`)
        setGenerated([])
        setRunResult(null)
        setErrorMsg(
          `SERVER_PRODUCTION is limited to ${maxCount} peptides.`
        )
        return
      }
      if (count > singleRunLimit) {
        // Auto-switch to batch queue for large counts
        setGenStatus('PENDING')
        setErrorMsg(null)
        setSubmitting(true)
        try {
          const batchPayload = {
            batch_name: `Auto-batch-${count}-${Date.now()}`,
            backend: 'SERVER_PRODUCTION',
            total_count: count,
            mode: genMode,
            min_length: minLen,
            max_length: maxLen,
            temperature,
            top_p: topP,
          }
          const batch = await createServerBatch(batchPayload)
          setTaskId(`batch-${batch.id}`)
          setGenStatus('PENDING')
          
          // Poll batch status
          intervalRef.current = setInterval(async () => {
            try {
              const batchDetail = await getServerBatch(batch.id)
              const completed = batchDetail.completed_chunks || 0
              const total = batchDetail.total_chunks || 1
              const progress = Math.round((completed / total) * 100)
              
              setTaskInfo({
                id: batch.id,
                status: batchDetail.status,
                progress,
                total: batchDetail.total_count,
                message: batchDetail.message || `Progress: ${completed}/${total} chunks`,
              } as any)
              
              if (batchDetail.status === 'SUCCEEDED') {
                setGenStatus('SUCCEEDED')
                if (intervalRef.current) clearInterval(intervalRef.current)
                setSubmitting(false)
              } else if (batchDetail.status === 'FAILED') {
                setGenStatus('FAILED')
                if (intervalRef.current) clearInterval(intervalRef.current)
                setSubmitting(false)
              } else if (batchDetail.status === 'PARTIAL') {
                setGenStatus('RUNNING')
              }
            } catch (e) {
              console.error('Batch poll error', e)
            }
          }, 3000)
          
          return
        } catch (e: any) {
          setGenStatus('FAILED')
          setErrorMsg(`Batch creation failed: ${e.message || e}`)
          setSubmitting(false)
          return
        }
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setSubmitting(true)
    setGenStatus('PENDING')
    setTaskId(null)
    setGenerated([])
    setRunResult(null)
    setErrorMsg(null)
    setTaskInfo(null)
    setLogs([])
    setElapsed(0)

    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    const startTime = Date.now()
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    try {
      const payload = {
        backend: modelBackend,
        mode: genMode,
        count,
        min_length: minLen,
        max_length: maxLen,
        temperature,
        top_p: topP,
      }

      const run = await createGenerationRun(payload)
      const runId = run.id

      setTaskId(run.task_id ? String(run.task_id) : `run-${runId}`)
      setRunResult(run as RunResult)
      setGenStatus(run.status as GenStatus)

      if (run.status === 'BLOCKED' || run.status === 'FAILED') {
        setSubmitting(false)
        return
      }

      // Immediate fetch
      try {
        const data = await getGenerationRunPeptides(runId)
        setRunResult(data as RunResult)
        setGenStatus(data.status as GenStatus)
        if (data.peptides && data.peptides.length > 0) {
          setGenerated(
            data.peptides.map((p) => ({
              id: String(p.id),
              sequence: p.sequence,
              length: p.length,
              net_charge: p.net_charge ?? 0,
              hydrophobic_fraction: p.hydrophobic_fraction ?? 0,
              status: p.status,
              source: p.source,
            }))
          )
        }
        if (data.status === 'SUCCEEDED' || data.status === 'FAILED' || data.status === 'BLOCKED') {
          setSubmitting(false)
          return
        }
      } catch {
        // ignore immediate fetch error, will poll
      }

      // Poll
      intervalRef.current = setInterval(async () => {
        try {
          const data = await getGenerationRunPeptides(runId)
          setRunResult(data as RunResult)
          setGenStatus(data.status as GenStatus)

          // Parallel fetch task info and logs when task_id available
          if (data.task_id) {
            try {
              const [tInfo, logData] = await Promise.all([
                getTask(data.task_id),
                getTaskLogs(data.task_id),
              ])
              setTaskInfo(tInfo)
              setLogs(logData.logs || [])
            } catch {
              // ignore task/log fetch errors
            }
          }

          if (data.peptides && data.peptides.length > 0) {
            setGenerated(
              data.peptides.map((p) => ({
                id: String(p.id),
                sequence: p.sequence,
                length: p.length,
                net_charge: p.net_charge ?? 0,
                hydrophobic_fraction: p.hydrophobic_fraction ?? 0,
                status: p.status,
                source: p.source,
              }))
            )
          }

          if (data.status === 'SUCCEEDED' || data.status === 'FAILED' || data.status === 'BLOCKED' || data.status === 'CANCELLED') {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            if (elapsedRef.current) {
              clearInterval(elapsedRef.current)
              elapsedRef.current = null
            }
            setSubmitting(false)
          }
        } catch (err: any) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          if (elapsedRef.current) {
            clearInterval(elapsedRef.current)
            elapsedRef.current = null
          }
          setGenStatus('FAILED')
          setErrorMsg(err.message || 'Polling failed')
          setSubmitting(false)
        }
      }, 3000)
    } catch (err: any) {
      setGenStatus('FAILED')
      setErrorMsg(err.message || 'Create generation run failed')
      setSubmitting(false)
    }
  }, [countValue, modelBackend, genMode, minLen, maxLen, temperature, topP])

  const copyTaskId = useCallback(() => {
    if (taskId) {
      navigator.clipboard.writeText(taskId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [taskId])

  const handleCancel = useCallback(async () => {
    if (!taskId) return
    const numericTaskId = parseInt(taskId, 10)
    if (isNaN(numericTaskId)) return
    try {
      setGenStatus('CANCELLED')
      await cancelTask(numericTaskId)
    } catch (err: any) {
      // Ignore API errors; polling will pick up real state
    }
  }, [taskId])

  const quickMode = (mode: 'quick' | 'explore' | 'deep') => {
    if (mode === 'quick') {
      setMinLen(15)
      setMaxLen(25)
      setPeptideCount(10)
      setIsCustom(false)
    } else if (mode === 'explore') {
      setMinLen(20)
      setMaxLen(35)
      setPeptideCount(50)
      setIsCustom(false)
    } else {
      setMinLen(25)
      setMaxLen(50)
      setPeptideCount(100)
      setIsCustom(false)
    }
  }

  return (
    <Layout title="AMPGen Server-Only" subtitle={t('generation.serverOnlySubtitle') as string}>
      <div className="space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          <h2 className="text-[20px] font-semibold text-[#111827]">AMPGen Server-Only</h2>
          <p className="text-[14px] text-[#6B7280] mt-1">
            {t('generation.serverOnlyDescription') as string}
          </p>
        </motion.div>

        {/* Generation Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: easeOut }}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <FlaskConical size={16} className="text-[#14B8A6]" />
            <h3 className="text-[16px] font-semibold text-[#111827]">{t('generation.formTitle') as string}</h3>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Generation Mode */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
                {t('dashboard.generationMode') as string}
              </label>
              <select
                value={genMode}
                onChange={(e) => setGenMode(e.target.value as GenMode)}
                className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
              >
                <option value="Sequence-based">{t('generation.modeSequence') as string}</option>
                <option value="MSA-based">{t('generation.modeMsa') as string}</option>
                <option value="MSA-conditional">{t('generation.modeMsaConditional') as string}</option>
              </select>
            </div>

            {/* Number of Peptides */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
                {t('dashboard.numPeptides') as string}
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={isCustom ? 'custom' : peptideCount}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'custom') {
                      setIsCustom(true)
                    } else {
                      setIsCustom(false)
                      setPeptideCount(Number(v))
                    }
                  }}
                  className="h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={1000}>1000</option>
                  <option value={10000}>10000</option>
                  <option value={70000}>70000</option>
                  <option value="custom">{t('generation.customOption') as string}</option>
                </select>
                {isCustom && (
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    className="h-[36px] w-[120px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
                  />
                )}
              </div>
            </div>

            {/* Length Range */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
                {t('dashboard.lengthRange') as string}
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#6B7280]">{t('common.min') as string}</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={minLen}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setMinLen(v)
                      if (v > maxLen) setMaxLen(v)
                    }}
                    className="h-[36px] w-[80px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
                  />
                </div>
                <span className="text-[#9CA3AF]">&mdash;</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#6B7280]">{t('common.max') as string}</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={maxLen}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setMaxLen(v)
                      if (v < minLen) setMinLen(v)
                    }}
                    className="h-[36px] w-[80px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
                  />
                </div>
                <span className="text-[12px] text-[#9CA3AF] ml-2">
                  {minLen} &ndash; {maxLen} {t('generation.aminoAcids') as string}
                </span>
              </div>
            </div>

            {/* Model Backend */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
                {t('dashboard.modelBackend') as string}
              </label>
              <select
                value={modelBackend}
                onChange={(e) => setModelBackend(e.target.value as ModelBackend)}
                className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6] focus:ring-[3px] focus:ring-[rgba(20,184,166,0.1)]"
              >
                <option value="SERVER_PRODUCTION">
                  {runtimeConfig?.server_production_enabled
                    ? 'Server Production (GPU)'
                    : 'Server Production (disabled)'}
                </option>
              </select>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                {t('generation.backendNote') as string}
              </p>

              {/* SERVER_PRODUCTION status panel */}
              {runtimeConfig && modelBackend === 'SERVER_PRODUCTION' && (
                <div className="mt-3 p-3 rounded-[6px] bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-[#D97706]" />
                    <span className="text-[13px] font-medium text-[#92400E]">
                      Server Production
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        runtimeConfig.server_production_enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      {runtimeConfig.server_production_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {runtimeConfig.server_production_enabled && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[#78350F]">
                      <div>
                        <span className="text-[#B45309]">Max count:</span>{' '}
                        {runtimeConfig.server_production_max_count}
                      </div>
                      <div>
                        <span className="text-[#B45309]">Device:</span>{' '}
                        {runtimeConfig.server_production_device}
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#B45309]">Artifact dir:</span>{' '}
                        <span className="font-mono text-[11px]">{runtimeConfig.server_artifact_dir}</span>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-[#B45309] mt-1">
                    {t('generation.serverOnlyDescription') as string}
                  </p>
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="border border-[#E5E7EB] rounded-[6px]">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors rounded-[6px]"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={14} />
                  {t('generation.advancedOptions') as string}
                </span>
                {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <AnimatePresence>
                {advancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#E5E7EB]">
                      {/* Temperature */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                            {t('generation.temperature') as string}
                          </label>
                          <span className="text-[13px] font-medium text-[#111827]">
                            {temperature.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={2.0}
                          step={0.1}
                          value={temperature}
                          onChange={(e) => setTemperature(Number(e.target.value))}
                          className="w-full accent-[#14B8A6]"
                        />
                        <div className="flex justify-between text-[11px] text-[#9CA3AF] mt-0.5">
                          <span>{t('generation.conservative') as string}</span>
                          <span>{t('generation.diverse') as string}</span>
                        </div>
                      </div>

                      {/* Top-p */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                            {t('generation.topP') as string}
                          </label>
                          <span className="text-[13px] font-medium text-[#111827]">
                            {topP.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          value={topP}
                          onChange={(e) => setTopP(Number(e.target.value))}
                          className="w-full accent-[#14B8A6]"
                        />
                        <div className="flex justify-between text-[11px] text-[#9CA3AF] mt-0.5">
                          <span>{t('generation.topPMin') as string}</span>
                          <span>{t('generation.topPFull') as string}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Mode Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[12px] text-[#6B7280] mr-1">{t('generation.presets') as string}</span>
              <button
                onClick={() => quickMode('quick')}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6] hover:bg-[#ccfbf1] transition-colors"
              >
                <Zap size={12} className="inline mr-1" />
                {t('generation.quick10') as string}
              </button>
              <button
                onClick={() => quickMode('explore')}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6] hover:bg-[#ccfbf1] transition-colors"
              >
                <Dna size={12} className="inline mr-1" />
                {t('generation.explore50') as string}
              </button>
              <button
                onClick={() => quickMode('deep')}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6] hover:bg-[#ccfbf1] transition-colors"
              >
                <Server size={12} className="inline mr-1" />
                {t('generation.deep100') as string}
              </button>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={submitting || genStatus === 'RUNNING' || genStatus === 'PENDING'}
              className="w-full h-[44px] flex items-center justify-center gap-2 bg-[#14B8A6] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting || genStatus === 'RUNNING' || genStatus === 'PENDING' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('generation.generating') as string}
                </>
              ) : (
                <>
                  <Play size={16} />
                  {t('generation.generateButton') as string}
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Task Status Display */}
        <AnimatePresence>
          {genStatus !== 'IDLE' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-[#14B8A6]" />
                <h3 className="text-[16px] font-semibold text-[#111827]">{t('generation.taskStatus') as string}</h3>
              </div>

              {/* Task ID */}
              {taskId && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('generation.taskId') as string}
                  </span>
                  <code className="px-2.5 py-1 bg-[#F9FAFB] rounded-[6px] text-[13px] font-mono text-[#14B8A6]">
                    {taskId}
                  </code>
                  <button
                    onClick={copyTaskId}
                    className="p-1.5 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                    title={t('generation.copyTaskId') as string}
                  >
                    {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              {/* Run Result Details */}
              {runResult && (
                <div className="mb-4 grid grid-cols-2 gap-2 text-[13px]">
                  <div>
                    <span className="text-[#6B7280]">Run ID:</span>{' '}
                    <span className="font-mono text-[#111827]">{runResult.id}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Task ID:</span>{' '}
                    <span className="font-mono text-[#111827]">{runResult.task_id ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Backend:</span>{' '}
                    <span className="text-[#111827]">{runResult.backend}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Count:</span>{' '}
                    <span className="text-[#111827]">{runResult.count}</span>
                  </div>
                  {runResult.message && (
                    <div className="col-span-2">
                      <span className="text-[#6B7280]">Message:</span>{' '}
                      <span className="text-[#111827]">{runResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  {t('common.status') as string}
                </span>
                <StatusBadge
                  status={
                    genStatus === 'BLOCKED'
                      ? 'BLOCKED'
                      : genStatus === 'PENDING'
                        ? 'PENDING'
                        : genStatus === 'RUNNING'
                          ? 'RUNNING'
                          : genStatus === 'SUCCEEDED'
                            ? 'SUCCEEDED'
                            : genStatus === 'CANCELLED'
                              ? 'CANCELLED'
                              : 'FAILED'
                  }
                />
              </div>

              {/* Cancel button */}
              {(genStatus === 'PENDING' || genStatus === 'RUNNING') && taskId && (
                <div className="mb-4">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-3 py-2 bg-[#FEF2F2] text-[#B91C1C] text-[13px] font-medium rounded-[6px] border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors"
                  >
                    <X size={14} />
                    Cancel Task
                  </button>
                </div>
              )}

              {/* CANCELLED message */}
              {genStatus === 'CANCELLED' && (
                <div className="mb-4 p-3 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] flex items-start gap-2.5">
                  <X size={16} className="text-[#6B7280] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#374151]">Task Cancelled</p>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">
                      The task was cancelled by user. Partial artifacts may be available in Task Center.
                    </p>
                  </div>
                </div>
              )}

              {/* Frontend BLOCKED message */}
              {genStatus === 'BLOCKED' && !runResult?.message && (
                <div className="mb-4 p-3 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#B91C1C]">
                      {t('generation.blockedMessage') as string}
                    </p>
                    <p className="text-[12px] text-[#991B1B] mt-0.5">
                      {t('generation.blockedSuggestion') as string}
                    </p>
                  </div>
                </div>
              )}

              {/* Backend BLOCKED message */}
              {genStatus === 'BLOCKED' && runResult?.message && (
                <div className="mb-4 p-3 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#B91C1C]">Backend Blocked</p>
                    <p className="text-[12px] text-[#991B1B] mt-0.5">{runResult.message}</p>
                  </div>
                </div>
              )}

              {/* FAILED message */}
              {genStatus === 'FAILED' && (
                <div className="mb-4 p-3 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[#DC2626] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#B91C1C]">Generation Failed</p>
                    <p className="text-[12px] text-[#991B1B] mt-0.5">
                      {errorMsg || runResult?.error_message || 'Unknown error'}
                    </p>
                  </div>
                </div>
              )}

              {/* Progress + Elapsed + Message */}
              {(genStatus === 'PENDING' || genStatus === 'RUNNING') && (taskInfo || elapsed > 0) && (
                <div className="mb-4 space-y-2">
                  {taskInfo && taskInfo.total > 0 && (
                    <div>
                      <div className="flex justify-between text-[12px] text-[#6B7280] mb-1">
                        <span>Progress</span>
                        <span>{Math.round((taskInfo.progress / taskInfo.total) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#14B8A6] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((taskInfo.progress / taskInfo.total) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {elapsed > 0 && (
                    <div className="text-[12px] text-[#6B7280]">
                      ⏱ 已运行 {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                    </div>
                  )}
                  {taskInfo?.message && (
                    <div className="text-[12px] text-[#374151] bg-[#F9FAFB] rounded-[6px] px-2.5 py-1.5">
                      {taskInfo.message}
                    </div>
                  )}
                </div>
              )}

              {/* Live Logs */}
              {logs.length > 0 && (genStatus === 'RUNNING' || genStatus === 'PENDING') && (
                <div className="mb-4">
                  <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('generation.liveLogs') as string}
                  </span>
                  <div className="mt-1.5 space-y-0.5 max-h-[120px] overflow-y-auto bg-[#111827] rounded-[6px] px-3 py-2">
                    {logs.slice(-5).map((line, i) => (
                      <div key={i} className="text-[11px] font-mono text-[#10B981]">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output preview for RUNNING / SUCCEEDED */}
              {(genStatus === 'RUNNING' || genStatus === 'SUCCEEDED') && (
                <div>
                  <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                    {t('generation.outputPreview') as string} ({generated.length} {t('generation.sequences') as string})
                  </span>
                  <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                    <AnimatePresence>
                      {generated.map((pep, i) => (
                        <motion.div
                          key={pep.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i < 5 ? i * 0.03 : 0 }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] rounded-[6px]"
                        >
                          <Check size={12} className="text-[#10B981] flex-shrink-0" />
                          <span className="text-[13px] font-mono text-[#14B8A6] truncate">
                            {pep.sequence}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF] ml-auto flex-shrink-0">
                            {pep.length}{t('generation.aaSuffix') as string}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* SERVER_PRODUCTION notice (post-completion) */}
              {modelBackend === 'SERVER_PRODUCTION' &&
                (genStatus === 'SUCCEEDED' || genStatus === 'RUNNING') && (
                  <div className="mb-4 p-3 rounded-[6px] bg-[#F0FDFA] border border-[#14B8A6] flex items-start gap-2.5">
                    <Info size={16} className="text-[#14B8A6] mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-[#0F766E]">
                      {t('generation.serverProductionEnabled') as string}
                    </p>
                  </div>
                )}

              {/* Source badge */}
              {genStatus !== 'BLOCKED' && runResult && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">Source</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    SERVER_PRODUCTION
                  </span>
                </div>
              )}

              {/* View Run Detail button */}
              {runResult && runResult.id && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/generation-runs/${runResult.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#14B8A6] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors"
                  >
                    <Eye size={14} />
                    {genStatus === 'RUNNING' || genStatus === 'PENDING'
                      ? 'View Live Run Detail'
                      : genStatus === 'SUCCEEDED'
                      ? 'View Full Run Detail'
                      : 'View Run Detail'}
                  </button>
                  <button
                    onClick={() => navigate('/candidate-library')}
                    className="px-4 py-2 bg-[#F3F4F6] text-[#374151] text-[13px] font-medium rounded-[6px] hover:bg-[#E5E7EB] transition-colors"
                  >
                    {t('generation.viewCandidateLibrary') as string}
                  </button>
                  <button
                    onClick={() => navigate('/task-center')}
                    className="px-4 py-2 bg-[#F3F4F6] text-[#374151] text-[13px] font-medium rounded-[6px] hover:bg-[#E5E7EB] transition-colors"
                  >
                    {t('generation.viewTaskCenter') as string}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Generation Preview Table */}
        <AnimatePresence>
          {generated.length > 0 && genStatus !== 'BLOCKED' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Dna size={16} className="text-[#14B8A6]" />
                  <h3 className="text-[16px] font-semibold text-[#111827]">{t('generation.generatedSequences') as string}</h3>
                </div>
                <span className="text-[12px] text-[#6B7280]">
                  {t('generation.showingPeptides') as string} {generated.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        {t('filter.columnSequence') as string}
                      </th>
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        {t('filter.columnLength') as string}
                      </th>
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        Net Charge
                      </th>
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        Hydrophobic Fraction
                      </th>
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        {t('common.status') as string}
                      </th>
                      <th className="text-left px-4 py-2.5 text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {generated.map((pep, idx) => (
                      <motion.tr
                        key={pep.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx < 10 ? idx * 0.04 : 0 }}
                        className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                        onClick={() => navigate(`/peptide/${pep.id}`)}
                      >
                        <td className="px-4 py-3 text-[14px] font-mono text-[#14B8A6] truncate max-w-[200px]">
                          {pep.sequence}
                        </td>
                        <td className="px-4 py-3 text-[14px] text-[#111827]">{pep.length}</td>
                        <td className="px-4 py-3 text-[14px] text-[#111827]">
                          {pep.net_charge > 0 ? '+' : ''}
                          {pep.net_charge}
                        </td>
                        <td className="px-4 py-3 text-[14px] text-[#111827]">{pep.hydrophobic_fraction}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6]">
                            {pep.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] text-[#6B7280]">
                          {pep.source || '-'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scientific Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: easeOut }}
          className="p-4 rounded-[8px] bg-[#F0FDFA] border border-[#14B8A6]"
        >
          <p className="text-[12px] text-[#0F766E] flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <strong>{t('common.computationalPrediction') as string}</strong> &mdash; {t('common.disclaimer') as string}
          </p>
        </motion.div>
      </div>
    </Layout>
  )
}
