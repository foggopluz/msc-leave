export type Role = 'employee' | 'manager' | 'hr' | 'gm' | 'viewer' | 'admin'
export type LeaveType = 'work_cycle' | 'public_holiday' | 'annual' | 'sick_full' | 'sick_half' | 'compassionate'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalStage = 'manager' | 'hr' | 'gm'
export type ApprovalAction = 'approved' | 'rejected'
export type AdminAction =
  | 'create_user' | 'update_user' | 'delete_user' | 'activate_user' | 'deactivate_user'
  | 'assign_role' | 'assign_department' | 'reset_password'
  | 'override_balance' | 'update_setting'

export interface User {
  id: string
  email: string
  full_name: string
  department_id: string | null
  role: Role
  is_active: boolean
  joining_date: string          // ISO date, required for accrual calculations
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
  balance: number               // For work_cycle & annual: tracks days TAKEN (used to compute effective balance)
  last_reset_at: string | null
  accrued?: number              // Computed field returned by API: total accrued per formula
  effective?: number            // Computed field: accrued minus taken
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

export interface AuditLog {
  id: string
  admin_id: string
  action: AdminAction
  target_user_id: string | null
  details: string
  created_at: string
  admin?: User
  target_user?: User
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
  annual: 0,       // Starts at 0, accrued dynamically from joining date
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
  admin: 'Admin',
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
