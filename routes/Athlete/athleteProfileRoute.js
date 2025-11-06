// Athlete Profile Update Route
// Updates athlete profile with full data from AthleteCreateProfile form

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Update Athlete Profile
 * PUT /api/athlete/:id/profile
 * Updates athlete with full profile data
 * Requires: Firebase token authentication
 */
router.put('/:id/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    const firebaseId = req.user?.uid;
    
    const {
      firstName,
      lastName,
      phoneNumber,
      gofastHandle,
      birthday,
      gender,
      city,
      state,
      primarySport,
      bio,
      instagram,
      photoURL
    } = req.body;

    console.log('📝 PROFILE: Updating athlete:', id);
    console.log('📝 PROFILE: Firebase ID:', firebaseId);
    console.log('📝 PROFILE: Data:', req.body);

    // Verify athlete belongs to this Firebase user (security check)
    const existingAthlete = await prisma.athlete.findUnique({
      where: { id },
      select: { firebaseId: true }
    });

    if (!existingAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    if (existingAthlete.firebaseId !== firebaseId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own profile'
      });
    }

    // Update athlete profile
    const athlete = await prisma.athlete.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phoneNumber,
        gofastHandle,
        birthday: birthday ? new Date(birthday) : null,
        gender,
        city,
        state,
        primarySport,
        bio,
        instagram,
        photoURL: photoURL || null // Handle photoURL
      }
    });

    console.log('✅ PROFILE: Updated athlete:', athlete.id);

    res.json({
      success: true,
      athlete: {
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
        bio: athlete.bio,
        instagram: athlete.instagram,
        photoURL: athlete.photoURL
      }
    });

  } catch (error) {
    console.error('❌ PROFILE: Update error:', error);
    
    // Handle unique constraint violations (e.g., duplicate gofastHandle)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate ${field}`,
        message: `This ${field} is already taken. Please choose another one.`,
        field: field
      });
    }
    
    // Handle record not found
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: 'The athlete record does not exist'
      });
    }
    
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;

