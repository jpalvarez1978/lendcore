import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * TEMPORARY endpoint to reset admin passwords.
 * DELETE THIS AFTER USE.
 */
export async function GET() {
  try {
    const password = 'JeanPaul2026!'
    const hash = await bcrypt.hash(password, 12)

    // Verify hash works
    const testMatch = await bcrypt.compare(password, hash)
    if (!testMatch) {
      return NextResponse.json({ error: 'Hash generation failed' }, { status: 500 })
    }

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, status: true },
    })

    // Update all users with new password
    const results = []
    for (const user of allUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, status: 'ACTIVE' },
      })

      // Verify
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      const verified = updated ? await bcrypt.compare(password, updated.passwordHash) : false

      results.push({
        email: user.email,
        name: user.name,
        role: user.role,
        passwordReset: verified,
      })
    }

    return NextResponse.json({
      success: true,
      password: 'JeanPaul2026!',
      users: results,
      totalUsers: allUsers.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
