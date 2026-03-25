'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from './supabase'
import { Role } from './types'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: Role
  department_id: string | null
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', name: 'Alice Mwangi',  email: 'alice@naenda.co.tz',  role: 'employee', department_id: 'd1' },
  { id: 'u2', name: 'Bob Kimani',    email: 'bob@naenda.co.tz',    role: 'manager',  department_id: 'd1' },
  { id: 'u3', name: 'Carol Njeri',   email: 'carol@naenda.co.tz',  role: 'hr',       department_id: 'd2' },
  { id: 'u4', name: 'David Osei',    email: 'david@naenda.co.tz',  role: 'manager',  department_id: 'd3' },
  { id: 'u5', name: 'Eve Banda',     email: 'eve@naenda.co.tz',    role: 'gm',       department_id: null },
  { id: 'u6', name: 'Frank Mutiso',  email: 'frank@naenda.co.tz',  role: 'admin',    department_id: null },
]

interface UserCtx {
  user: DemoUser
  signOut: () => Promise<void>
}

const Ctx = createContext<UserCtx>({
  user: DEMO_USERS[0],
  signOut: async () => {},
})

export function DemoUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser>(DEMO_USERS[0])
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    const isLoginPage = pathname.startsWith('/login')

    const resolve = (email: string | null | undefined) => {
      if (!email) return
      const matched = DEMO_USERS.find(u => u.email === email)
      if (matched) setUser(matched)
    }

    // Check session once on mount; redirect only if on a protected page
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        resolve(session.user.email)
      } else if (!isLoginPage) {
        router.replace('/login')
      }
    })

    // Keep in sync across tabs; never redirect when already on login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        resolve(session.user.email)
      } else if (event === 'SIGNED_OUT' && !isLoginPage) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return <Ctx.Provider value={{ user, signOut }}>{children}</Ctx.Provider>
}

export function useDemoUser() {
  return useContext(Ctx)
}
