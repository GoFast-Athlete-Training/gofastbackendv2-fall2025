// Athlete Route - Main athlete CRUD operations
// Follows api/athlete pattern with api/athlete/create

import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { AthleteFindOrCreateService } from '../../services/AthleteFindOrCreateService.js';
import { getJoinContext, deleteJoinContext } from '../../utils/redis.js';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Find or Create Athlete from Firebase data
 * POST /api/athlete/create
 * 
 * Uses Firebase token to find existing athlete or create new one.
 * Handles both signup (new users) and existing users hitting signup button.
 * 
 * Flow:
 * 1. Firebase token verified → req.user contains firebaseId, email, name, picture
 * 2. Service finds athlete by firebaseId OR creates new one
 * 3. Returns athlete data (frontend decides routing based on gofastHandle)
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    // Get Firebase data from verified token (set by middleware)
    const firebaseId = req.user?.uid;
    const email = req.user?.email;
    const displayName = req.user?.name; // Firebase uses 'name' field for displayName
    const picture = req.user?.picture; // Firebase photo URL
    const sessionId = req.body?.sessionId || req.query?.sessionId; // Join context session ID

    console.log('🔐 ATHLETE CREATE: Firebase token verified');
    console.log('🔐 ATHLETE CREATE: firebaseId:', firebaseId);
    console.log('🔐 ATHLETE CREATE: email:', email);
    console.log('🔐 ATHLETE CREATE: displayName:', displayName);
    console.log('🔐 ATHLETE CREATE: picture:', picture);
    console.log('🔐 ATHLETE CREATE: sessionId (for join context):', sessionId);
    
    if (!firebaseId || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required Firebase data',
        message: 'firebaseId and email are required from Firebase token'
      });
    }

    // Call service to find or create athlete (upserts all Firebase data)
    const athlete = await AthleteFindOrCreateService.findOrCreate({
        firebaseId,
        email,
      displayName,
      picture
    });

    // Check for join context if sessionId provided
    let runCrewId = null;
    let joinCode = null;
    
    if (sessionId) {
      console.log('🔍 ATHLETE CREATE: Checking for join context...');
      const joinContext = await getJoinContext(sessionId);
      
      if (joinContext) {
        console.log('✅ ATHLETE CREATE: Join context found:', joinContext);
        runCrewId = joinContext.runCrewId;
        joinCode = joinContext.joinCode;
        
        // Auto-join the crew
        const prisma = getPrismaClient();
        
        // Check if already a member
        const existingMembership = await prisma.runCrewMembership.findUnique({
          where: {
            runCrewId_athleteId: {
              runCrewId: runCrewId,
              athleteId: athlete.id
            }
          }
        });
        
        if (!existingMembership) {
          // Create membership
          await prisma.runCrewMembership.create({
            data: {
              runCrewId: runCrewId,
              athleteId: athlete.id
            }
          });
          console.log('✅ ATHLETE CREATE: Auto-joined RunCrew:', runCrewId);
        } else {
          console.log('ℹ️ ATHLETE CREATE: Already a member of this RunCrew');
        }
        
        // Mark join code as redeemed (optional - if you want to track this)
        // await prisma.joinCode.update({
        //   where: { code: joinCode },
        //   data: { redeemed: true } // If you add this field to schema
        // });
        
        // Clean up join context
        await deleteJoinContext(sessionId);
        console.log('✅ ATHLETE CREATE: Join context cleaned up');
      } else {
        console.log('ℹ️ ATHLETE CREATE: No join context found (may have expired)');
      }
    }

    // Format response
    const response = AthleteFindOrCreateService.formatResponse(athlete);
    
    // Add runCrewId to response if joined
    if (runCrewId) {
      response.runCrewId = runCrewId;
      response.joinedRunCrew = true;
    }

    // Always return 200 - frontend routes based on gofastHandle, not HTTP status
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ ATHLETE CREATE: Error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message,
      message: 'Failed to find or create athlete'
    });
  }
});

/**
 * Get All Athletes
 * GET /api/athlete
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    console.log('👥 ATHLETE: Fetching all athletes...');
    
    const athletes = await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ ATHLETE: Found', athletes.length, 'athletes');
    
    res.json({
      success: true,
      message: `Found ${athletes.length} athletes`,
      count: athletes.length,
      data: athletes
    });
  } catch (error) {
    console.error('❌ ATHLETE: Error fetching athletes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athletes',
      message: error.message
    });
  }
});

/**
 * Get tokens by athleteId - SPECIFIC ROUTE BEFORE /:id
 * GET /api/athlete/tokenretrieve?athleteId=xxx
 */
router.get('/tokenretrieve', async (req, res) => {
  console.log('🎯 TOKEN RETRIEVE ROUTE HIT!', req.query);
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      console.log('❌ No athleteId provided');
      return res.status(400).json({ error: 'athleteId is required' });
    }

    console.log('🔍 Looking for athlete:', athleteId);
    const prisma = getPrismaClient();
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        email: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        garmin_expires_in: true,
        garmin_scope: true,
        garmin_user_id: true,
        garmin_connected_at: true,
        garmin_is_connected: true
      }
    });

    if (!athlete) {
      console.log('❌ Athlete not found:', athleteId);
      return res.status(404).json({ error: 'Athlete not found' });
    }

    console.log('✅ Athlete found:', athlete.email, 'Tokens:', !!athlete.garmin_access_token);
    res.json({
      success: true,
      athleteId: athlete.id,
      email: athlete.email,
      garmin: {
        connected: athlete.garmin_is_connected || false,
        userId: athlete.garmin_user_id || null,
        connectedAt: athlete.garmin_connected_at || null,
        scope: athlete.garmin_scope || null,
        hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
        // Include actual tokens for localStorage
        accessToken: athlete.garmin_access_token || null,
        refreshToken: athlete.garmin_refresh_token || null,
        expiresIn: athlete.garmin_expires_in || null
      }
    });

  } catch (error) {
    console.error('❌ Token retrieve error:', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

/**
 * Get Athlete by ID
 * GET /api/athlete/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    console.log('👤 ATHLETE: Fetching athlete by ID:', id);
    
    const athlete = await prisma.athlete.findUnique({
      where: { id }
    });
    
    if (!athlete) {
      console.log('❌ ATHLETE: Athlete not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID: ${id}`
      });
    }
    
    console.log('✅ ATHLETE: Athlete found:', athlete.email);
    
    res.json({
      success: true,
      message: 'Athlete found',
      data: athlete
    });
  } catch (error) {
    console.error('❌ ATHLETE: Error fetching athlete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athlete',
      message: error.message
    });
  }
});

/**
 * Update Athlete
 * PUT /api/athlete/:id
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('✏️ ATHLETE: Updating athlete:', id);
    console.log('✏️ ATHLETE: Update data:', updateData);
    
    const athlete = await prisma.athlete.update({
      where: { id },
      data: updateData
    });
    
    console.log('✅ ATHLETE: Athlete updated successfully');
    
    res.json({
      success: true,
      message: 'Athlete updated successfully',
      data: athlete
    });
  } catch (error) {
    console.error('❌ ATHLETE: Error updating athlete:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update athlete',
      message: error.message
    });
  }
});

/**
 * Delete Athlete
 * DELETE /api/athlete/:id
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    console.log('🗑️ ATHLETE: Deleting athlete:', id);
    
    const athlete = await prisma.athlete.delete({
      where: { id }
    });
    
    console.log('✅ ATHLETE: Athlete deleted successfully');
    
    res.json({
      success: true,
      message: 'Athlete deleted successfully',
      data: athlete
    });
  } catch (error) {
    console.error('❌ ATHLETE: Error deleting athlete:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to delete athlete',
      message: error.message
    });
  }
});

/**
 * Find Athlete Only (for signin)
 * POST /api/athlete/find
 * Only finds existing athletes - no creation
 */
router.post('/find', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { firebaseId, email } = req.body;
    
    console.log('🔍 ATHLETE FIND: ===== ATHLETE LOOKUP (VERIFIED) =====');
    console.log('🔍 ATHLETE FIND: Firebase ID:', firebaseId);
    console.log('🔍 ATHLETE FIND: Email:', email);
    console.log('✅ ATHLETE FIND: Firebase token verified successfully!');
    
    if (!firebaseId || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        required: ['firebaseId', 'email']
      });
    }
    
    // 1. Find existing Athlete by firebaseId first
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (athlete) {
      console.log('✅ ATHLETE FIND: Found by Firebase ID:', athlete.id);
      return res.json({
        success: true,
        message: 'Athlete found by Firebase ID',
        athleteId: athlete.id,
        data: athlete
      });
    }
    
    // 2. Find by email (but don't link Firebase ID)
    athlete = await prisma.athlete.findFirst({
      where: { email }
    });
    
    if (athlete) {
      console.log('✅ ATHLETE FIND: Found by email:', athlete.id);
      return res.json({
        success: true,
        message: 'Athlete found by email',
        athleteId: athlete.id,
        data: athlete
      });
    }
    
    // 3. NO USER FOUND - Send to signup
    console.log('❌ ATHLETE FIND: No athlete found - redirect to signup');
    return res.status(404).json({
      success: false,
      error: 'User not found',
      message: 'No existing athlete found. Please sign up first.',
      code: 'USER_NOT_FOUND',
      redirectTo: '/signup'
    });
    
  } catch (error) {
    console.error('❌ ATHLETE FIND: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

/**
 * Update Athlete
 * PUT /api/athlete/:id
 * Update athlete data (admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('🔄 ATHLETE UPDATE: Updating athlete:', id);
    console.log('🔄 ATHLETE UPDATE: Update data:', updateData);
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.athleteId;
    delete updateData.createdAt;
    delete updateData.firebaseId; // Don't allow changing Firebase ID
    
    const updatedAthlete = await prisma.athlete.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ ATHLETE UPDATE: Successfully updated athlete:', updatedAthlete.id);
    
    res.json({
      success: true,
      message: 'Athlete updated successfully',
      athlete: updatedAthlete
    });
    
  } catch (error) {
    console.error('❌ ATHLETE UPDATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update athlete',
      message: error.message
    });
  }
});

/**
 * Delete Athlete with Cascading Deletes
 * DELETE /api/athlete/:id
 * Delete athlete and all related data (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    
    console.log('🗑️ ATHLETE DELETE: Starting cascading delete for athlete:', id);
    
    // Check if athlete exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!athlete) {
      console.log('❌ ATHLETE DELETE: Athlete not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID ${id}`
      });
    }
    
    console.log('🔄 ATHLETE DELETE: Found athlete, starting cascading deletes...');
    
    // CASCADING DELETE SERVICE
    // Delete all related data first, then the athlete
    
    const deletedData = {
      athlete: null,
      trainingPlans: 0,
      runCrewMemberships: 0,
      matches: 0,
      activities: 0,
      messages: 0
    };
    
    try {
      // 1. Delete Training Plans (when they exist)
      // const trainingPlans = await prisma.trainingPlan.deleteMany({
      //   where: { athleteId: parseInt(id) }
      // });
      // deletedData.trainingPlans = trainingPlans.count;
      // console.log('🗑️ CASCADE: Deleted', trainingPlans.count, 'training plans');
      
      // 2. Delete Run Crew Memberships (when they exist)
      // const runCrewMemberships = await prisma.runCrewMember.deleteMany({
      //   where: { athleteId: parseInt(id) }
      // });
      // deletedData.runCrewMemberships = runCrewMemberships.count;
      // console.log('🗑️ CASCADE: Deleted', runCrewMemberships.count, 'run crew memberships');
      
      // 3. Delete Matches (when they exist)
      // const matches = await prisma.match.deleteMany({
      //   where: { 
      //     OR: [
      //       { athlete1Id: parseInt(id) },
      //       { athlete2Id: parseInt(id) }
      //     ]
      //   }
      // });
      // deletedData.matches = matches.count;
      // console.log('🗑️ CASCADE: Deleted', matches.count, 'matches');
      
      // 4. Delete Activities (when they exist)
      // const activities = await prisma.activity.deleteMany({
      //   where: { athleteId: parseInt(id) }
      // });
      // deletedData.activities = activities.count;
      // console.log('🗑️ CASCADE: Deleted', activities.count, 'activities');
      
      // 5. Delete Messages (when they exist)
      // const messages = await prisma.message.deleteMany({
      //   where: { 
      //     OR: [
      //       { senderId: parseInt(id) },
      //       { receiverId: parseInt(id) }
      //     ]
      //   }
      // });
      // deletedData.messages = messages.count;
      // console.log('🗑️ CASCADE: Deleted', messages.count, 'messages');
      
      console.log('✅ CASCADE: All related data deleted (none exist yet)');
      
      // 6. Finally, delete the athlete
      deletedData.athlete = await prisma.athlete.delete({
        where: { id: parseInt(id) }
      });
      
      console.log('✅ ATHLETE DELETE: Successfully deleted athlete and all related data:', id);
      
      res.json({
        success: true,
        message: 'Athlete and all related data deleted successfully',
        deletedData: {
          athlete: {
            id: deletedData.athlete.id,
            email: deletedData.athlete.email,
            firstName: deletedData.athlete.firstName,
            lastName: deletedData.athlete.lastName
          },
          cascadingDeletes: {
            trainingPlans: deletedData.trainingPlans,
            runCrewMemberships: deletedData.runCrewMemberships,
            matches: deletedData.matches,
            activities: deletedData.activities,
            messages: deletedData.messages
          }
        }
      });
      
    } catch (cascadeError) {
      console.error('❌ CASCADE ERROR: Failed to delete related data:', cascadeError);
      throw cascadeError;
    }
    
  } catch (error) {
    console.error('❌ ATHLETE DELETE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete athlete',
      message: error.message
    });
  }
});

export default router;
