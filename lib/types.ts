export type Role = 'employee' | 'manager' | 'hr' | 'gm' | 'viewer'
export type LeaveType = 'work_cycle' | 'public_holiday' | 'annual' | 'sick_full' | 'sick_half' | 'compassionate'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalStage = 'manager' | 'hr' | 'gm'
export type ApprovalAction = 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  full_name: string
  department_id: string | null
  role: Role
  is_active: boolean
  created_at: string
  department?: Department
}

export interface Department {
  id: string
  name: string
  approver_id: string | null
  created_at: string
  approver?: User
  employee_count?: number
}

export interface LeaveBalance {
  id: string
  user_id: string
  leave_type: LeaveType
  balance: number
  last_reset_at: string | null
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_requested: number
  status: LeaveStatus
  current_stage: ApprovalStage | null
  notes: string | null
  created_at: string
  updated_at: string
  user?: User
  approval_logs?: ApprovalLog[]
}

export interface ApprovalLog {
  id: string
  leave_request_id: string
  approver_id: string
  stage: ApprovalStage
  action: ApprovalAction
  comment: string | null
  created_at: string
  approver?: User
}

export interface PublicHoliday {
  id: string
  date: string
  name: string
  year: number
}

export interface Notification {
  id: string
  user_id: string
  type: 'submitted' | 'approved' | 'rejected' | 'reminder'
  message: string
  read: boolean
  related_id: string | null
  created_at: string
}

export interface DashboardStats {
  total_employees: number
  on_duty_today: number
  on_leave_today: number
  pending_approvals: number
  departments: DepartmentSummary[]
  upcoming_leaves: LeaveRequest[]
}

export interface DepartmentSummary {
  id: string
  name: string
  total: number
  on_leave: number
  on_duty: number
}

// ── Display maps ────────────────────────────────────────────────────────────

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  work_cycle: 'Work Cycle Days',
  public_holiday: 'Public Holiday',
  annual: 'Annual Leave',
  sick_full: 'Sick Leave (Full Pay)',
  sick_half: 'Sick Leave (Half Pay)',
  compassionate: 'Compassionate Leave',
}

export const LEAVE_TYPE_DEFAULTS: Record<LeaveType, number> = {
  work_cycle: 0,
  public_holiday: 0,
  annual: 28,
  sick_full: 63,
  sick_half: 63,
  compassionate: 7,
}

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR',
  gm: 'General Manager',
  viewer: 'Viewer',
}

export const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const STAGE_LABELS: Record<ApprovalStage, string> = {
  manager: 'Manager',
  hr: 'HR',
  gm: 'General Manager',
}
