const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany({
    include: {
      individualProfile: true,
      businessProfile: true
    }
  })
  
  console.log('\n📋 Clientes disponibles:\n')
  clients.forEach(client => {
    const name = client.type === 'INDIVIDUAL' 
      ? `${client.individualProfile?.firstName} ${client.individualProfile?.lastName}`
      : client.businessProfile?.businessName
    
    console.log(`✓ ${name}`)
    console.log(`  ID: ${client.id}`)
    console.log(`  Tipo: ${client.type}`)
    console.log(`  Límite de crédito: ${client.creditLimit}€`)
    console.log(`  Estado: ${client.status}\n`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
