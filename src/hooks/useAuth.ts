import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'

export function useAuth() {
  const { data: session, status } = useSession()

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    role: session?.user?.role,
  }
}

export function usePermission(allowedRoles: UserRole[]) {
  const { role } = useAuth()

  if (!role) return false

  return allowedRoles.includes(role)
}
