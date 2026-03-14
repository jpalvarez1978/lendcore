import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'
import { SecurityService } from '@/services/securityService'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) {
          return null
        }

        // Obtener IP del request
        const ipAddress = req?.headers?.get?.('x-forwarded-for')?.split(',')?.[0]?.trim() ||
                         req?.headers?.get?.('x-real-ip') ||
                         '127.0.0.1'

        const user = await prisma.user.findUnique({
          where: { email },
        })

        // Usuario no encontrado o inactivo
        if (!user) {
          await SecurityService.logLoginFailed(
            email,
            ipAddress,
            'Usuario no encontrado',
            req?.headers?.get?.('user-agent') || undefined
          )
          return null
        }

        if (user.status !== 'ACTIVE') {
          await SecurityService.logLoginFailed(
            email,
            ipAddress,
            `Usuario ${user.status}`,
            req?.headers?.get?.('user-agent') || undefined
          )
          return null
        }

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.passwordHash)

        if (!passwordMatch) {
          await SecurityService.logLoginFailed(
            email,
            ipAddress,
            'Contraseña incorrecta',
            req?.headers?.get?.('user-agent') || undefined
          )
          return null
        }

        // Login exitoso - Actualizar último login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Log de login exitoso
        await SecurityService.logLoginSuccess(
          user.id,
          user.email,
          ipAddress,
          req?.headers?.get?.('user-agent') || undefined
        )

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as UserRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})
