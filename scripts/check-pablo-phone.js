const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const client = await prisma.client.findFirst({
    where: {
      individualProfile: {
        firstName: { contains: 'PABLO' }
      }
    },
    include: {
      individualProfile: true
    }
  })

  console.log('\n📋 Cliente PABLO:')
  console.log('ID:', client.id)
  console.log('Teléfono en tabla Client:', client.phone)
  console.log('Email:', client.email)
  console.log('\nIndividualProfile:')
  console.log('firstName:', client.individualProfile.firstName)
  console.log('lastName:', client.individualProfile.lastName)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
