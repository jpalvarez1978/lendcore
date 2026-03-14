import { UserRole } from '@prisma/client'
import { NAVIGATION_ITEMS, QUICK_ACTIONS } from '@/lib/constants/config'
import { canAccessPermission } from '@/lib/constants/permissions'

type RoleMatrix = Record<UserRole, { navigation: string[]; quickActions: string[] }>

const roles = [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER] as const

function getNavigationForRole(role: UserRole) {
  return NAVIGATION_ITEMS.flatMap(item => {
    if ('children' in item && item.children) {
      const children = item.children
        .filter(child => canAccessPermission(role, child.permission))
        .map(child => child.title)

      return children.length > 0 ? [`${item.title}: ${children.join(', ')}`] : []
    }

    return canAccessPermission(role, 'permission' in item ? item.permission : undefined)
      ? [item.title]
      : []
  })
}

function getQuickActionsForRole(role: UserRole) {
  return QUICK_ACTIONS.filter(action => canAccessPermission(role, action.permission)).map(
    action => action.label
  )
}

function buildMatrix(): RoleMatrix {
  return Object.fromEntries(
    roles.map(role => [
      role,
      {
        navigation: getNavigationForRole(role),
        quickActions: getQuickActionsForRole(role),
      },
    ])
  ) as RoleMatrix
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function validateMatrix(matrix: RoleMatrix) {
  assert(matrix.ADMIN.navigation.includes('Configuración'), 'ADMIN debe ver Configuración')
  assert(!matrix.ANALYST.navigation.includes('Configuración'), 'ANALYST no debe ver Configuración')
  assert(!matrix.COLLECTION.navigation.includes('Configuración'), 'COLLECTION no debe ver Configuración')
  assert(!matrix.VIEWER.navigation.includes('Configuración'), 'VIEWER no debe ver Configuración')

  assert(
    matrix.ADMIN.quickActions.includes('Nuevo cliente'),
    'ADMIN debe tener acceso rápido a Nuevo cliente'
  )
  assert(
    matrix.ANALYST.quickActions.includes('Nuevo préstamo'),
    'ANALYST debe tener acceso rápido a Nuevo préstamo'
  )
  assert(
    matrix.COLLECTION.quickActions.includes('Registrar pago'),
    'COLLECTION debe tener acceso rápido a Registrar pago'
  )
  assert(
    !matrix.VIEWER.quickActions.includes('Registrar pago'),
    'VIEWER no debe tener acceso rápido a Registrar pago'
  )
}

async function main() {
  const matrix = buildMatrix()
  validateMatrix(matrix)

  console.log('ROLE ACCESS MATRIX')
  console.log('==================')

  for (const role of roles) {
    console.log(`\n[${role}]`)
    console.log(`- Navigation: ${matrix[role].navigation.join(' | ')}`)
    console.log(`- Quick actions: ${matrix[role].quickActions.join(' | ') || 'Sin accesos rápidos'}`)
  }

  console.log('\nVALIDATION RESULT')
  console.log('-----------------')
  console.log('PASS: role navigation and quick actions are aligned with permissions')
}

main().catch(error => {
  console.error('ROLE ACCESS VALIDATION FAILED')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
