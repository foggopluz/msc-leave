'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import ApprovalTable from '@/components/ApprovalTable'
import StatusBadge from '@/components/StatusBadge'
import { LeaveRequest, LEAVE_TYPE_LABELS } from '@/lib/types'
import { getApprovalStageForRole, canApprove } from '@/lib/permissions'
import { useDemoUser } from '@/lib/demo-user'

export default function ApprovalsPage() {
  const { user } = useDemoUser()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [history, setHistory] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const stage = getApprovalStageForRole(user.role)

  const loadRequests = () => {
    // Managers only see their department's requests; HR/GM see all
    const deptParam = user.role === 'manager' && user.department_id
      ? `&department_id=${user.department_id}`
      : ''

    Promise.all([
      fetch(`/api/leave-requests?status=pending${deptParam}`).then(r => r.json()),
      fetch(`/api/leave-requests?${deptParam}`).then(r => r.json()),
    ]).then(([pending, all]) => {
      setRequests(pending)
      setHistory((all as LeaveRequest[]).filter(r => r.status !== 'pending'))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadRequests() }, [user.id])

  const handleApprove = async (id: string, comment: string) => {
    if (!stage) return
    await fetch(`/api/leave-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver_id: user.id, stage, comment }),
    })
    loadRequests()
  }

  const handleReject = async (id: string, comment: string) => {
    if (!stage) return
    await fetch(`/api/leave-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver_id: user.id, stage, comment }),
    })
    loadRequests()
  }

  if (!canApprove(user.role)) {
    return (
      <>
        <Nav />
        <PageWrapper title="Approvals" subtitle="Approval queue">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-[13px] text-gray-400">Your role does not have approval access.</p>
          </div>
        </PageWrapper>
      </>
    )
  }

  return (
    <>
      <Nav />
      <PageWrapper
        title="Approvals"
        subtitle={`Acting as ${user.role.toUpperCase()} — ${stage ? `Approving at ${stage} stage` : 'No approval stage'}`}
      >
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {(['pending', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'History'}
              {t === 'pending' && requests.filter(r => r.current_stage === stage).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">
                  {requests.filter(r => r.current_stage === stage).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : tab === 'pending' ? (
          stage ? (
            <ApprovalTable
              requests={requests}
              approverId={user.id}
              stage={stage}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-[13px] text-gray-400">Your role does not have an approval stage.</p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {history.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-gray-400">No completed requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dates</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(r => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="px-5 py-3.5 text-[13px] font-medium text-gray-900">
                          {(r as LeaveRequest & { user?: { full_name: string } }).user?.full_name ?? r.user_id}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">{LEAVE_TYPE_LABELS[r.leave_type]}</td>
                        <td className="px-5 py-3.5 text-[12px] text-gray-600">{r.start_date} – {r.end_date}</td>
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{r.days_requested}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
