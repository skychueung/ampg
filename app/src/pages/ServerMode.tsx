import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import {
  Server,
  Cpu,
  Settings,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plug,
  HardDrive,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '@/i18n/LanguageContext'

/* ──────────────────────────────── mock data ─────────────────────────────── */

const DEMO_GPUS = [
  { id: 0, name: 'NVIDIA A100-SXM4-80GB', utilization: 72, memoryUsed: 42, memoryTotal: 80, temp: 68, process: 'ampgen-worker: #1291' },
  { id: 1, name: 'NVIDIA A100-SXM4-80GB', utilization: 45, memoryUsed: 28, memoryTotal: 80, temp: 62, process: 'mic-scorer: #1290' },
  { id: 2, name: 'NVIDIA A100-SXM4-80GB', utilization: 0, memoryUsed: 8, memoryTotal: 80, temp: 45, process: 'idle' },
  { id: 3, name: 'NVIDIA A100-SXM4-80GB', utilization: 89, memoryUsed: 71, memoryTotal: 80, temp: 74, process: 'ampgen-worker: #1289' },
]

const GPU_HISTORY = Array.from({ length: 20 }, (_, i) => ({
  time: `${i * 3}s`,
  gpu0: 55 + Math.sin(i * 0.5) * 20 + Math.random() * 10,
  gpu1: 40 + Math.cos(i * 0.4) * 15 + Math.random() * 10,
  gpu2: 5 + Math.random() * 5,
  gpu3: 75 + Math.sin(i * 0.6) * 15 + Math.random() * 10,
}))

const WORKFLOW_STEPS = [
  { label: 'Client Request', icon: 'Server', aux: 'Failover' },
  { label: 'Load Balancer', icon: 'Layers', aux: '' },
  { label: 'GPU Queue', icon: 'Layers', aux: 'Auto-scale' },
  { label: 'AMPGen Model', icon: 'Cpu', aux: 'Checkpoint' },
  { label: 'Scoring Cluster', icon: 'Activity', aux: 'Validation' },
  { label: 'Result Store', icon: 'HardDrive', aux: 'Auto-export' },
  { label: 'Client Pull', icon: 'CheckCircle', aux: '' },
]

/* ──────────────────────────────── helpers ─────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
}

function tempColor(t: number) {
  if (t >= 80) return 'text-[#EF4444]'
  if (t >= 65) return 'text-[#F59E0B]'
  return 'text-[#10B981]'
}

/* ──────────────────────────────── component ─────────────────────────────── */

export default function ServerMode() {
  const { t } = useTranslation()
  const [connected, setConnected] = useState(false)
  const [testing, setTesting] = useState(false)
  const [serverUrl, setServerUrl] = useState('https://gpu-cluster.bio.dev')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('AMPGen-Large')
  const [maxBatchSize, setMaxBatchSize] = useState('1000')
  const [priority, setPriority] = useState('Normal')
  const [autoExport, setAutoExport] = useState(false)

  const [jobType, setJobType] = useState('Generate')
  const [peptideLength, setPeptideLength] = useState(20)
  const [numPeptides, setNumPeptides] = useState(1000)
  const [jobModel, setJobModel] = useState('AMPGen-Large')
  const [jobPriority, setJobPriority] = useState('Normal')
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const [queuePos, setQueuePos] = useState(4)

  const [liveUtils, setLiveUtils] = useState(DEMO_GPUS.map((g) => g.utilization))

  /* Simulate GPU utilization fluctuation */
  useEffect(() => {
    const iv = setInterval(() => {
      setLiveUtils((prev) =>
        prev.map((u) => Math.min(100, Math.max(0, u + (Math.random() - 0.5) * 6)))
      )
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const handleTestConnection = () => {
    setTesting(true)
    toast.info(t('server.testConnection') as string)
    setTimeout(() => {
      setTesting(false)
      setConnected(true)
      toast.success(t('server.statusAPITitle') as string)
    }, 1500)
  }

  const handleSaveConfig = () => {
    toast.success(t('server.saveConfig') as string)
  }

  const handleSubmitJob = () => {
    const newId = 1292 + queuePos
    setQueuePos((p) => p + 1)
    toast.success(`${t('server.batchJobTitle') as string} #${newId}`, {
      description: `${t('server.estimatedResources') as string}: ~${Math.ceil(numPeptides / 120)} min`,
    })
  }

  const handleDisconnect = () => {
    setConnected(false)
    toast.info(t('server.productionModeDesc') as string)
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* ─── Page Title ─── */}
      <motion.div {...fadeUp}>
        <h1 className="text-[20px] font-semibold text-[#111827]">{t('server.title') as string}</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">{t('server.subtitle') as string}</p>
      </motion.div>

      {/* ─── Mode Comparison Card ─── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.08 }}
      >
        <Card className="border-[#14B8A6] bg-gradient-to-br from-[#F0FDFA] to-white rounded-xl">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#F0FDFA] flex items-center justify-center">
                  <Server size={28} className="text-[#14B8A6]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#111827]">{t('server.productionModeTitle') as string}</h2>
                  <p className="text-[14px] text-[#6B7280]">
                    {connected
                      ? t('server.productionModeGPU') as string
                      : t('server.productionModeDesc') as string}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {connected ? (
                  <Badge className="bg-emerald-50 text-[#059669] border-[#10B981] px-3 py-1 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                    </span>
                    {t('common.serverProduction') as string}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1">{t('common.localDemo') as string}</Badge>
                )}
                <ArrowRight size={16} className="text-[#9CA3AF]" />
                {connected ? (
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white" onClick={() => handleTestConnection()}>
                    <Server size={16} />
                    {t('server.switchMode') as string}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Two-Column: Server Status + GPU Monitor ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.16 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                  <Server size={18} className="text-[#14B8A6]" />
                  {t('server.statusAPITitle') as string}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={connected ? 'h-3 w-3 rounded-full bg-[#10B981]' : 'h-3 w-3 rounded-full bg-[#EF4444]'} />
                  <span className="text-[13px] font-medium text-[#111827]">
                    {connected ? t('server.connected') as string : t('server.disconnected') as string}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px]">
                {t('server.statusMock') as string}
              </Badge>

              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { label: t('server.statusAPITitle') as string, value: connected ? 'Connected' : 'Disconnected', color: connected ? 'text-[#10B981]' : 'text-[#EF4444]' },
                  { label: t('server.statusGPUTitle') as string, value: 'gpu-server-01.cluster', color: 'text-[#111827]' },
                  { label: t('server.statusQueueTitle') as string, value: '3 jobs', color: 'text-[#111827]' },
                  { label: t('server.statusStorageTitle') as string, value: '~2 min', color: 'text-[#111827]' },
                  { label: t('server.lastHealthCheck') as string, value: '30s ago', color: 'text-[#6B7280]' },
                  { label: t('server.apiVersion') as string, value: 'v2.1.0', color: 'text-[#111827]' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#F9FAFB] rounded-md p-3">
                    <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">{item.label}</div>
                    <div className={`text-[13px] font-semibold mt-0.5 ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* GPU Monitor */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.24 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                <Cpu size={18} className="text-[#14B8A6]" />
                {t('server.gpuMonitorTitle') as string}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px] mb-3">
                {t('server.gpuPlaceholder') as string}
              </Badge>
              <div className="space-y-3 mt-2">
                {DEMO_GPUS.map((gpu, idx) => (
                  <motion.div
                    key={gpu.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.08 * idx }}
                    className="bg-[#F9FAFB] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-[#111827]">
                        GPU-{gpu.id}: {gpu.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white">{t('common.placeholder') as string}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] text-[#6B7280] mb-0.5">
                          <span>{t('server.gpuUtilization') as string}</span>
                          <span className="font-medium text-[#111827]">{Math.round(liveUtils[idx])}%</span>
                        </div>
                        <Progress
                          value={liveUtils[idx]}
                          className="h-2 bg-[#E5E7EB]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-[#6B7280] mb-0.5">
                          <span>{t('server.gpuMemory') as string}</span>
                          <span className="font-medium text-[#111827]">{gpu.memoryUsed}/{gpu.memoryTotal} GB</span>
                        </div>
                        <Progress
                          value={(gpu.memoryUsed / gpu.memoryTotal) * 100}
                          className="h-1.5 bg-[#E5E7EB]"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className={`${tempColor(gpu.temp)} font-medium`}>{gpu.temp}{t('server.gpuTemperature') as string}</span>
                        <span className="text-[#6B7280]">{gpu.process} {t('server.gpuProcesses') as string}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── GPU Utilization Chart ─── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.32 }}
      >
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
              <Activity size={18} className="text-[#14B8A6]" />
              GPU Utilization History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px] mb-3">
              {t('common.placeholder') as string}
            </Badge>
            <div className="h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GPU_HISTORY}>
                  <defs>
                    <linearGradient id="c0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B7280" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="c3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                    }}
                  />
                  <Area type="monotone" dataKey="gpu0" stroke="#14B8A6" fillOpacity={1} fill="url(#c0)" strokeWidth={2} name="GPU-0" />
                  <Area type="monotone" dataKey="gpu1" stroke="#0D9488" fillOpacity={1} fill="url(#c1)" strokeWidth={2} name="GPU-1" />
                  <Area type="monotone" dataKey="gpu2" stroke="#6B7280" fillOpacity={1} fill="url(#c2)" strokeWidth={1.5} name="GPU-2" />
                  <Area type="monotone" dataKey="gpu3" stroke="#F59E0B" fillOpacity={1} fill="url(#c3)" strokeWidth={2} name="GPU-3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Two-Column: Production Config + Batch Job ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Config */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                <Settings size={18} className="text-[#14B8A6]" />
                {t('server.configTitle') as string}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px]">
                {t('server.configPlaceholder') as string}
              </Badge>

              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.serverURL') as string}</Label>
                  <Input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://ampgen-server.yourlab.edu"
                    className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#14B8A6] focus:ring-[#14B8A6]/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.apiKey') as string}</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#14B8A6] focus:ring-[#14B8A6]/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.gpuSelection') as string}</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMPGen-Large">AMPGen-Large</SelectItem>
                      <SelectItem value="AMPGen-Base">AMPGen-Base</SelectItem>
                      <SelectItem value="EvoDiff">EvoDiff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.maxBatchSize') as string}</Label>
                  <Input
                    type="number"
                    value={maxBatchSize}
                    onChange={(e) => setMaxBatchSize(e.target.value)}
                    className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#14B8A6]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.priority') as string}</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">Auto-export Results</Label>
                  <Switch checked={autoExport} onCheckedChange={setAutoExport} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                    {t('server.testConnection') as string}
                  </Button>
                  <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white flex-1" onClick={handleSaveConfig}>
                    {t('server.saveConfig') as string}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit Batch Job */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.48 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                <Zap size={18} className="text-[#14B8A6]" />
                {t('server.batchJobTitle') as string}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px]">
                {t('common.notImplemented') as string}
              </Badge>

              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.jobType') as string}</Label>
                  <div className="flex gap-1">
                    {['Generate', 'Filter', 'Score', 'Full Pipeline'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setJobType(type)}
                        className={`flex-1 text-[12px] font-medium py-2 px-2 rounded-md border transition-colors ${
                          jobType === type
                            ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                            : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.peptideLength') as string}</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={peptideLength}
                      onChange={(e) => setPeptideLength(Number(e.target.value))}
                      className="flex-1 accent-[#14B8A6]"
                    />
                    <Input
                      type="number"
                      min={10}
                      max={50}
                      value={peptideLength}
                      onChange={(e) => setPeptideLength(Number(e.target.value))}
                      className="w-20 bg-[#F9FAFB] border-[#E5E7EB]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.peptideCount') as string}</Label>
                  <Input
                    type="number"
                    min={100}
                    max={10000}
                    value={numPeptides}
                    onChange={(e) => setNumPeptides(Number(e.target.value))}
                    className="bg-[#F9FAFB] border-[#E5E7EB]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.model') as string}</Label>
                  <Select value={jobModel} onValueChange={setJobModel}>
                    <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMPGen-Large">AMPGen-Large</SelectItem>
                      <SelectItem value="AMPGen-Base">AMPGen-Base</SelectItem>
                      <SelectItem value="EvoDiff">EvoDiff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('server.priority') as string}</Label>
                  <Select value={jobPriority} onValueChange={setJobPriority}>
                    <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">Notification on Completion</Label>
                  <Switch checked={notifyOnComplete} onCheckedChange={setNotifyOnComplete} />
                </div>

                <div className="bg-[#F0FDFA] rounded-md p-3 space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{t('server.estimatedResources') as string}:</span>
                    <span className="font-medium text-[#111827]">~{Math.ceil(numPeptides / 120)} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Estimated cost:</span>
                    <span className="font-medium text-[#111827]">${(numPeptides * 0.00042).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{t('server.queuePosition') as string}:</span>
                    <span className="font-medium text-[#111827]">#{queuePos} (est. wait: ~6 min)</span>
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-[#14B8A6] hover:bg-[#0D9488] text-white text-[14px] font-medium"
                  onClick={handleSubmitJob}
                >
                  <Zap size={18} />
                  {t('server.submitJob') as string}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Workflow Diagram ─── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.56 }}
      >
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
              <Activity size={18} className="text-[#14B8A6]" />
              Production Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-[#D97706] border-[#FCD34D] bg-[#FFFBEB] text-[11px] mb-4">
              {t('common.placeholder') as string}
            </Badge>
            <div className="relative mt-2 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[700px] px-2 py-4">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <div key={step.label} className="flex items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                      className="relative flex flex-col items-center"
                    >
                      <div className="w-28 bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col items-center gap-1.5 shadow-sm hover:border-[#14B8A6] transition-colors">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                          idx < 4 ? 'bg-[#F0FDFA] text-[#14B8A6]' : 'bg-[#F9FAFB] text-[#6B7280]'
                        }`}>
                          {step.icon === 'Server' && <Server size={16} />}
                          {step.icon === 'Layers' && <Layers size={16} />}
                          {step.icon === 'Cpu' && <Cpu size={16} />}
                          {step.icon === 'Activity' && <Activity size={16} />}
                          {step.icon === 'HardDrive' && <HardDrive size={16} />}
                          {step.icon === 'CheckCircle' && <CheckCircle size={16} />}
                        </div>
                        <span className="text-[11px] font-medium text-[#111827] text-center leading-tight">{step.label}</span>
                        {step.aux && (
                          <span className="text-[9px] text-[#9CA3AF] leading-tight">{step.aux}</span>
                        )}
                      </div>
                      {idx < 4 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      )}
                    </motion.div>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 + 0.2 }}
                        className="w-8 h-px bg-[#E5E7EB] mx-1 flex-shrink-0 origin-left"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Scientific Disclaimer ─── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.64 }}
        className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FCD34D] flex items-start gap-3"
      >
        <AlertTriangle size={18} className="text-[#D97706] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-medium text-[#92400E]">
            <strong>{t('common.disclaimer') as string}</strong>
          </p>
          <p className="text-[12px] text-[#B45309] mt-1">
            {t('server.localModeDesc') as string}
          </p>
          <p className="text-[12px] text-[#B45309] mt-0.5">
            {t('server.localModeLimit') as string}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
