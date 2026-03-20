import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withRateLimit } from '@/lib/security/rateLimitMiddleware'
import { RateLimitConfigs } from '@/lib/security/rateLimiter'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Rate limiting: 3 intentos por hora
    const rateLimitResponse = await withRateLimit(
      request,
      RateLimitConfigs.PASSWORD_CHANGE,
      `pwd:${session.user.id}`
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const validation = changePasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword, confirmPassword } = validation.data

    // Verificar que las contraseñas nuevas coincidan
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Las contraseñas nuevas no coinciden' },
        { status: 400 }
      )
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 }
      )
    }

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    // Generar hash de la nueva contraseña (12 rounds para seguridad adecuada)
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // Actualizar contraseña en una transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar contraseña
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      })

      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGED',
          entityType: 'users',
          entityId: user.id,
          oldValue: { email: user.email },
          newValue: { email: user.email, passwordChanged: true },
        },
      })
    })

    return NextResponse.json(
      { success: true, message: 'Contraseña actualizada exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error changing password:', error)

    return NextResponse.json(
      { success: false, error: 'Error al cambiar la contraseña' },
      { status: 500 }
    )
  }
}
