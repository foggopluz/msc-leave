'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { User, Department, AuditLog, ROLE_LABELS, Role } from '@/lib/types'
import { useDemoUser } from '@/lib/demo-user'

const ALL_ROLES: Role[] = ['employee', 'manager', 'hr', 'gm', 'viewer', 'admin']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminPage() {
  const { user: adminUser } = useDemoUser()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [tab, setTab] = useState<'users' | 'audit'>('users')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // New user form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', department_id: '', role: 'employee' as Role, joining_date: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Edit user
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [editLoading, setEditLoading] = useState(false)

  // Balance override
  const [balanceUser, setBalanceUser] = useState<string | null>(null)
  const [balanceType, setBalanceType] = useState('annual')
  const [balanceValue, setBalanceValue] = useState('')

  // Redirect non-admins
  useEffect(() => {
    if (adminUser.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [adminUser.role, router])

  const load = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)

    Promise.all([
      fetch(`/api/admin/users?${params}`).then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
      fetch(`/api/admin/audit?admin_id=${adminUser.id}&limit=50`).then(r => r.json()),
    ]).then(([u, d, a]) => {
      setUsers(Array.isArray(u) ? u : [])
      setDepartments(Array.isArray(d) ? d : [])
      setAuditLogs(Array.isArray(a) ? a : [])
      setLoading(false)
    })
  }

  useEffect(() => {
    if (adminUser.role === 'admin') load()
  }, [adminUser.id, search, roleFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminUser.id, ...form }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ full_name: '', email: '', department_id: '', role: 'employee', joining_date: '' })
      load()
    } else {
      const err = await res.json()
      setFormError(err.error)
    }
    setFormLoading(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditLoading(true)
    await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminUser.id, ...editForm }),
    })
    setEditUser(null)
    setEditForm({})
    setEditLoading(false)
    load()
  }

  const handleToggleActive = async (u: User) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminUser.id, is_active: !u.is_active }),
    })
    load()
  }

  const handleOverrideBalance = async () => {
    if (!balanceUser || !balanceValue) return
    await fetch('/api/admin/balance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminUser.id,
        user_id: balanceUser,
        leave_type: balanceType,
        new_balance: parseFloat(balanceValue),
      }),
    })
    setBalanceUser(null)
    setBalanceValue('')
    load()
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    byRole: ALL_ROLES.map(r => ({ role: r, count: users.filter(u => u.role === r).length })).filter(x => x.count > 0),
  }

  if (adminUser.role !== 'admin') return null

  return (
    <>
      <Nav />
      <PageWrapper
        title="Admin Zone"
        subtitle="Full system authority — restricted to Admin only"
        action={
          tab === 'users' ? (
            <button
              onClick={() => setShowForm(s => !s)}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors"
            >
              + New User
            </button>
          ) : undefined
        }
      >
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Users</p>
            <p className="text-[22px] font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Active</p>
            <p className="text-[22px] font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Inactive</p>
            <p className="text-[22px] font-bold text-gray-400">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Roles</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {stats.byRole.map(r => (
                <span key={r.role} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {ROLE_LABELS[r.role]} ×{r.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {(['users', 'audit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'users' ? 'User Management' : 'Audit Log'}
            </button>
          ))}
        </div>

        {/* ── USER MANAGEMENT ───────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Create form */}
            {showForm && (
              <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
                <h3 className="col-span-full text-[13px] font-semibold text-gray-900">Create New User</h3>
                <input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <input
                  type="date"
                  placeholder="Joining date"
                  value={form.joining_date}
                  onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))}
                  required
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <select
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                >
                  <option value="">No department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                >
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                {formError && <p className="col-span-full text-[12px] text-red-600">{formError}</p>}
                <div className="col-span-full flex gap-2">
                  <button type="submit" disabled={formLoading}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 disabled:opacity-50">
                    {formLoading ? 'Creating…' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Filters */}
            <div className="flex gap-3">
              <input
                placeholder="Search name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white text-gray-700 focus:outline-none"
              >
                <option value="">All Roles</option>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>

            {/* Edit modal */}
            {editUser && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form onSubmit={handleEdit} className="bg-white rounded-2xl border border-gray-100 p-6 w-full max-w-md space-y-3 shadow-xl">
                  <h3 className="text-[14px] font-semibold text-gray-900">Edit User — {editUser.full_name}</h3>
                  <input
                    placeholder="Full name"
                    defaultValue={editUser.full_name}
                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    defaultValue={editUser.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <input
                    type="date"
                    defaultValue={editUser.joining_date}
                    onChange={e => setEditForm(f => ({ ...f, joining_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <select
                    defaultValue={editUser.department_id ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                  >
                    <option value="">No department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select
                    defaultValue={editUser.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none"
                  >
                    {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>

                  {/* Balance override section */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-[12px] font-semibold text-gray-700 mb-2">Override Leave Balance</p>
                    <div className="flex gap-2">
                      <select
                        value={balanceType}
                        onChange={e => setBalanceType(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none"
                      >
                        <option value="work_cycle">Work Cycle</option>
                        <option value="annual">Annual Leave</option>
                        <option value="public_holiday">Public Holiday</option>
                        <option value="sick_full">Sick (Full)</option>
                        <option value="sick_half">Sick (Half)</option>
                        <option value="compassionate">Compassionate</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Days"
                        value={balanceValue}
                        onChange={e => setBalanceValue(e.target.value)}
                        className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-[12px] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setBalanceUser(editUser.id); handleOverrideBalance() }}
                        className="px-3 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-medium hover:bg-amber-600"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={editLoading}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 disabled:opacity-50">
                      {editLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => { setEditUser(null); setEditForm({}) }}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* User table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">User</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Joining Date</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-right px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!u.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full text-[11px] font-semibold flex items-center justify-center flex-shrink-0 ${
                                u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {u.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[13px] font-medium text-gray-900">{u.full_name}</p>
                                <p className="text-[11px] text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {ROLE_LABELS[u.role]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-gray-700">
                            {(u as User & { department?: { name: string } }).department?.name ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-gray-500">
                            {u.joining_date ?? '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditUser(u); setEditForm({}) }}
                                className="text-[12px] text-blue-500 hover:text-blue-700 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleActive(u)}
                                disabled={u.id === adminUser.id}
                                className={`text-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed ${
                                  u.is_active ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'
                                }`}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-gray-400">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ─────────────────────────────────────────────────────── */}
        {tab === 'audit' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[14px] font-medium text-gray-900 mb-1">No admin actions yet</p>
                <p className="text-[13px] text-gray-400">All admin actions will appear here with full details.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {auditLogs.map(log => (
                  <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5">
                      {(log.admin as User | undefined)?.full_name?.charAt(0) ?? 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-900">
                        <span className="font-medium">{(log.admin as User | undefined)?.full_name ?? 'Admin'}</span>
                        {' '}<span className="text-gray-500">{log.action.replace(/_/g, ' ')}</span>
                        {log.target_user && (
                          <>{' → '}<span className="font-medium">{(log.target_user as User | undefined)?.full_name}</span></>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security notice */}
        <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-[12px] text-red-700">
            <strong>Security:</strong> All actions in this zone are logged and audited. Privilege escalation is prevented —
            admin accounts cannot modify other admin accounts. In production, enforce multi-factor authentication for Admin access.
          </p>
        </div>
      </PageWrapper>
    </>
  )
}
