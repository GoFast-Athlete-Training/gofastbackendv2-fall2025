/**
 * Seed Product Roadmap Items - Direct Database Script
 * This creates the items directly in the database
 * 
 * Run: node scripts/seedProductRoadmapDirect.js
 */

import pkg from 'pg';
const { Client } = pkg;

// Database connection (update with your connection string)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/gofast';

const GOFAST_COMPANY_ID = 'cmhpqe7kl0000nw1uvcfhf2hs';

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
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Generate IDs (using cuid format would be ideal, but for simplicity using uuid)
    const { randomUUID } = await import('crypto');
    
    let created = 0;

    for (const item of productRoadmapItems) {
      const id = randomUUID();
      const now = new Date().toISOString();

      const query = `
        INSERT INTO company_roadmap_item (
          id,
          "goFastCompanyId",
          title,
          "itemType",
          "parentArchitecture",
          "roadmapType",
          category,
          "whatItDoes",
          "howItHelps",
          priority,
          status,
          "hoursEstimated",
          "orderNumber",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (id) DO NOTHING
      `;

      const values = [
        id,
        GOFAST_COMPANY_ID,
        item.title,
        item.itemType,
        item.parentArchitecture,
        item.roadmapType,
        item.category,
        item.whatItDoes,
        item.howItHelps,
        item.priority,
        item.status,
        item.hoursEstimated,
        item.orderNumber,
        now,
        now
      ];

      const result = await client.query(query, values);
      if (result.rowCount > 0) {
        console.log(`✅ Created: ${item.title} (${item.status})`);
        created++;
      } else {
        console.log(`⚠️ Skipped: ${item.title} (may already exist)`);
      }
    }

    console.log(`\n✅ Product roadmap seeding complete!`);
    console.log(`📊 Created: ${created} items`);

  } catch (error) {
    console.error('❌ Error seeding product roadmap:', error);
    throw error;
  } finally {
    await client.end();
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

