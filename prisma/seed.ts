import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // ===========================================
  // 1. Create the Master Admin
  // ===========================================
  const adminEmail = 'admin@haemologix.com'
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Master Admin',
      clerkId: 'user_admin_master_001', // Required by your schema
      role: 'ADMIN', // Matches UserRole Enum
      donations: {
        create: [
          { amount: 450, status: 'COMPLETED' },
          { amount: 450, status: 'COMPLETED' }
        ]
      }
    },
  })
  console.log(`✅ Admin created: ${admin.email}`)

  // ===========================================
  // 2. Create Mock Hospitals
  // ===========================================
  const hospitals = ['City General', 'St Marys', 'Apex Trauma']
  
  for (const h of hospitals) {
    const email = `${h.replace(/\s+/g, '').toLowerCase()}@hospital.com`
    const clerkId = `user_${h.replace(/\s+/g, '').toLowerCase()}_001`

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: h,
        clerkId: clerkId, // Required
        role: 'HOSPITAL', // Matches UserRole Enum
      },
    })
    console.log(`✅ Hospital created: ${h}`)
  }

  // ===========================================
  // 3. Create Mock Donors
  // ===========================================
  const donors = [
    { name: 'Alice Smith', email: 'alice@donor.com' },
    { name: 'Bob Jones', email: 'bob@donor.com' },
    { name: 'Charlie Day', email: 'charlie@donor.com' },
  ]

  for (const d of donors) {
    const clerkId = `user_${d.name.split(' ')[0].toLowerCase()}_001`

    await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        name: d.name,
        clerkId: clerkId, // Required
        role: 'DONOR', // Matches UserRole Enum
        donations: {
          create: [
            { amount: 350, status: 'PENDING' }
          ]
        }
      },
    })
    console.log(`✅ Donor created: ${d.name}`)
  }

  console.log('🌱 Seeding finished successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })