const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Recalculando totales de préstamos...')
  
  const loans = await prisma.loan.findMany({
    include: {
      installments: true
    }
  })
  
  for (const loan of loans) {
    const totalPaid = loan.installments.reduce((sum, inst) => sum + Number(inst.paidAmount), 0)
    
    const outstandingPrincipal = loan.installments
      .filter(inst => inst.status !== 'PAID')
      .reduce((sum, inst) => sum + Number(inst.principalAmount), 0)
    
    const allPaid = loan.installments.every(inst => inst.status === 'PAID')
    
    const newStatus = allPaid ? 'PAID' : loan.status === 'PAID' ? 'ACTIVE' : loan.status
    
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        totalPaid,
        outstandingPrincipal: Math.max(0, outstandingPrincipal),
        status: newStatus
      }
    })
    
    console.log(`✓ ${loan.loanNumber}: Total Pagado=${totalPaid}€, Pendiente=${outstandingPrincipal}€, Estado=${newStatus}`)
  }
  
  console.log('✅ Totales recalculados correctamente')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
