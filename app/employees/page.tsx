'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { User, Department, ROLE_LABELS } from '@/lib/types'
import { useDemoUser } from '@/lib/demo-user'
import Link from 'next/link'

export default function EmployeesPage() {
  const { user: DEMO_USER } = useDemoUser()
  const [employees, setEmployees] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  // New employee form state
  const [form, setForm] = useState({ full_name: '', email: '', department_id: '', role: 'employee' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    Promise.all([
      fetch('/api/users?active=true').then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
    ]).then(([u, d]) => {
      setEmployees(u)
      setDepartments(d)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
    const matchDept = !deptFilter || e.department_id === deptFilter
    return matchSearch && matchDept
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ full_name: '', email: '', department_id: '', role: 'employee' })
      load()
    } else {
      const err = await res.json()
      setFormError(err.error)
    }
    setFormLoading(false)
  }

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    })
    load()
  }

  return (
    <>
      <Nav />
      <PageWrapper
        title="Employees"
        subtitle={`${employees.length} active employee${employees.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <a
              href="/api/export?type=template"
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors"
            >
              Download Template
            </a>
            <Link
              href="/import"
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors"
            >
              Import CSV
            </Link>
            <button
              onClick={() => setShowForm(s => !s)}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
            >
              Add Employee
            </button>
          </div>
        }
      >
        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              placeholder="Full name"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
              className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">No department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {formError && <p className="col-span-full text-[12px] text-red-600">{formError}</p>}
            <div className="col-span-full flex gap-2">
              <button type="submit" disabled={formLoading}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50">
                {formLoading ? 'Adding…' : 'Add Employee'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-right px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                            {emp.full_name.charAt(0)}
                          </div>
                          <span className="text-[13px] font-medium text-gray-900">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500">{emp.email}</td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">
                        {(emp as User & { department?: Department }).department?.name ?? 'None'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                          {ROLE_LABELS[emp.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="text-[12px] text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-gray-400">
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
