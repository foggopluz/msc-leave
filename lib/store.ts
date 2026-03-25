/**
 * In-memory demo store: used when Supabase env vars are not set.
 * Lets the app run fully without a database for local demos.
 */
import {
  User, Department, LeaveRequest, LeaveBalance,
  ApprovalLog, PublicHoliday, Notification, AuditLog,
  LeaveStatus, ApprovalStage, AdminAction,
} from './types'
import { getInitialBalances } from './accrual'
import { nextStage } from './permissions'

// ── Seed data ────────────────────────────────────────────────────────────────

export const departments: Department[] = [
  { id: 'd1', name: 'Engineering', approver_id: 'u2', created_at: '2026-01-01T00:00:00Z' },
  { id: 'd2', name: 'Finance', approver_id: 'u3', created_at: '2026-01-01T00:00:00Z' },
  { id: 'd3', name: 'Operations', approver_id: 'u4', created_at: '2026-01-01T00:00:00Z' },
]

export const users: User[] = [
  { id: 'u1', email: 'alice@naenda.co.tz', full_name: 'Alice Mwangi', department_id: 'd1', role: 'employee', is_active: true, joining_date: '2024-01-15', created_at: '2024-01-15T00:00:00Z' },
  { id: 'u2', email: 'bob@naenda.co.tz', full_name: 'Bob Kimani', department_id: 'd1', role: 'manager', is_active: true, joining_date: '2023-06-01', created_at: '2023-06-01T00:00:00Z' },
  { id: 'u3', email: 'carol@naenda.co.tz', full_name: 'Carol Njeri', department_id: 'd2', role: 'hr', is_active: true, joining_date: '2023-03-01', created_at: '2023-03-01T00:00:00Z' },
  { id: 'u4', email: 'david@naenda.co.tz', full_name: 'David Osei', department_id: 'd3', role: 'manager', is_active: true, joining_date: '2023-08-15', created_at: '2023-08-15T00:00:00Z' },
  { id: 'u5', email: 'eve@naenda.co.tz', full_name: 'Eve Banda', department_id: null, role: 'gm', is_active: true, joining_date: '2022-01-01', created_at: '2022-01-01T00:00:00Z' },
  { id: 'u6', email: 'frank@naenda.co.tz', full_name: 'Frank Mutiso', department_id: null, role: 'admin', is_active: true, joining_date: '2022-01-01', created_at: '2022-01-01T00:00:00Z' },
]

export const leaveBalances: LeaveBalance[] = users.flatMap(u =>
  getInitialBalances(u.id).map((b, i) => ({ ...b, id: `lb-${u.id}-${i}` }))
)

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'lr1', user_id: 'u1', leave_type: 'annual',
    start_date: '2026-04-07', end_date: '2026-04-11',
    days_requested: 5, status: 'pending', current_stage: 'manager',
    notes: 'Family vacation', created_at: '2026-03-20T09:00:00Z', updated_at: '2026-03-20T09:00:00Z',
  },
  {
    id: 'lr2', user_id: 'u4', leave_type: 'sick_full',
    start_date: '2026-03-24', end_date: '2026-03-25',
    days_requested: 2, status: 'approved', current_stage: null,
    notes: 'Flu', created_at: '2026-03-23T08:00:00Z', updated_at: '2026-03-24T10:00:00Z',
  },
]

export const approvalLogs: ApprovalLog[] = []

export const publicHolidays: PublicHoliday[] = [
  { id: 'ph1', date: '2026-01-01', name: "New Year's Day", year: 2026 },
  { id: 'ph2', date: '2026-04-07', name: 'Karume Day', year: 2026 },
  { id: 'ph3', date: '2026-04-26', name: 'Union Day', year: 2026 },
  { id: 'ph4', date: '2026-05-01', name: 'Workers Day', year: 2026 },
  { id: 'ph5', date: '2026-07-07', name: 'Saba Saba Day', year: 2026 },
  { id: 'ph6', date: '2026-08-08', name: 'Nane Nane Day', year: 2026 },
  { id: 'ph7', date: '2026-10-14', name: 'Nyerere Day', year: 2026 },
  { id: 'ph8', date: '2026-12-09', name: 'Independence Day', year: 2026 },
  { id: 'ph9', date: '2026-12-25', name: 'Christmas Day', year: 2026 },
  { id: 'ph10', date: '2026-12-26', name: 'Boxing Day', year: 2026 },
]

export const notifications: Notification[] = []

export const auditLogs: AuditLog[] = []

// ── Helper mutations ─────────────────────────────────────────────────────────

let _seq = 1000
const nextId = () => `id-${++_seq}`

export function logAdminAction(
  adminId: string,
  action: AdminAction,
  targetUserId: string | null,
  details: string
): AuditLog {
  const entry: AuditLog = {
    id: nextId(),
    admin_id: adminId,
    action,
    target_user_id: targetUserId,
    details,
    created_at: new Date().toISOString(),
  }
  auditLogs.unshift(entry) // Newest first
  return entry
}

export function createLeaveRequest(
  data: Omit<LeaveRequest, 'id' | 'status' | 'current_stage' | 'created_at' | 'updated_at'>
): LeaveRequest {
  const req: LeaveRequest = {
    ...data,
    id: nextId(),
    status: 'pending',
    current_stage: 'manager',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  leaveRequests.push(req)
  return req
}

export function approveLeaveRequest(
  requestId: string,
  approverId: string,
  stage: ApprovalStage,
  comment?: string
): LeaveRequest | null {
  const req = leaveRequests.find(r => r.id === requestId)
  if (!req) return null

  approvalLogs.push({
    id: nextId(), leave_request_id: requestId,
    approver_id: approverId, stage, action: 'approved',
    comment: comment ?? null, created_at: new Date().toISOString(),
  })

  const next = nextStage(stage)
  req.current_stage = next
  req.status = next ? 'pending' : 'approved'
  req.updated_at = new Date().toISOString()

  // Deduct balance on final approval
  if (req.status === 'approved') {
    const bal = leaveBalances.find(b => b.user_id === req.user_id && b.leave_type === req.leave_type)
    if (bal) {
      // For dynamic types (work_cycle, annual): balance tracks days TAKEN, so increment it
      if (req.leave_type === 'work_cycle' || req.leave_type === 'annual') {
        bal.balance += req.days_requested
      } else {
        bal.balance = Math.max(0, bal.balance - req.days_requested)
      }
    }
  }

  return req
}

export function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  stage: ApprovalStage,
  comment?: string
): LeaveRequest | null {
  const req = leaveRequests.find(r => r.id === requestId)
  if (!req) return null

  approvalLogs.push({
    id: nextId(), leave_request_id: requestId,
    approver_id: approverId, stage, action: 'rejected',
    comment: comment ?? null, created_at: new Date().toISOString(),
  })

  req.status = 'rejected'
  req.current_stage = null
  req.updated_at = new Date().toISOString()
  return req
}
