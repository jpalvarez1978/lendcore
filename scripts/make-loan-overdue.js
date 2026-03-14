const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Modificar PRE-2026-001 para tener una cuota vencida
  const loan = await prisma.loan.findFirst({
    where: { loanNumber: 'PRE-2026-001' },
    include: {
      installments: {
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
    console.log('❌ No se encontró el préstamo PRE-2026-001')
    return
  }

  const clientName = loan.client.type === 'INDIVIDUAL'
    ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
    : loan.client.businessProfile?.businessName

  console.log(`\n📝 Modificando préstamo: ${loan.loanNumber}`)
  console.log(`   Cliente: ${clientName}`)
  console.log(`   Estado actual: ${loan.status}`)

  // Tomar la primera cuota
  const installment = loan.installments[0]

  // Fecha vencida hace 30 días
  const overdueDate = new Date()
  overdueDate.setDate(overdueDate.getDate() - 30)

  // Actualizar la cuota
  await prisma.installment.update({
    where: { id: installment.id },
    data: {
      dueDate: overdueDate,
      status: 'OVERDUE',
      paidAmount: 0,
      pendingAmount: installment.totalAmount
    }
  })

  // Actualizar el préstamo a ACTIVE
  await prisma.loan.update({
    where: { id: loan.id },
    data: {
      status: 'ACTIVE',
      outstandingPrincipal: installment.principalAmount,
      totalPaid: loan.installments
        .slice(1)
        .reduce((sum, i) => sum + Number(i.paidAmount), 0)
    }
  })

  console.log(`\n✅ Préstamo modificado para pruebas de cobranza:`)
  console.log(`   - Cuota #${installment.installmentNumber}: VENCIDA`)
  console.log(`   - Fecha vencimiento: ${overdueDate.toLocaleDateString('es-ES')}`)
  console.log(`   - Días de mora: ~30 días`)
  console.log(`   - Monto vencido: ${installment.totalAmount}€`)
  console.log(`   - Préstamo cambiado a: ACTIVE`)

  console.log(`\n🎯 Ahora ve al Dashboard de Cobranza para probar:`)
  console.log(`   http://localhost:3000/dashboard/cobranza`)
  console.log(`\n   Deberías ver en el dashboard:`)
  console.log(`   ✓ Total Vencido: ${installment.totalAmount}€`)
  console.log(`   ✓ 1 cuota vencida`)
  console.log(`   ✓ 1 caso MEDIO (8-30 días)`)
  console.log(`   ✓ Cliente: ${clientName}`)
  console.log(`   ✓ Préstamo: ${loan.loanNumber}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
