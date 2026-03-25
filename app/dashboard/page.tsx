'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import StatCard from '@/components/StatCard'
import PageWrapper from '@/components/PageWrapper'
import StatusBadge from '@/components/StatusBadge'
import { DashboardStats, LEAVE_TYPE_LABELS } from '@/lib/types'
import Link from 'next/link'

// Demo: use u2 (manager) as current user
const DEMO_USER = { id: 'u2', name: 'Bob Kimani', role: 'manager' as const }

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <Nav userRole={DEMO_USER.role} userName={DEMO_USER.name} />
      <PageWrapper
        title="Dashboard"
        subtitle="Leave management overview"
        action={
          <Link
            href="/leave"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
          >
            Apply for Leave
          </Link>
        }
      >
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Employees"
                value={stats.total_employees}
                accent="gray"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a4 4 0 118 0m-8 0a4 4 0 008 0" />
                  </svg>
                }
              />
              <StatCard
                label="On Duty Today"
                value={stats.on_duty_today}
                accent="green"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="On Leave Today"
                value={stats.on_leave_today}
                accent="orange"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Pending Approvals"
                value={stats.pending_approvals}
                accent={stats.pending_approvals > 0 ? 'blue' : 'gray'}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Departments overview */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-[13px] font-semibold text-gray-900">Departments</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.departments.map(d => (
                    <div key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">{d.name}</p>
                        <p className="text-[11px] text-gray-400">{d.total} employee{d.total !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[12px]">
                        <span className="text-green-600 font-medium">{d.on_duty} on duty</span>
                        {d.on_leave > 0 && (
                          <span className="text-orange-500 font-medium">{d.on_leave} on leave</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {stats.departments.length === 0 && (
                    <p className="px-5 py-4 text-[13px] text-gray-400">No departments configured</p>
                  )}
                </div>
              </div>

              {/* Upcoming leaves */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-[13px] font-semibold text-gray-900">Upcoming Leaves</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Next 14 days</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.upcoming_leaves.length === 0 ? (
                    <p className="px-5 py-4 text-[13px] text-gray-400">No upcoming leaves</p>
                  ) : (
                    stats.upcoming_leaves.map(r => (
                      <div key={r.id} className="px-5 py-3.5">
                        <p className="text-[13px] font-medium text-gray-900">{(r as LeaveRequest & { user?: { full_name: string } }).user?.full_name ?? r.user_id}</p>
                        <p className="text-[11px] text-gray-500">{LEAVE_TYPE_LABELS[r.leave_type]}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{r.start_date} – {r.end_date}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-gray-400">Failed to load dashboard data.</p>
        )}
      </PageWrapper>

      {/* Footer */}
      <footer className="text-center py-6 text-[11px] text-gray-300">
        MSC-Leaves © Daniel B Shayo
      </footer>
    </>
  )
}

// Type alias needed for the template literal above
type LeaveRequest = import('@/lib/types').LeaveRequest
