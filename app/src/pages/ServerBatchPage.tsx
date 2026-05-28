import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
void useNavigate
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Plus, AlertTriangle, Server,
  CheckCircle, FolderOpen, Eye, X,
} from 'lucide-react'
import { getRuntimeConfig } from '@/api/system'
import type { RuntimeConfig } from '@/api/system'
import {
  createServerBatch,
  listServerBatches,
  getServerBatch,
  getServerBatchPeptides,
  getServerBatchArtifacts,
  cancelServerBatch,
  type ServerBatch,
  type ServerBatchDetail,
  type ServerBatchPeptides,
  type ServerBatchArtifacts,
} from '@/api/serverBatches'
import StatusBadge from '@/components/StatusBadge'

export default function ServerBatchPage() {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null)
  const [batches, setBatches] = useState<ServerBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  void error

  // Create form
  const [batchName, setBatchName] = useState('batch_001')
  const [totalCount, setTotalCount] = useState(12)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Detail modal
  const [detailBatch, setDetailBatch] = useState<ServerBatchDetail | null>(null)
  const [detailPeptides, setDetailPeptides] = useState<ServerBatchPeptides | null>(null)
  const [detailArtifacts, setDetailArtifacts] = useState<ServerBatchArtifacts | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'peptides' | 'artifacts'>('overview')
  const [detailLoading, setDetailLoading] = useState(false)

  const loadBatches = useCallback(async () => {
    try {
      const data = await listServerBatches()
      setBatches(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load batches')
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [config] = await Promise.all([
          getRuntimeConfig().catch(() => null),
          loadBatches(),
        ])
        setRuntimeConfig(config)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadBatches])

  const expectedChunks = Math.ceil(totalCount / (runtimeConfig?.server_batch_chunk_size || 10))

  async function handleCreate() {
    setCreateError(null)
    const maxTotal = runtimeConfig?.server_batch_max_total_count || 50
    if (totalCount > maxTotal) {
      setCreateError(`Total count exceeds batch limit of ${maxTotal}.`)
      return
    }
    if (!runtimeConfig?.server_batch_enabled) {
      setCreateError('Server batch mode is not enabled.')
      return
    }
    setCreating(true)
    try {
      await createServerBatch({
        batch_name: batchName,
        total_count: totalCount,
        backend: 'SERVER_PRODUCTION',
        mode: 'Sequence-based',
      })
      setBatchName(`batch_${String(batches.length + 1).padStart(3, '0')}`)
      await loadBatches()
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create batch')
    } finally {
      setCreating(false)
    }
  }

  async function openDetail(batchId: number) {
    setDetailBatch(null)
    setDetailPeptides(null)
    setDetailArtifacts(null)
    setDetailTab('overview')
    setDetailLoading(true)
    try {
      const [detail, peptides, artifacts] = await Promise.all([
        getServerBatch(batchId),
        getServerBatchPeptides(batchId).catch(() => null),
        getServerBatchArtifacts(batchId).catch(() => null),
      ])
      setDetailBatch(detail)
      setDetailPeptides(peptides)
      setDetailArtifacts(artifacts)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCancel(batchId: number) {
    try {
      await cancelServerBatch(batchId)
      await loadBatches()
      if (detailBatch?.id === batchId) {
        openDetail(batchId)
      }
    } catch (e: any) {
      setError(e.message || 'Cancel failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#F0FDFA] flex items-center justify-center">
            <Layers size={20} className="text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#111827]">Server Batches</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">
              Chunked server production generation for counts exceeding single-run limits.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="p-4 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] space-y-2"
      >
        <div className="flex items-center gap-2">
          <Server size={16} className="text-[#D97706]" />
          <span className="text-[14px] font-medium text-[#92400E]">Server Batch Mode</span>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            runtimeConfig?.server_batch_enabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {runtimeConfig?.server_batch_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {runtimeConfig?.server_batch_enabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[13px] text-[#78350F]">
            <div><span className="text-[#B45309]">Max total:</span> {runtimeConfig.server_batch_max_total_count}</div>
            <div><span className="text-[#B45309]">Chunk size:</span> {runtimeConfig.server_batch_chunk_size}</div>
            <div><span className="text-[#B45309]">Concurrency:</span> {runtimeConfig.server_batch_max_concurrency}</div>
            <div><span className="text-[#B45309]">Device:</span> {runtimeConfig.server_production_device}</div>
          </div>
        )}
        <p className="text-[12px] text-[#B45309]">
          Batch mode splits large requests into chunks and executes them sequentially on GPU. AMP score and MIC are not computed.
        </p>
      </motion.div>

      {/* Create Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <Plus size={16} className="text-[#14B8A6]" />
          Create Batch
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">Batch Name</label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1.5">
              Total Count (max {runtimeConfig?.server_batch_max_total_count || 50})
            </label>
            <input
              type="number"
              min={1}
              max={runtimeConfig?.server_batch_max_total_count || 50}
              value={totalCount}
              onChange={(e) => setTotalCount(Number(e.target.value))}
              className="w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 text-[14px] text-[#111827] focus:outline-none focus:border-[#14B8A6]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !runtimeConfig?.server_batch_enabled}
              className="h-[36px] px-4 bg-[#14B8A6] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0D9488] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Batch'}
            </button>
            <span className="text-[13px] text-[#6B7280]">
              ≈ {expectedChunks} chunk{expectedChunks > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {createError && (
          <div className="mt-3 p-2.5 rounded-[6px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#B91C1C] flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {createError}
          </div>
        )}
      </motion.div>

      {/* Batch List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white border border-[#E5E7EB] rounded-[8px] p-5"
      >
        <h2 className="text-[16px] font-semibold text-[#111827] mb-4 flex items-center gap-2">
          <Layers size={16} className="text-[#14B8A6]" />
          Batch History
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#6B7280] mt-2">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <p className="text-[13px] text-[#6B7280] py-4">No batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                  <th className="text-left px-3 py-2.5">ID</th>
                  <th className="text-left px-3 py-2.5">Name</th>
                  <th className="text-left px-3 py-2.5">Total</th>
                  <th className="text-left px-3 py-2.5">Chunks</th>
                  <th className="text-left px-3 py-2.5">Progress</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-left px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                    <td className="px-3 py-2.5 text-[13px] font-mono text-[#111827]">#{b.id}</td>
                    <td className="px-3 py-2.5 text-[13px] text-[#111827]">{b.batch_name}</td>
                    <td className="px-3 py-2.5 text-[13px] text-[#111827]">{b.total_count}</td>
                    <td className="px-3 py-2.5 text-[13px] text-[#111827]">{b.completed_chunks}/{b.total_chunks}</td>
                    <td className="px-3 py-2.5">
                      <div className="w-[100px] h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#14B8A6] rounded-full"
                          style={{ width: `${b.total_chunks > 0 ? (b.completed_chunks / b.total_chunks) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={b.status as any} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetail(b.id)}
                          className="p-1.5 rounded-[6px] text-[#6B7280] hover:bg-[#F3F4F6]"
                          title="View Detail"
                        >
                          <Eye size={14} />
                        </button>
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="p-1.5 rounded-[6px] text-[#B91C1C] hover:bg-[#FEF2F2]"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setDetailBatch(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[8px] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#14B8A6]" />
                  <h2 className="text-[16px] font-semibold text-[#111827]">
                    Batch #{detailBatch.id} — {detailBatch.batch_name}
                  </h2>
                  <StatusBadge status={detailBatch.status as any} />
                </div>
                <button onClick={() => setDetailBatch(null)} className="p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] rounded-[6px]">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 border-b border-[#E5E7EB] flex gap-1">
                {(['overview', 'peptides', 'artifacts'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                      detailTab === tab
                        ? 'border-[#14B8A6] text-[#14B8A6]'
                        : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh]">
                {detailLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : detailTab === 'overview' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                      <div><span className="text-[#6B7280]">Total Count</span> <span className="block font-medium">{detailBatch.total_count}</span></div>
                      <div><span className="text-[#6B7280]">Chunk Size</span> <span className="block font-medium">{detailBatch.chunk_size}</span></div>
                      <div><span className="text-[#6B7280]">Total Chunks</span> <span className="block font-medium">{detailBatch.total_chunks}</span></div>
                      <div><span className="text-[#6B7280]">Completed</span> <span className="block font-medium">{detailBatch.completed_chunks}</span></div>
                      <div><span className="text-[#6B7280]">Failed</span> <span className="block font-medium">{detailBatch.failed_chunks}</span></div>
                      <div><span className="text-[#6B7280]">Mode</span> <span className="block font-medium">{detailBatch.mode || '—'}</span></div>
                      <div><span className="text-[#6B7280]">Device</span> <span className="block font-medium">cuda:1</span></div>
                      <div><span className="text-[#6B7280]">Scores</span> <span className="block text-[#9CA3AF]">Not computed</span></div>
                    </div>

                    {/* Chunk table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                            <th className="text-left px-3 py-2">Chunk</th>
                            <th className="text-left px-3 py-2">Run ID</th>
                            <th className="text-left px-3 py-2">Requested</th>
                            <th className="text-left px-3 py-2">Generated</th>
                            <th className="text-left px-3 py-2">Status</th>
                            <th className="text-left px-3 py-2">Artifact Dir</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBatch.items.map((item) => (
                            <tr key={item.id} className="border-b border-[#E5E7EB]">
                              <td className="px-3 py-2 text-[13px]">#{item.chunk_index}</td>
                              <td className="px-3 py-2 text-[13px] font-mono">{item.generation_run_id ?? '—'}</td>
                              <td className="px-3 py-2 text-[13px]">{item.requested_count}</td>
                              <td className="px-3 py-2 text-[13px]">{item.generated_count}</td>
                              <td className="px-3 py-2">
                                <StatusBadge status={item.status as any} />
                              </td>
                              <td className="px-3 py-2 text-[11px] font-mono text-[#6B7280] truncate max-w-[200px]">
                                {item.artifact_dir ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : detailTab === 'peptides' ? (
                  <div>
                    {detailPeptides ? (
                      <div className="space-y-3">
                        <p className="text-[13px] text-[#6B7280]">Total peptides: {detailPeptides.total_peptides}</p>
                        {detailPeptides.peptides.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] uppercase tracking-[0.05em]">
                                  <th className="text-left px-3 py-2">Sequence</th>
                                  <th className="text-left px-3 py-2">Length</th>
                                  <th className="text-left px-3 py-2">Net Charge</th>
                                  <th className="text-left px-3 py-2">Source</th>
                                  <th className="text-left px-3 py-2">AMP Score</th>
                                  <th className="text-left px-3 py-2">MIC E.coli</th>
                                  <th className="text-left px-3 py-2">MIC S.aureus</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailPeptides.peptides.map((p: any, idx: number) => (
                                  <tr key={idx} className="border-b border-[#E5E7EB]">
                                    <td className="px-3 py-2 text-[13px] font-mono text-[#14B8A6]">{p.sequence}</td>
                                    <td className="px-3 py-2 text-[13px]">{p.length}</td>
                                    <td className="px-3 py-2 text-[13px]">{p.net_charge}</td>
                                    <td className="px-3 py-2 text-[12px] text-[#6B7280]">{p.source}</td>
                                    <td className="px-3 py-2 text-[12px] text-[#9CA3AF]">Not computed</td>
                                    <td className="px-3 py-2 text-[12px] text-[#9CA3AF]">Not computed</td>
                                    <td className="px-3 py-2 text-[12px] text-[#9CA3AF]">Not computed</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[13px] text-[#6B7280]">No peptides yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#6B7280]">No peptide data.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    {detailArtifacts ? (
                      <div className="space-y-3">
                        {detailArtifacts.chunks.map((chunk: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-[6px] bg-[#F9FAFB] border border-[#E5E7EB]">
                            <div className="flex items-center gap-2 mb-2">
                              <FolderOpen size={14} className="text-[#6B7280]" />
                              <span className="text-[13px] font-medium">Chunk #{chunk.chunk_index}</span>
                              <StatusBadge status={chunk.status as any} />
                            </div>
                            <p className="text-[11px] font-mono text-[#6B7280] mb-2">{chunk.artifact_dir || '—'}</p>
                            {chunk.files && chunk.files.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {chunk.files.map((f: any) => (
                                  <span key={f.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                                    <CheckCircle size={10} />
                                    {f.name} ({f.size_kb} KB)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#6B7280]">No artifact data.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scientific Boundary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="p-4 rounded-[8px] bg-[#F0FDFA] border border-[#14B8A6]"
      >
        <p className="text-[12px] text-[#0F766E] flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <strong>Scientific Boundary:</strong> Batch generation produces sequences only. AMP score and MIC are not computed.
          All results require experimental validation before therapeutic use.
        </p>
      </motion.div>
    </div>
  )
}
