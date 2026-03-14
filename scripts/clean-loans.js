const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpiando datos corruptos...')
  
  // Borrar en orden para respetar las relaciones
  const deletedAllocations = await prisma.paymentAllocation.deleteMany({})
  console.log(`✓ Eliminadas ${deletedAllocations.count} asignaciones de pago`)
  
  const deletedPayments = await prisma.payment.deleteMany({})
  console.log(`✓ Eliminados ${deletedPayments.count} pagos`)
  
  const deletedInstallments = await prisma.installment.deleteMany({})
  console.log(`✓ Eliminadas ${deletedInstallments.count} cuotas`)
  
  const deletedLoans = await prisma.loan.deleteMany({})
  console.log(`✓ Eliminados ${deletedLoans.count} préstamos`)
  
  console.log('✅ Base de datos limpiada exitosamente')
  console.log('📝 Los clientes y usuarios se mantienen intactos')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
