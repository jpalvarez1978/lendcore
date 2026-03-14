const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      client: {
        include: {
          individualProfile: true,
          businessProfile: true
        }
      },
      installments: true
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`\n📋 Préstamos registrados: ${loans.length}\n`)

  if (loans.length === 0) {
    console.log('❌ No hay préstamos registrados')
    console.log('   Debes crear un préstamo desde la interfaz primero')
    return
  }

  loans.forEach(loan => {
    const clientName = loan.client.type === 'INDIVIDUAL'
      ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
      : loan.client.businessProfile?.businessName

    const pendingInstallments = loan.installments.filter(i => i.status === 'PENDING' || i.status === 'PARTIAL')

    console.log(`✓ ${loan.loanNumber}`)
    console.log(`  Cliente: ${clientName}`)
    console.log(`  Estado: ${loan.status}`)
    console.log(`  Principal: ${loan.principalAmount}€`)
    console.log(`  Cuotas totales: ${loan.installments.length}`)
    console.log(`  Cuotas pendientes: ${pendingInstallments.length}`)
    console.log('')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
