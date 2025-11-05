import { PrismaClient } from '@prisma/client';

/**
 * Database Configuration for GoFast Backend V2
 * 
 * LOCAL DEVELOPMENT:
 * - Create .env file with DATABASE_URL (required for Prisma Studio, testing, etc.)
 * - Format: DATABASE_URL = postgresql://user:pass@host:port/gofast_db
 * 
 * PRODUCTION (Render):
 * - Set DATABASE_URL in Render environment variables
 * - Uses same format as local development
 * 
 * ACTUAL POSTGRES DATABASE: gofast_db
 */

let prisma;

export async function connectDatabase() {
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
    console.log('📊 Database: gofast_db');
    console.log('🔗 Connection string:', process.env.DATABASE_URL ? 'Set' : 'Missing');
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err);
    console.error('❌ Make sure DATABASE_URL is set in environment variables');
    process.exit(1);
  }
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export default connectDatabase;
