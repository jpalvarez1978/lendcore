const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Buscar un préstamo activo con cuotas pendientes
  const loan = await prisma.loan.findFirst({
    where: {
      status: 'ACTIVE',
      installments: {
        some: {
          status: 'PENDING'
        }
      }
    },
    include: {
      installments: {
        where: { status: 'PENDING' },
        orderBy: { installmentNumber: 'asc' }
      },
      client: {
        include: {
          individualProfile: true,
          businessProfile: true
        }
      }
    }
  })

  if (!loan) {
    console.log('❌ No hay préstamos activos con cuotas pendientes')
    console.log('   Crea un préstamo primero desde la interfaz')
    return
  }

  const clientName = loan.client.type === 'INDIVIDUAL'
    ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
    : loan.client.businessProfile?.businessName

  console.log(`\n✓ Préstamo encontrado: ${loan.loanNumber}`)
  console.log(`  Cliente: ${clientName}`)
  console.log(`  Cuotas pendientes: ${loan.installments.length}`)

  // 2. Modificar la primera cuota para que esté vencida hace 30 días
  const installmentToModify = loan.installments[0]

  const overdueDate = new Date()
  overdueDate.setDate(overdueDate.getDate() - 30) // 30 días atrás

  await prisma.installment.update({
    where: { id: installmentToModify.id },
    data: {
      dueDate: overdueDate,
      status: 'OVERDUE'
    }
  })

  console.log(`\n✅ Cuota #${installmentToModify.installmentNumber} marcada como VENCIDA`)
  console.log(`   Fecha de vencimiento: ${overdueDate.toLocaleDateString('es-ES')}`)
  console.log(`   Días de mora: 30 días`)
  console.log(`   Monto vencido: ${installmentToModify.totalAmount}€`)

  console.log(`\n🎯 Ahora ve al Dashboard de Cobranza:`)
  console.log(`   http://localhost:3000/dashboard/cobranza`)
  console.log(`\n   Deberías ver:`)
  console.log(`   - Total Vencido: ${installmentToModify.totalAmount}€`)
  console.log(`   - 1 cuota vencida`)
  console.log(`   - Categoría: MEDIO (30 días de mora)`)
  console.log(`   - Cliente: ${clientName}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
