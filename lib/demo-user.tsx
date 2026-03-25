'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { Role } from './types'

export interface DemoUser {
  id: string
  name: string
  role: Role
  department_id: string | null
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', name: 'Alice Mwangi',  role: 'employee', department_id: 'd1' },
  { id: 'u2', name: 'Bob Kimani',    role: 'manager',  department_id: 'd1' },
  { id: 'u3', name: 'Carol Njeri',   role: 'hr',       department_id: 'd2' },
  { id: 'u4', name: 'David Osei',    role: 'manager',  department_id: 'd3' },
  { id: 'u5', name: 'Eve Banda',     role: 'gm',       department_id: null },
  { id: 'u6', name: 'Frank Mutiso',  role: 'admin',    department_id: null },
]

interface DemoUserCtx {
  user: DemoUser
  setUser: (u: DemoUser) => void
  all: DemoUser[]
}

const Ctx = createContext<DemoUserCtx>({
  user: DEMO_USERS[0],
  setUser: () => {},
  all: DEMO_USERS,
})

export function DemoUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<DemoUser>(DEMO_USERS[0])

  useEffect(() => {
    try {
      const id = localStorage.getItem('naenda_demo_user')
      if (id) {
        const found = DEMO_USERS.find(u => u.id === id)
        if (found) setUserState(found)
      }
    } catch {}
  }, [])

  const setUser = (u: DemoUser) => {
    setUserState(u)
    try { localStorage.setItem('naenda_demo_user', u.id) } catch {}
  }

  return <Ctx.Provider value={{ user, setUser, all: DEMO_USERS }}>{children}</Ctx.Provider>
}

export function useDemoUser() {
  return useContext(Ctx)
}
