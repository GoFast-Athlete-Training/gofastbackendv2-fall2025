/**
 * Seed Product Roadmap Items
 * Creates initial product roadmap items for GoFast Company Stack
 */

import { getPrismaClient } from '../config/database.js';
import { getGoFastCompanyId } from '../config/goFastCompanyConfig.js';

const prisma = getPrismaClient();

const GOFAST_COMPANY_ID = getGoFastCompanyId();

const productRoadmapItems = [
  {
    title: 'Join RunCrew',
    itemType: 'Feature',
    parentArchitecture: 'RunCrew',
    roadmapType: 'Product',
    category: 'Core Feature',
    whatItDoes: 'Allow users to join RunCrews and participate in group runs',
    howItHelps: 'Enables community building and group run coordination',
    priority: 'P1',
    status: 'In Progress',
    hoursEstimated: 40,
    orderNumber: 1
  },
  {
    title: 'Messaging',
    itemType: 'Feature',
    parentArchitecture: 'Communication',
    roadmapType: 'Product',
    category: 'Core Feature',
    whatItDoes: 'Direct messaging between users and RunCrew members',
    howItHelps: 'Enables communication and coordination for runs and events',
    priority: 'P1',
    status: 'Not Started',
    hoursEstimated: 60,
    orderNumber: 2
  },
  {
    title: 'Dynamic Leaderboard',
    itemType: 'Feature',
    parentArchitecture: 'Competition',
    roadmapType: 'Product',
    category: 'Engagement',
    whatItDoes: 'Real-time leaderboard showing top performers in RunCrews and challenges',
    howItHelps: 'Increases engagement and competition among runners',
    priority: 'P2',
    status: 'Not Started',
    hoursEstimated: 50,
    orderNumber: 3
  },
  {
    title: 'Sales Partnership',
    itemType: 'Feature',
    parentArchitecture: 'Business',
    roadmapType: 'Product',
    category: 'Revenue',
    whatItDoes: 'Partnership management and sales tracking system',
    howItHelps: 'Enables tracking of partnerships and revenue opportunities',
    priority: 'P2',
    status: 'Not Started',
    hoursEstimated: 80,
    orderNumber: 4
  },
  {
    title: 'Ambassador Program',
    itemType: 'Feature',
    parentArchitecture: 'Community',
    roadmapType: 'Product',
    category: 'Growth',
    whatItDoes: 'Ambassador program management and tracking',
    howItHelps: 'Enables community growth through ambassador network',
    priority: 'P2',
    status: 'Not Started',
    hoursEstimated: 70,
    orderNumber: 5
  }
];

async function seedProductRoadmap() {
  try {
    console.log('🌱 Seeding product roadmap items...');
    console.log('📍 Company ID:', GOFAST_COMPANY_ID);

    // Check if company exists
    const company = await prisma.goFastCompany.findUnique({
      where: { id: GOFAST_COMPANY_ID }
    });

    if (!company) {
      console.error('❌ Company not found. Please create company first.');
      process.exit(1);
    }

    console.log('✅ Company found:', company.companyName);

    // Delete existing roadmap items (optional - comment out if you want to keep existing)
    // await prisma.companyRoadmapItem.deleteMany({
    //   where: { goFastCompanyId: GOFAST_COMPANY_ID, roadmapType: 'Product' }
    // });

    // Create roadmap items
    for (const item of productRoadmapItems) {
      const roadmapItem = await prisma.companyRoadmapItem.create({
        data: {
          goFastCompanyId: GOFAST_COMPANY_ID,
          ...item
        }
      });
      console.log(`✅ Created: ${roadmapItem.title} (${roadmapItem.status})`);
    }

    console.log('✅ Product roadmap seeding complete!');
    console.log(`📊 Created ${productRoadmapItems.length} roadmap items`);

  } catch (error) {
    console.error('❌ Error seeding product roadmap:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProductRoadmap()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

