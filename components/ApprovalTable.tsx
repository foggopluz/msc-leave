'use client'

import { useState } from 'react'
import { LeaveRequest, ApprovalStage, LEAVE_TYPE_LABELS } from '@/lib/types'
import StatusBadge from './StatusBadge'

interface ApprovalTableProps {
  requests: LeaveRequest[]
  approverId: string
  stage: ApprovalStage
  onApprove?: (id: string, comment: string) => Promise<void>
  onReject?: (id: string, comment: string) => Promise<void>
}

export default function ApprovalTable({
  requests, approverId, stage, onApprove, onReject
}: ApprovalTableProps) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const pending = requests.filter(r => r.status === 'pending' && r.current_stage === stage)

  const act = async (id: string, type: 'approve' | 'reject') => {
    setLoading(id)
    try {
      if (type === 'approve') await onApprove?.(id, comment)
      else await onReject?.(id, comment)
      setActionId(null)
      setComment('')
    } finally {
      setLoading(null)
    }
  }

  if (pending.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-[13px] text-gray-400">No pending approvals</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dates</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Days</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(r => (
              <>
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{r.user?.full_name ?? r.user_id}</p>
                      <p className="text-[11px] text-gray-400">{r.user?.department?.name ?? ''}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">{LEAVE_TYPE_LABELS[r.leave_type]}</td>
                  <td className="px-5 py-3.5 text-[12px] text-gray-600">
                    {r.start_date} – {r.end_date}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{r.days_requested}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={r.status} stage={r.current_stage ?? undefined} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {actionId === r.id ? (
                      <button
                        onClick={() => { setActionId(null); setComment('') }}
                        className="text-[12px] text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setActionId(r.id)}
                        className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>

                {actionId === r.id && (
                  <tr key={`${r.id}-action`} className="bg-gray-50">
                    <td colSpan={6} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="Add a comment (optional)"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                          onClick={() => act(r.id, 'approve')}
                          disabled={loading === r.id}
                          className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {loading === r.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => act(r.id, 'reject')}
                          disabled={loading === r.id}
                          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          {loading === r.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
