'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import LeaveForm from '@/components/LeaveForm'
import BalanceCard from '@/components/BalanceCard'
import { LeaveBalance } from '@/lib/types'

const DEMO_USER = { id: 'u1', name: 'Alice Mwangi', role: 'employee' as const }

export default function LeavePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  const loadBalances = () => {
    fetch(`/api/leave-balances?user_id=${DEMO_USER.id}`)
      .then(r => r.json())
      .then(data => { setBalances(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadBalances() }, [])

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
    loadBalances() // refresh balances after submission
  }

  return (
    <>
      <Nav userRole={DEMO_USER.role} userName={DEMO_USER.name} />
      <PageWrapper
        title="Apply for Leave"
        subtitle="Submit a new leave request"
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
          {/* Form */}
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
                userId={DEMO_USER.id}
                balances={balances}
                onSubmit={handleSubmit}
              />
            )}
          </div>

          {/* Balances */}
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
