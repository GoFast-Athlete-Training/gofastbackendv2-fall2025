// Athlete Profile Update Route
// Updates athlete profile with full data from AthleteCreateProfile form

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Update Athlete Profile
 * PUT /api/athlete/:id/profile
 * Updates athlete with full profile data
 */
router.put('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
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
    console.log('📝 PROFILE: Data:', req.body);

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
        ...(photoURL && { photoURL })
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
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;

