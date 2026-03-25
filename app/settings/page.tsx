'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { Department, PublicHoliday, ROLE_LABELS, User } from '@/lib/types'

const DEMO_USER = { id: 'u5', name: 'Eve Banda', role: 'gm' as const }

export default function SettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [tab, setTab] = useState<'departments' | 'holidays' | 'accrual'>('departments')

  // Department form
  const [deptName, setDeptName] = useState('')
  const [deptApprover, setDeptApprover] = useState('')
  const [deptLoading, setDeptLoading] = useState(false)

  // Holiday form
  const [holDate, setHolDate] = useState('')
  const [holName, setHolName] = useState('')
  const [holLoading, setHolLoading] = useState(false)

  // Accrual
  const [accrualJob, setAccrualJob] = useState('work_cycle_accrual')
  const [accrualLoading, setAccrualLoading] = useState(false)
  const [accrualResult, setAccrualResult] = useState('')

  const load = () => {
    Promise.all([
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/users?active=true').then(r => r.json()),
      fetch('/api/public-holidays').then(r => r.json()),
    ]).then(([d, u, h]) => {
      setDepartments(d)
      setEmployees(u)
      setHolidays(h)
    })
  }

  useEffect(() => { load() }, [])

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeptLoading(true)
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: deptName, approver_id: deptApprover || null }),
    })
    setDeptName('')
    setDeptApprover('')
    setDeptLoading(false)
    load()
  }

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    setHolLoading(true)
    await fetch('/api/public-holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: holDate, name: holName }),
    })
    setHolDate('')
    setHolName('')
    setHolLoading(false)
    load()
  }

  const runAccrual = async () => {
    setAccrualLoading(true)
    setAccrualResult('')
    const res = await fetch('/api/accrual/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: accrualJob }),
    })
    const data = await res.json()
    setAccrualResult(data.results?.join('\n') ?? data.error)
    setAccrualLoading(false)
  }

  const tabs = [
    { key: 'departments', label: 'Departments' },
    { key: 'holidays', label: 'Public Holidays' },
    { key: 'accrual', label: 'Accrual Jobs' },
  ] as const

  return (
    <>
      <Nav userRole={DEMO_USER.role} userName={DEMO_USER.name} />
      <PageWrapper title="Settings" subtitle="System configuration — General Manager only">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Departments tab */}
        {tab === 'departments' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Add dept */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-4">Add Department</h3>
              <form onSubmit={addDept} className="space-y-3">
                <input
                  placeholder="Department name"
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <select
                  value={deptApprover}
                  onChange={e => setDeptApprover(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                >
                  <option value="">No designated approver</option>
                  {employees.filter(u => ['manager', 'hr', 'gm'].includes(u.role)).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role]})</option>
                  ))}
                </select>
                <button type="submit" disabled={deptLoading}
                  className="w-full py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50">
                  {deptLoading ? 'Adding…' : 'Add Department'}
                </button>
              </form>
            </div>

            {/* Dept list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-gray-900">Departments ({departments.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {departments.map(d => (
                  <div key={d.id} className="px-5 py-3.5 flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{d.name}</p>
                      <p className="text-[11px] text-gray-400">
                        Approver: {(d as Department & { approver?: User }).approver?.full_name ?? 'None'} · {(d as Department & { employee_count?: number }).employee_count ?? 0} employees
                      </p>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="px-5 py-4 text-[13px] text-gray-400">No departments yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Holidays tab */}
        {tab === 'holidays' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Add holiday */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-4">Add Public Holiday</h3>
              <form onSubmit={addHoliday} className="space-y-3">
                <input
                  type="date"
                  value={holDate}
                  onChange={e => setHolDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <input
                  placeholder="Holiday name"
                  value={holName}
                  onChange={e => setHolName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="submit" disabled={holLoading}
                  className="w-full py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50">
                  {holLoading ? 'Adding…' : 'Add Holiday'}
                </button>
              </form>
            </div>

            {/* Holiday list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-gray-900">{new Date().getFullYear()} Holidays</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {holidays.map(h => (
                  <div key={h.id} className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[13px] text-gray-900">{h.name}</span>
                    <span className="text-[12px] text-gray-400">{h.date}</span>
                  </div>
                ))}
                {holidays.length === 0 && (
                  <p className="px-5 py-4 text-[13px] text-gray-400">No holidays configured</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Accrual tab */}
        {tab === 'accrual' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-1">Run Accrual Job</h3>
              <p className="text-[12px] text-gray-500 mb-4">Manually trigger an automated leave job.</p>

              <div className="space-y-3">
                <select
                  value={accrualJob}
                  onChange={e => setAccrualJob(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                >
                  <option value="work_cycle_accrual">Work Cycle Accrual (+1.5 days/week)</option>
                  <option value="public_holiday_credit">Public Holiday Credit (+1 day if holiday today)</option>
                  <option value="reset_sick_leave">Reset Sick Leave (3-year cycle)</option>
                  <option value="reset_compassionate_leave">Reset Compassionate Leave (12-month cycle)</option>
                </select>

                <button
                  onClick={runAccrual}
                  disabled={accrualLoading}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {accrualLoading ? 'Running…' : 'Run Job'}
                </button>

                {accrualResult && (
                  <div className="bg-green-50 rounded-xl px-4 py-3">
                    <pre className="text-[12px] text-green-700 whitespace-pre-wrap">{accrualResult}</pre>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[12px] text-amber-700">
                <strong>Production note:</strong> In production, these jobs should run automatically via scheduled tasks (Supabase Edge Functions + cron, or a job scheduler). This panel is for manual overrides.
              </p>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  )
}
