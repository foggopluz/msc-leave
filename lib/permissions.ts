import { Role, ApprovalStage } from './types'

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  employee: 1,
  manager: 2,
  hr: 3,
  gm: 4,
  admin: 5,
}

export function canApprove(role: Role): boolean {
  return ['manager', 'hr', 'gm', 'admin'].includes(role)
}

export function canManageEmployees(role: Role): boolean {
  return ['hr', 'admin'].includes(role)
}

export function canViewAllDepartments(role: Role): boolean {
  return ['hr', 'gm', 'viewer', 'admin'].includes(role)
}

export function canAccessSettings(role: Role): boolean {
  return role === 'admin'
}

export function canAccessAdmin(role: Role): boolean {
  return role === 'admin'
}

export function canOverrideLeaveBalance(role: Role): boolean {
  return ['hr', 'admin'].includes(role)
}

export function canImportEmployees(role: Role): boolean {
  return ['hr', 'admin'].includes(role)
}

export function getApprovalStageForRole(role: Role): ApprovalStage | null {
  const map: Partial<Record<Role, ApprovalStage>> = {
    manager: 'manager',
    hr: 'hr',
    gm: 'gm',
  }
  return map[role] ?? null
}

export function isHigherOrEqual(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

// Returns the next stage in the approval chain
export function nextStage(current: ApprovalStage): ApprovalStage | null {
  const chain: ApprovalStage[] = ['manager', 'hr', 'gm']
  const idx = chain.indexOf(current)
  return idx < chain.length - 1 ? chain[idx + 1] : null
}

// The stage that a given role can act on
export function stageRequiresRole(stage: ApprovalStage): Role {
  const map: Record<ApprovalStage, Role> = {
    manager: 'manager',
    hr: 'hr',
    gm: 'gm',
  }
  return map[stage]
}
