// Quick CLI script to query a single Prisma table
// Usage: node query-table.js <tableName> [limit]
// Example: node query-table.js athlete 10

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Map table names to Prisma models
const modelMap = {
  athlete: prisma.athlete,
  athletes: prisma.athlete,
  activity: prisma.athleteActivity,
  activities: prisma.athleteActivity,
  runcrew: prisma.runCrew,
  runcrews: prisma.runCrew,
  membership: prisma.runCrewMembership,
  memberships: prisma.runCrewMembership,
  post: prisma.runCrewPost,
  posts: prisma.runCrewPost,
  comment: prisma.runCrewPostComment,
  comments: prisma.runCrewPostComment,
  leaderboard: prisma.runCrewLeaderboard,
  leaderboards: prisma.runCrewLeaderboard,
  race: prisma.race,
  races: prisma.race,
  trainingplan: prisma.trainingPlan,
  trainingplans: prisma.trainingPlan,
  trainingdayplanned: prisma.trainingDayPlanned,
  trainingdayexecuted: prisma.trainingDayExecuted,
  founder: prisma.founder,
  founders: prisma.founder,
  foundertask: prisma.founderTask,
  foundertasks: prisma.founderTask,
  crmcontact: prisma.crmContact,
  crmcontacts: prisma.crmContact,
  roadmapitem: prisma.roadmapItem,
  roadmapitems: prisma.roadmapItem,
  company: prisma.company,
  companies: prisma.company,
  companyfounder: prisma.companyFounder,
  companyemployee: prisma.companyEmployee,
  companyroadmapitem: prisma.companyRoadmapItem,
  companycrmcontact: prisma.companyCrmContact,
  companyfinancialspend: prisma.companyFinancialSpend,
  companyfinancialprojection: prisma.companyFinancialProjection,
  task: prisma.task,
  tasks: prisma.task,
  message: prisma.message,
  messages: prisma.message,
};

async function queryTable(tableName, limit = 50) {
  try {
    const model = modelMap[tableName.toLowerCase()];
    
    if (!model) {
      console.error(`❌ Unknown table: ${tableName}`);
      console.log('\n📋 Available tables:');
      console.log(Object.keys(modelMap).filter((k, i, arr) => arr.indexOf(k) === i).join(', '));
      return;
    }

    console.log(`🔍 Querying ${tableName} (limit: ${limit})...\n`);
    
    const results = await model.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${results.length} records\n`);
    
    if (results.length === 0) {
      console.log('📭 No records found');
      return;
    }

    // Display results
    results.forEach((record, index) => {
      console.log(`--- Record ${index + 1} ---`);
      console.log(JSON.stringify(record, null, 2));
      console.log('');
    });

    console.log(`\n📊 Total: ${results.length} record(s)`);

  } catch (error) {
    console.error('❌ Error querying table:', error.message);
    if (error.code === 'P2001') {
      console.error('   Table does not exist in database. Run: npm run db:push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const tableName = process.argv[2];
const limit = parseInt(process.argv[3]) || 50;

if (!tableName) {
  console.log('📋 Usage: node query-table.js <tableName> [limit]');
  console.log('\n📋 Available tables:');
  console.log(Object.keys(modelMap).filter((k, i, arr) => arr.indexOf(k) === i).join(', '));
  console.log('\n💡 Examples:');
  console.log('  node query-table.js athlete 10');
  console.log('  node query-table.js runcrew');
  console.log('  node query-table.js athleteActivity 5');
  process.exit(1);
}

queryTable(tableName, limit);

