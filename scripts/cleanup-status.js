import { getPrismaClient } from '../config/database.js';

const cleanupStatus = async () => {
  try {
    const prisma = getPrismaClient();
    
    console.log('🧹 CLEANUP: Starting status field cleanup...');
    
    // Get all athletes with status field
    const athletes = await prisma.athlete.findMany({
      select: {
        id: true,
        email: true,
        status: true
      }
    });
    
    console.log(`📊 CLEANUP: Found ${athletes.length} athletes to check`);
    
    // Update each athlete to remove status field (set to null)
    for (const athlete of athletes) {
      console.log(`🔄 CLEANUP: Updating ${athlete.email} (${athlete.id})`);
      
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: {
          status: null // Remove the status field
        }
      });
      
      console.log(`✅ CLEANUP: Updated ${athlete.email}`);
    }
    
    console.log('🎉 CLEANUP: All athletes updated successfully!');
    
  } catch (error) {
    console.error('❌ CLEANUP: Error:', error);
  } finally {
    process.exit(0);
  }
};

cleanupStatus();
