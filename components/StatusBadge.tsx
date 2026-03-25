import { LeaveStatus, ApprovalStage, STAGE_LABELS } from '@/lib/types'

interface StatusBadgeProps {
  status: LeaveStatus
  stage?: ApprovalStage | null
}

const statusStyles: Record<LeaveStatus, string> = {
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  approved:  'bg-green-50 text-green-700 border border-green-200',
  rejected:  'bg-red-50 text-red-700 border border-red-200',
  cancelled: 'bg-gray-50 text-gray-500 border border-gray-200',
}

export default function StatusBadge({ status, stage }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[status]}`}>
      {status === 'pending' && stage
        ? `Awaiting ${STAGE_LABELS[stage]}`
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
