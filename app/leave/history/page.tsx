'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import StatusBadge from '@/components/StatusBadge'
import { LeaveRequest, LEAVE_TYPE_LABELS } from '@/lib/types'
import Link from 'next/link'

const DEMO_USER = { id: 'u1', name: 'Alice Mwangi', role: 'employee' as const }

export default function LeaveHistoryPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/leave-requests?user_id=${DEMO_USER.id}`)
      .then(r => r.json())
      .then(data => { setRequests(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/leave-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', current_stage: null } : r))
    }
  }

  return (
    <>
      <Nav userRole={DEMO_USER.role} userName={DEMO_USER.name} />
      <PageWrapper
        title="Leave History"
        subtitle="All your leave requests"
        action={
          <Link
            href="/leave"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
          >
            New Request
          </Link>
        }
      >
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-gray-400">No leave requests yet.</p>
              <Link href="/leave" className="text-[13px] text-blue-600 hover:underline mt-2 inline-block">
                Apply for leave
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dates</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Days</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 text-[13px] text-gray-900">{LEAVE_TYPE_LABELS[r.leave_type]}</td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-600">{r.start_date} – {r.end_date}</td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{r.days_requested}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status} stage={r.current_stage ?? undefined} />
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="text-[12px] text-red-500 hover:text-red-700 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
