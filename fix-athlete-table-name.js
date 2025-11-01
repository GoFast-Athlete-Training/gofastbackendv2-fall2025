// Fix athlete table name from "athlete" to "athletes" in production
// This script handles the foreign key constraint issues when Prisma db push fails

import { connectDatabase, getPrismaClient } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixAthleteTableName() {
  try {
    console.log('🔍 Connecting to database...');
    const prisma = getPrismaClient();
    
    // Raw SQL to check current table name
    console.log('📊 Checking current athlete table name...');
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('athlete', 'athletes')
    `;
    
    console.log('Tables found:', tableCheck);
    
    // Check if athlete table exists
    const athleteTableExists = tableCheck.some(t => t.table_name === 'athlete');
    const athletesTableExists = tableCheck.some(t => t.table_name === 'athletes');
    
    if (!athleteTableExists) {
      console.log('✅ Table is already named "athletes" (or doesn\'t exist)');
      await prisma.$disconnect();
      return;
    }
    
    console.log('⚠️  Found "athlete" table, needs to be renamed to "athletes"');
    console.log('📝 This requires manual SQL execution in production');
    console.log('');
    console.log('Run this SQL in your production database:');
    console.log('');
    console.log('-- Step 1: Rename the table');
    console.log('ALTER TABLE "athlete" RENAME TO "athletes";');
    console.log('');
    console.log('-- Step 2: Update foreign key constraint name');
    console.log('ALTER TABLE "athlete_activities" DROP CONSTRAINT IF EXISTS "athlete_activities_athleteId_fkey";');
    console.log('ALTER TABLE "athlete_activities" ADD CONSTRAINT "athlete_activities_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;');
    console.log('');
    console.log('-- Step 3: If old training tables exist, drop them first');
    console.log('DROP TABLE IF EXISTS "training_sessions" CASCADE;');
    console.log('DROP TABLE IF EXISTS "training_days" CASCADE;');
    console.log('DROP TABLE IF EXISTS "training_goals" CASCADE;');
    console.log('');
    console.log('After running this SQL, re-run the deployment.');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAthleteTableName();
