import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  Search,
  Download,
  Trash2,
  Edit,
  Eye,
  RotateCcw,
  LogOut,
  Loader2,
  Zap,
  Settings,
  Users,
  BookOpen,
  Beaker,
  FileText,
  Save,
  RotateCcw as ResetIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { DEMO_PEPTIDES, DEMO_TASKS, formatRelativeTime } from '@/data/demoData'
import { useTranslation } from '@/i18n/LanguageContext'

/* ─────────────────────── mock data ─────────────────────── */


const DEMO_SUBMISSIONS = [
  { id: 101, userId: 1, username: 'alice_researcher', type: 'Generation', peptideCount: 500, params: 'Len:20, N:500', status: 'COMPLETED', date: new Date(Date.now() - 3600_000), mode: 'Local' },
  { id: 102, userId: 2, username: 'bob_phd', type: 'Full Pipeline', peptideCount: 1000, params: 'Len:25, N:1000, score-all', status: 'RUNNING', date: new Date(Date.now() - 1800_000), mode: 'Server' },
  { id: 103, userId: 3, username: 'carol_lab', type: 'Filter', peptideCount: 200, params: 'threshold:0.8', status: 'COMPLETED', date: new Date(Date.now() - 7200_000), mode: 'Local' },
  { id: 104, userId: 4, username: 'dave_postdoc', type: 'Generation', peptideCount: 2000, params: 'Len:30, N:2000, evodiff', status: 'PENDING', date: new Date(Date.now() - 600_000), mode: 'Server' },
  { id: 105, userId: 1, username: 'alice_researcher', type: 'Scoring', peptideCount: 89, params: 'mic+tox', status: 'COMPLETED', date: new Date(Date.now() - 86400_000), mode: 'Local' },
  { id: 106, userId: 2, username: 'bob_phd', type: 'Generation', peptideCount: 1500, params: 'Len:15, N:1500', status: 'FAILED', date: new Date(Date.now() - 43200_000), mode: 'Server' },
  { id: 107, userId: 3, username: 'carol_lab', type: 'Full Pipeline', peptideCount: 3000, params: 'Len:35, N:3000, high-priority', status: 'RUNNING', date: new Date(Date.now() - 900_000), mode: 'Server' },
]

const DEFAULT_THRESHOLDS = {
  minAmpScore: 0.5,
  maxMicThreshold: 64,
  maxToxicity: 0.5,
  maxHemolysis: 0.5,
  minLength: 10,
  maxLength: 50,
}

const DEFAULT_SERVER_CONFIG = {
  platformName: 'AMPGen Agent Platform',
  maxPeptidesPerBatch: 10000,
  defaultModel: 'AMPGen-Demo',
  sessionTimeout: 30,
  defaultServerUrl: 'https://gpu-cluster.bio.dev',
  maxQueueLength: 20,
  gpuTimeout: 30,
  autoRetryFailed: true,
}

/* ─────────────────────── helpers ─────────────────────── */


function statusBadgeColor(status: string) {
  switch (status) {
    case 'COMPLETED': case 'SUCCEEDED': return 'bg-emerald-50 text-[#059669] border-[#10B981]'
    case 'RUNNING': return 'bg-amber-50 text-[#D97706] border-[#F59E0B]'
    case 'PENDING': return 'bg-gray-50 text-[#6B7280] border-[#9CA3AF]'
    case 'FAILED': return 'bg-red-50 text-[#DC2626] border-[#EF4444]'
    default: return 'bg-gray-50 text-[#6B7280] border-[#9CA3AF]'
  }
}

/* ─────────────────────── component ─────────────────────── */

export default function Admin() {
  const { t } = useTranslation()
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [shake, setShake] = useState(false)
  const [activeTab, setActiveTab] = useState('candidates')

  // Candidate library state
  const [peptides, setPeptides] = useState(DEMO_PEPTIDES)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editPeptide, setEditPeptide] = useState<typeof DEMO_PEPTIDES[0] | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  // Task records state
  const [tasks, _setTasks] = useState(DEMO_TASKS)
  const [taskSearch, setTaskSearch] = useState('')

  // Config state
  const [thresholds, setThresholds] = useState({ ...DEFAULT_THRESHOLDS })
  const [serverConfig, setServerConfig] = useState({ ...DEFAULT_SERVER_CONFIG })

  /* ─── login handler ─── */
  const handleLogin = () => {
    setLoginError('')
    if (username === 'admin' && password === 'admin123') {
      setAuthenticated(true)
      toast.success(t('admin.welcomeBanner') as string)
    } else {
      setLoginError(t('admin.loginError') as string)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }

  const handleLogout = () => {
    setAuthenticated(false)
    setUsername('')
    setPassword('')
    setLoginError('')
    toast.info(t('admin.logout') as string)
  }

  /* ─── candidate helpers ─── */
  const filteredPeptides = useMemo(() => {
    let result = [...peptides]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter((p) =>
        p.sequence.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter)
    }
    return result
  }, [peptides, searchTerm, statusFilter])

  const toggleRow = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === filteredPeptides.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredPeptides.map((p) => p.id)))
    }
  }

  const deletePeptide = (id: number) => {
    setPeptides((prev) => prev.filter((p) => p.id !== id))
    setSelectedRows((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    toast.success(`${t('common.delete') as string} #${id}`)
    setDeleteDialogOpen(false)
  }

  const batchDelete = () => {
    const ids = Array.from(selectedRows)
    setPeptides((prev) => prev.filter((p) => !selectedRows.has(p.id)))
    setSelectedRows(new Set())
    toast.success(`${ids.length} ${t('admin.batchDelete') as string}`)
  }

  const handleEditSave = () => {
    if (!editPeptide) return
    setPeptides((prev) =>
      prev.map((p) => (p.id === editPeptide.id ? editPeptide : p))
    )
    setEditPeptide(null)
    toast.success(t('admin.saveChanges') as string)
  }

  /* ─── task helpers ─── */
  const filteredTasks = useMemo(() => {
    if (!taskSearch) return tasks
    const q = taskSearch.toLowerCase()
    return tasks.filter((t) =>
      t.type.toLowerCase().includes(q) || String(t.id).includes(q)
    )
  }, [tasks, taskSearch])

  const rerunTask = (taskId: number) => {
    toast.success(`${t('admin.rerunTask') as string} #${taskId}`)
  }

  /* ─── config helpers ─── */
  const saveConfig = () => {
    toast.success(t('admin.saveChanges') as string)
  }

  const resetConfig = () => {
    setThresholds({ ...DEFAULT_THRESHOLDS })
    setServerConfig({ ...DEFAULT_SERVER_CONFIG })
    toast.success(t('admin.resetDefaults') as string)
  }

  /* ═══════════════════════════════════════════════════════
     LOGIN SCREEN
     ═══════════════════════════════════════════════════════ */
  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-200px)]">
        <Toaster position="top-right" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[400px]"
        >
          <Card className="rounded-xl p-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#F0FDFA] flex items-center justify-center">
                <Lock size={32} className="text-[#14B8A6]" />
              </div>
              <h2 className="text-[20px] font-semibold text-[#111827] mt-4">{t('admin.loginTitle') as string}</h2>
              <p className="text-[14px] text-[#6B7280] mt-0.5">{t('admin.loginSubtitle') as string}</p>
            </div>

            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('admin.username') as string}</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#14B8A6]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">{t('admin.password') as string}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#14B8A6]"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[13px] text-[#EF4444] font-medium text-center"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                className="w-full h-11 bg-[#14B8A6] hover:bg-[#0D9488] text-white"
                onClick={handleLogin}
              >
                {t('admin.signIn') as string}
              </Button>
            </div>

            <div className="mt-6 p-3 rounded-md bg-[#FEF3C7] border border-[#FCD34D]">
              <p className="text-[11px] text-[#92400E] font-medium text-center">
                {t('admin.demoCredentials') as string}
              </p>
              <p className="text-[10px] text-[#B45309] text-center mt-1">
                {t('admin.demoWarning') as string}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-[400px] mt-4 p-3 rounded-lg bg-[#FFFBEB] border border-[#FCD34D] flex items-start gap-3"
        >
          <AlertTriangle size={16} className="text-[#D97706] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-[#92400E]">
              <strong>{t('common.disclaimer') as string}</strong>
            </p>
            <p className="text-[12px] text-[#B45309] mt-1">
              {t('admin.loginSubtitle') as string}
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════
     ADMIN DASHBOARD
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-[#14B8A6] bg-gradient-to-br from-[#F0FDFA] to-white rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#F0FDFA] flex items-center justify-center">
                  <ShieldCheck size={28} className="text-[#14B8A6]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-[#111827]">
                    {t('admin.welcomeBanner') as string}
                  </h2>
                  <p className="text-[14px] text-[#6B7280]">Admin Console &mdash; Full platform management access</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
                <LogOut size={14} />
                {t('admin.logout') as string}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#F9FAFB] border border-[#E5E7EB] p-1 rounded-lg">
            {[
              { value: 'candidates', label: t('admin.tabCandidates') as string, icon: BookOpen },
              { value: 'tasks', label: t('admin.tabTasks') as string, icon: FileText },
              { value: 'submissions', label: t('admin.tabSubmissions') as string, icon: Users },
              { value: 'config', label: t('admin.tabConfig') as string, icon: Settings },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] text-[13px] font-medium px-3 py-1.5 rounded-md transition-all gap-1.5"
              >
                <tab.icon size={14} />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── Tab 1: Candidate Library Management ─── */}
          <TabsContent value="candidates" className="mt-4">
            <motion.div
              key="candidates"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                      <BookOpen size={18} className="text-[#14B8A6]" />
                      Candidate Library Management
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={t('admin.searchPlaceholder') as string}
                          className="pl-8 w-48 bg-[#F9FAFB] border-[#E5E7EB] text-[13px]"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36 bg-[#F9FAFB] border-[#E5E7EB] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="CANDIDATE">Candidate</SelectItem>
                          <SelectItem value="VALIDATED">Validated</SelectItem>
                          <SelectItem value="GENERATED">Generated</SelectItem>
                          <SelectItem value="FILTERED">Filtered</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="gap-1 text-[13px]">
                        <Download size={14} />
                        Export
                      </Button>
                    </div>
                  </div>
                  {selectedRows.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E5E7EB]"
                    >
                      <span className="text-[12px] text-[#6B7280]">{selectedRows.size} selected</span>
                      <Button variant="destructive" size="sm" className="h-7 text-[12px] gap-1" onClick={batchDelete}>
                        <Trash2 size={12} />
                        {t('admin.batchDelete') as string}
                      </Button>
                    </motion.div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                          <th className="p-3 text-left w-10">
                            <Checkbox
                              checked={selectedRows.size === filteredPeptides.length && filteredPeptides.length > 0}
                              onCheckedChange={toggleAll}
                            />
                          </th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">ID</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Sequence</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Status</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">AMP Score</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">MIC</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Length</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Charge</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPeptides.slice(0, 20).map((p) => (
                          <tr key={p.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-3">
                              <Checkbox
                                checked={selectedRows.has(p.id)}
                                onCheckedChange={() => toggleRow(p.id)}
                              />
                            </td>
                            <td className="p-3 font-mono text-[#111827]">#{p.id}</td>
                            <td className="p-3 font-mono text-[#14B8A6] text-[12px] max-w-[140px] truncate">{p.sequence}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-[11px] ${statusBadgeColor(p.status)}`}>
                                {p.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-[#111827]">{p.ampScore.toFixed(3)}</td>
                            <td className="p-3 text-[#111827]">{p.micScore.toFixed(3)}</td>
                            <td className="p-3 text-[#111827]">{p.length}</td>
                            <td className="p-3 text-[#111827]">{p.netCharge > 0 ? `+${p.netCharge}` : p.netCharge}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditPeptide({ ...p })}
                                >
                                  <Edit size={13} className="text-[#6B7280]" />
                                </Button>
                                <Dialog open={deleteDialogOpen && deleteTarget === p.id} onOpenChange={(o) => { if (!o) { setDeleteDialogOpen(false); setDeleteTarget(null); } }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => { setDeleteTarget(p.id); setDeleteDialogOpen(true); }}
                                    >
                                      <Trash2 size={13} className="text-[#EF4444]" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>{t('admin.deleteConfirm') as string} #{p.id}?</DialogTitle>
                                      <DialogDescription>
                                        This action cannot be undone. The peptide will be permanently removed from the library.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel') as string}</Button>
                                      <Button variant="destructive" onClick={() => deletePeptide(p.id)}>{t('common.delete') as string}</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredPeptides.length === 0 && (
                      <div className="py-8 text-center text-[#6B7280]">No peptides found.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ─── Tab 2: Task Records ─── */}
          <TabsContent value="tasks" className="mt-4">
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                      <FileText size={18} className="text-[#14B8A6]" />
                      Task Records
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          placeholder={t('common.search') as string}
                          className="pl-8 w-44 bg-[#F9FAFB] border-[#E5E7EB] text-[13px]"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-[13px]">
                        <Download size={14} />
                        Export Logs
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Task ID</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Type</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Status</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide"></th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Started</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Peptides</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t) => (
                          <tr key={t.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-3 font-mono text-[#111827]">#{t.id}</td>
                            <td className="p-3">
                              <span className="flex items-center gap-1.5">
                                <Beaker size={13} className="text-[#14B8A6]" />
                                {t.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-[11px] ${statusBadgeColor(t.status)}`}>
                                {t.status === 'RUNNING' && <Loader2 size={10} className="animate-spin mr-0.5" />}
                                {t.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="w-24">
                                <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                                  <div style={{ width: `${(t.progress / t.total) * 100}%` }} className="h-full bg-[#14B8A6] rounded-full" />
                                </div>
                                <span className="text-[10px] text-[#6B7280] mt-0.5 block">{t.progress}/{t.total}</span>
                              </div>
                            </td>
                            <td className="p-3 text-[#6B7280]">{formatRelativeTime(t.createdAt)}</td>
                            <td className="p-3 text-[#111827]">{t.total}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => rerunTask(t.id)}>
                                  <RotateCcw size={13} className="text-[#6B7280]" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredTasks.length === 0 && (
                      <div className="py-8 text-center text-[#6B7280]">No tasks found.</div>
                    )}
                  </div>

                  {/* Task stats */}
                  <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E5E7EB]">
                    {[
                      { label: 'Total Tasks', value: tasks.length, color: 'text-[#111827]' },
                      { label: 'Succeeded', value: tasks.filter((t) => t.status === 'SUCCEEDED').length, color: 'text-[#10B981]' },
                      { label: 'Running', value: tasks.filter((t) => t.status === 'RUNNING').length, color: 'text-[#F59E0B]' },
                      { label: 'Failed', value: tasks.filter((t) => t.status === 'FAILED').length, color: 'text-[#EF4444]' },
                    ].map((s) => (
                      <div key={s.label} className="bg-[#F9FAFB] rounded-md p-3 text-center">
                        <div className={`text-[20px] font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-[11px] text-[#6B7280] uppercase tracking-wide mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ─── Tab 3: User Submissions ─── */}
          <TabsContent value="submissions" className="mt-4">
            <motion.div
              key="submissions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                    <Users size={18} className="text-[#14B8A6]" />
                    User Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">User</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Submission Type</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Peptide Count</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Parameters</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Status</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Date</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Mode</th>
                          <th className="p-3 text-left font-medium text-[#6B7280] text-[11px] uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEMO_SUBMISSIONS.map((s) => (
                          <tr key={s.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#F0FDFA] flex items-center justify-center text-[11px] font-bold text-[#14B8A6]">
                                  {s.username[0].toUpperCase()}
                                </div>
                                <span className="text-[#111827] font-medium">{s.username}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="flex items-center gap-1.5">
                                <Zap size={13} className="text-[#14B8A6]" />
                                {s.type}
                              </span>
                            </td>
                            <td className="p-3 text-[#111827]">{s.peptideCount}</td>
                            <td className="p-3 text-[#6B7280] max-w-[140px] truncate">{s.params}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-[11px] ${statusBadgeColor(s.status)}`}>
                                {s.status === 'RUNNING' && <Loader2 size={10} className="animate-spin mr-0.5" />}
                                {s.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-[#6B7280]">{formatRelativeTime(s.date)}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={s.mode === 'Server' ? 'bg-[#F0FDFA] text-[#14B8A6] border-[#14B8A6]' : 'bg-gray-50 text-[#6B7280] border-[#9CA3AF]'}>
                                {s.mode}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1" onClick={() => toast.info(`Viewing submission #${s.id} details`)}>
                                <Eye size={12} />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ─── Tab 4: System Configuration ─── */}
          <TabsContent value="config" className="mt-4">
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                    <Settings size={18} className="text-[#14B8A6]" />
                    Platform Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Section A: General */}
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#111827] mb-3">{t('admin.generalSettings') as string}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Platform Name</Label>
                        <Input
                          value={serverConfig.platformName}
                          onChange={(e) => setServerConfig((p) => ({ ...p, platformName: e.target.value }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max Peptides per Batch</Label>
                        <Input
                          type="number"
                          value={serverConfig.maxPeptidesPerBatch}
                          onChange={(e) => setServerConfig((p) => ({ ...p, maxPeptidesPerBatch: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Session Timeout (min)</Label>
                        <Input
                          type="number"
                          value={serverConfig.sessionTimeout}
                          onChange={(e) => setServerConfig((p) => ({ ...p, sessionTimeout: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Default Model</Label>
                        <Select value={serverConfig.defaultModel} onValueChange={(v) => setServerConfig((p) => ({ ...p, defaultModel: v }))}>
                          <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AMPGen-Demo">AMPGen-Demo</SelectItem>
                            <SelectItem value="AMPGen-Large">AMPGen-Large</SelectItem>
                            <SelectItem value="EvoDiff">EvoDiff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#E5E7EB] pt-4">
                    <h3 className="text-[14px] font-semibold text-[#111827] mb-3">{t('admin.filterThresholds') as string}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Min AMP Score</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={thresholds.minAmpScore}
                            onChange={(e) => setThresholds((p) => ({ ...p, minAmpScore: Number(e.target.value) }))}
                            className="flex-1 accent-[#14B8A6]"
                          />
                          <span className="text-[12px] font-mono w-10 text-right">{thresholds.minAmpScore.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max MIC Threshold</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={1}
                            max={256}
                            step={1}
                            value={thresholds.maxMicThreshold}
                            onChange={(e) => setThresholds((p) => ({ ...p, maxMicThreshold: Number(e.target.value) }))}
                            className="flex-1 accent-[#14B8A6]"
                          />
                          <span className="text-[12px] font-mono w-10 text-right">{thresholds.maxMicThreshold}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max Toxicity</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={thresholds.maxToxicity}
                            onChange={(e) => setThresholds((p) => ({ ...p, maxToxicity: Number(e.target.value) }))}
                            className="flex-1 accent-[#14B8A6]"
                          />
                          <span className="text-[12px] font-mono w-10 text-right">{thresholds.maxToxicity.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max Hemolysis</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={thresholds.maxHemolysis}
                            onChange={(e) => setThresholds((p) => ({ ...p, maxHemolysis: Number(e.target.value) }))}
                            className="flex-1 accent-[#14B8A6]"
                          />
                          <span className="text-[12px] font-mono w-10 text-right">{thresholds.maxHemolysis.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Min Length (AA)</Label>
                        <Input
                          type="number"
                          value={thresholds.minLength}
                          onChange={(e) => setThresholds((p) => ({ ...p, minLength: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max Length (AA)</Label>
                        <Input
                          type="number"
                          value={thresholds.maxLength}
                          onChange={(e) => setThresholds((p) => ({ ...p, maxLength: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#E5E7EB] pt-4">
                    <h3 className="text-[14px] font-semibold text-[#111827] mb-3">{t('admin.serverSettings') as string}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Default Server URL</Label>
                        <Input
                          value={serverConfig.defaultServerUrl}
                          onChange={(e) => setServerConfig((p) => ({ ...p, defaultServerUrl: e.target.value }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Max Queue Length</Label>
                        <Input
                          type="number"
                          value={serverConfig.maxQueueLength}
                          onChange={(e) => setServerConfig((p) => ({ ...p, maxQueueLength: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">GPU Timeout (min)</Label>
                        <Input
                          type="number"
                          value={serverConfig.gpuTimeout}
                          onChange={(e) => setServerConfig((p) => ({ ...p, gpuTimeout: Number(e.target.value) }))}
                          className="bg-[#F9FAFB] border-[#E5E7EB]"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-5">
                        <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Auto-retry Failed Jobs</Label>
                        <Switch
                          checked={serverConfig.autoRetryFailed}
                          onCheckedChange={(v) => setServerConfig((p) => ({ ...p, autoRetryFailed: v }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-[#E5E7EB]">
                    <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white gap-1" onClick={saveConfig}>
                      <Save size={16} />
                      {t('admin.saveChanges') as string}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="text-[#EF4444] hover:bg-red-50 gap-1">
                          <ResetIcon size={16} />
                          {t('admin.resetDefaults') as string}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('admin.resetConfirm') as string}</DialogTitle>
                          <DialogDescription>
                            This will revert all configuration values to their system defaults. Your custom settings will be lost.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {}}>{t('common.cancel') as string}</Button>
                          <Button variant="destructive" onClick={resetConfig}>{t('common.confirm') as string}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Peptide Dialog */}
      <Dialog open={!!editPeptide} onOpenChange={() => setEditPeptide(null)}>
        {editPeptide && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Peptide #{editPeptide.id}</DialogTitle>
              <DialogDescription>Modify peptide properties below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Sequence</Label>
                <Input value={editPeptide.sequence} readOnly className="bg-[#F3F4F6] font-mono text-[#14B8A6]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Status</Label>
                <Select
                  value={editPeptide.status}
                  onValueChange={(v) => setEditPeptide((p) => p && { ...p, status: v as typeof p.status })}
                >
                  <SelectTrigger className="bg-[#F9FAFB] border-[#E5E7EB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERATED">GENERATED</SelectItem>
                    <SelectItem value="FILTERED">FILTERED</SelectItem>
                    <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                    <SelectItem value="VALIDATED">VALIDATED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7280] uppercase tracking-wide">Notes</Label>
                <Input
                  value={editPeptide.notes}
                  onChange={(e) => setEditPeptide((p) => p && { ...p, notes: e.target.value })}
                  className="bg-[#F9FAFB] border-[#E5E7EB]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPeptide(null)}>{t('common.cancel') as string}</Button>
              <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white" onClick={handleEditSave}>
                {t('admin.saveChanges') as string}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
