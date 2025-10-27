// Test database connection script
import { connectDatabase, getPrismaClient } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    
    // Connect to database
    await connectDatabase();
    
    // Test Prisma client
    const prisma = getPrismaClient();
    
    // Try to query athletes table
    console.log('👥 Testing athletes query...');
    const athletes = await prisma.athlete.findMany();
    console.log('✅ Athletes query successful:', athletes.length, 'athletes found');
    
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
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('❌ Error details:', error.message);
  } finally {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
    process.exit(0);
  }
}

testDatabase();
