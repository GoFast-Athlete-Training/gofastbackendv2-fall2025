// Athlete Route - Main athlete CRUD operations
// Follows api/athlete pattern with api/athlete/create

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { debugFirebaseToken, verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Create Athlete from Firebase data
 * POST /api/athlete/create
 * Links Firebase authentication to Athlete record
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    console.log('🔐 ATHLETE: ===== ATHLETE CREATION (VERIFIED) =====');
    console.log('🔐 ATHLETE: Firebase ID:', firebaseId);
    console.log('🔐 ATHLETE: Email:', email);
    console.log('🔐 ATHLETE: First Name:', firstName);
    console.log('🔐 ATHLETE: Last Name:', lastName);
    console.log('🔐 ATHLETE: Photo URL:', photoURL);
    console.log('🔐 ATHLETE: Firebase User (verified):', req.user);
    console.log('✅ ATHLETE: Firebase token verified successfully!');
    
    if (!firebaseId || !email) {
      console.log('❌ ATHLETE: Missing required fields - firebaseId or email');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        required: ['firebaseId', 'email'],
        received: { firebaseId: !!firebaseId, email: !!email }
      });
    }
    
    console.log('🔐 ATHLETE: Starting athlete lookup/creation process...');
    
    // 1. Find existing Athlete by firebaseId first
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (athlete) {
      console.log('✅ ATHLETE: Existing Athlete found:', athlete.id);
      console.log('✅ ATHLETE: Athlete email:', athlete.email);
      console.log('✅ ATHLETE: Athlete status:', athlete.status);
      return res.json({
        success: true,
        message: 'Existing athlete found',
        athleteId: athlete.id,
        data: {
          id: athlete.id,
          firebaseId: athlete.firebaseId,
          email: athlete.email,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          gofastHandle: athlete.gofastHandle,
          birthday: athlete.birthday,
          gender: athlete.gender,
          city: athlete.city,
          state: athlete.state,
          primarySport: athlete.primarySport,
          photoURL: athlete.photoURL,
          bio: athlete.bio,
          instagram: athlete.instagram,
          status: athlete.status,
          createdAt: athlete.createdAt
        }
      });
    }
    
    // 2. Find existing Athlete by email (might have been pre-created)
    athlete = await prisma.athlete.findFirst({
      where: { email }
    });
    
    if (athlete) {
      console.log('✅ ATHLETE: Athlete found by email - linking firebaseId:', athlete.id);
      console.log('✅ ATHLETE: Linking firebaseId to existing athlete');
      // Link firebaseId to existing Athlete
      athlete = await prisma.athlete.update({
        where: { id: athlete.id },
        data: { 
          firebaseId,
          photoURL: photoURL || undefined
        }
      });
      
      console.log('✅ ATHLETE: Successfully linked firebaseId to existing athlete');
      return res.json({
        success: true,
        message: 'Firebase ID linked to existing athlete',
        athleteId: athlete.id,
        data: {
          id: athlete.id,
          firebaseId: athlete.firebaseId,
          email: athlete.email,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          gofastHandle: athlete.gofastHandle,
          birthday: athlete.birthday,
          gender: athlete.gender,
          city: athlete.city,
          state: athlete.state,
          primarySport: athlete.primarySport,
          photoURL: athlete.photoURL,
          bio: athlete.bio,
          instagram: athlete.instagram,
          status: athlete.status,
          createdAt: athlete.createdAt
        }
      });
    }
    
    // 3. No Athlete found - Create new Athlete
    console.log('📝 ATHLETE: Creating new Athlete for email:', email);
    console.log('📝 ATHLETE: Firebase ID:', firebaseId);
    
    athlete = await prisma.athlete.create({
      data: {
        firebaseId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        photoURL: photoURL || null,
        status: 'active'
      }
    });
    
    console.log('✅ ATHLETE: ===== ATHLETE CREATED SUCCESSFULLY =====');
    console.log('✅ ATHLETE: New Athlete ID:', athlete.id);
    console.log('✅ ATHLETE: Athlete Email:', athlete.email);
    console.log('✅ ATHLETE: Athlete Firebase ID:', athlete.firebaseId);
    console.log('✅ ATHLETE: Athlete Status:', athlete.status);
    console.log('✅ ATHLETE: Athlete Created At:', athlete.createdAt);
    
    res.status(201).json({
      success: true,
      message: 'Athlete created successfully',
      athleteId: athlete.id,
      data: {
        id: athlete.id,
        firebaseId: athlete.firebaseId,
        email: athlete.email,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        photoURL: athlete.photoURL,
        status: athlete.status,
        createdAt: athlete.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ ATHLETE: ===== ATHLETE CREATION ERROR =====');
    console.error('❌ ATHLETE: Error message:', error.message);
    console.error('❌ ATHLETE: Error stack:', error.stack);
    console.error('❌ ATHLETE: Full error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message,
      message: 'Failed to create/find athlete'
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
 * Delete Athlete
 * DELETE /api/athlete/:id
 * Delete athlete from database (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    
    console.log('🗑️ ATHLETE DELETE: Deleting athlete:', id);
    
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
    
    // Delete the athlete
    await prisma.athlete.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('✅ ATHLETE DELETE: Successfully deleted athlete:', id);
    
    res.json({
      success: true,
      message: 'Athlete deleted successfully',
      deletedAthlete: {
        id: athlete.id,
        email: athlete.email,
        firstName: athlete.firstName,
        lastName: athlete.lastName
      }
    });
    
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
