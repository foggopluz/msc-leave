'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import LeaveForm from '@/components/LeaveForm'
import BalanceCard from '@/components/BalanceCard'
import { LeaveBalance } from '@/lib/types'
import { useDemoUser } from '@/lib/demo-user'

export default function LeavePage() {
  const { user } = useDemoUser()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  const loadBalances = () => {
    fetch(`/api/leave-balances?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => { setBalances(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadBalances() }, [user.id])

  const handleSubmit = async (data: {
    user_id: string; leave_type: import('@/lib/types').LeaveType
    start_date: string; end_date: string; notes: string; days_requested: number
  }) => {
    const res = await fetch('/api/leave-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Submission failed')
    }
    loadBalances()
  }

  return (
    <>
      <Nav />
      <PageWrapper
        title="Apply for Leave"
        subtitle={`Submitting as ${user.name}`}
        action={
          <a
            href="/leave/history"
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors"
          >
            View History
          </a>
        }
      >
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-[14px] font-semibold text-gray-900 mb-4">New Request</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <LeaveForm
                userId={user.id}
                balances={balances}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          <div>
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 h-48 animate-pulse" />
            ) : (
              <BalanceCard balances={balances} />
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
