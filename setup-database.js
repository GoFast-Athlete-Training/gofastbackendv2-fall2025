// Test database connection and create tables
import { connectDatabase, getPrismaClient } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAndSetupDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    // Test Prisma client
    const prisma = getPrismaClient();
    
    // Try to push the schema to create tables
    console.log('📝 Pushing Prisma schema to create tables...');
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Prisma schema pushed successfully');
    } catch (pushError) {
      console.error('❌ Prisma push failed:', pushError.message);
      throw pushError;
    }
    
    // Test if athletes table exists now
    console.log('👥 Testing athletes table...');
    const athletes = await prisma.athlete.findMany();
    console.log('✅ Athletes table exists:', athletes.length, 'athletes found');
    
    // Try to create a test athlete
    console.log('📝 Testing athlete creation...');
    const testAthlete = await prisma.athlete.create({
      data: {
        firebaseId: 'test-' + Date.now(),
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: 'active'
      }
    });
    console.log('✅ Athlete creation successful:', testAthlete.id);
    
    // Clean up test athlete
    await prisma.athlete.delete({
      where: { id: testAthlete.id }
    });
    console.log('🧹 Test athlete cleaned up');
    
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.error('❌ Error details:', error.message);
  } finally {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
    process.exit(0);
  }
}

testAndSetupDatabase();
