// Fix athlete table name from "athlete" to "athletes" in production
// This script ACTUALLY RUNS the SQL to fix the foreign key constraint issues

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
    
    console.log('⚠️  Found "athlete" table, renaming to "athletes"...');
    
    // STEP 1: Drop old training tables (if they exist)
    console.log('🗑️  Dropping old training tables...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "training_sessions" CASCADE;');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "training_days" CASCADE;');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "training_goals" CASCADE;');
    console.log('✅ Old training tables dropped');
    
    // STEP 2: Rename athlete table to athletes
    console.log('🔄 Renaming athlete table to athletes...');
    await prisma.$executeRawUnsafe('ALTER TABLE "athlete" RENAME TO "athletes";');
    console.log('✅ Table renamed');
    
    // STEP 3: Drop the old foreign key constraint
    console.log('🔧 Dropping old foreign key constraint...');
    await prisma.$executeRawUnsafe('ALTER TABLE "athlete_activities" DROP CONSTRAINT IF EXISTS "athlete_activities_athleteId_fkey";');
    console.log('✅ Old constraint dropped');
    
    // STEP 4: Recreate foreign key constraint pointing to "athletes"
    console.log('🔗 Recreating foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "athlete_activities" 
      ADD CONSTRAINT "athlete_activities_athleteId_fkey" 
      FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE;
    `);
    console.log('✅ New constraint created');
    
    // Verification
    console.log('');
    console.log('🔍 Verifying changes...');
    const verification = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'athletes'
    `;
    console.log('Verification result:', verification);
    
    console.log('');
    console.log('🎉 Database migration complete! You can now re-deploy.');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixAthleteTableName();
