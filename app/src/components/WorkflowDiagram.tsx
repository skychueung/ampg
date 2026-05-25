import { motion } from 'framer-motion'
import {
  Database,
  Dna,
  SlidersHorizontal,
  Search,
  BarChart3,
  Beaker,
  Microscope,
  Check,
  ChevronRight,
} from 'lucide-react'

export type WorkflowNodeState = 'completed' | 'active' | 'pending'

interface WorkflowNode {
  id: string
  label: string
  icon: React.ElementType
  state: WorkflowNodeState
}

interface WorkflowDiagramProps {
  nodes?: WorkflowNode[]
  activeNodeId?: string
}

const defaultNodes: WorkflowNode[] = [
  { id: 'data-input', label: 'Data Input', icon: Database, state: 'completed' },
  { id: 'amp-generation', label: 'AMP Generation', icon: Dna, state: 'active' },
  { id: 'physicochemical', label: 'Physicochemical Filter', icon: SlidersHorizontal, state: 'pending' },
  { id: 'discriminator', label: 'AMP Discriminator', icon: Search, state: 'pending' },
  { id: 'mic-scoring', label: 'MIC Scoring', icon: BarChart3, state: 'pending' },
  { id: 'candidate-lib', label: 'Candidate Library', icon: Beaker, state: 'pending' },
  { id: 'validation', label: 'Experimental Validation', icon: Microscope, state: 'pending' },
]

export default function WorkflowDiagram({ nodes, activeNodeId: _activeNodeId }: WorkflowDiagramProps) {
  const displayNodes = nodes || defaultNodes

  const getNodeClasses = (state: WorkflowNodeState) => {
    switch (state) {
      case 'completed':
        return 'bg-[#F0DFA] border-[#14B8A6] text-[#14B8A6]'
      case 'active':
        return 'bg-white border-[#F59E0B] text-[#D97706] border-2 animate-pulse-glow'
      case 'pending':
        return 'bg-white border-[#E5E7EB] text-[#9CA3AF]'
    }
  }

  const getArrowColor = (index: number) => {
    const currentNode = displayNodes[index]
    const nextNode = displayNodes[index + 1]
    if (currentNode?.state === 'completed' && (nextNode?.state === 'completed' || nextNode?.state === 'active')) {
      return '#14B8A6'
    }
    return '#E5E7EB'
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[8px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-[#14B8A6]" />
        <h2 className="text-[16px] font-semibold text-[#111827]">AMPGen Workflow</h2>
      </div>

      <div className="flex items-center overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max">
          {displayNodes.map((node, index) => (
            <div key={node.id} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-[6px] border text-[12px] font-medium
                  whitespace-nowrap transition-all duration-200
                  ${getNodeClasses(node.state)}
                `}
              >
                <node.icon size={14} />
                <span>{node.label}</span>
                {node.state === 'completed' && <Check size={12} className="ml-0.5" />}
              </motion.div>

              {index < displayNodes.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.05 }}
                  className="mx-1"
                >
                  <ChevronRight size={16} style={{ color: getArrowColor(index) }} />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
