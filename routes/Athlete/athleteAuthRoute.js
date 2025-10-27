// Athlete Auth Route - Firebase authentication to Athlete record
// Based on athlete-first architecture from AUTH-FLOW.md

import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create or Find Athlete from Firebase data
 * POST /api/auth/athleteuser
 * Links Firebase authentication to Athlete record
 */
router.post('/athleteuser', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    console.log('🔐 AUTH: FindOrCreate for firebaseId:', firebaseId);
    
    // 1. Find existing Athlete by firebaseId first
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (athlete) {
      console.log('✅ AUTH: Existing Athlete found:', athlete.id);
      return res.json({
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
        instagram: athlete.instagram
      });
    }
    
    // 2. Find existing Athlete by email (might have been pre-created)
    athlete = await prisma.athlete.findFirst({
      where: { email }
    });
    
    if (athlete) {
      console.log('✅ AUTH: Athlete found by email - linking firebaseId:', athlete.id);
      // Link firebaseId to existing Athlete
      athlete = await prisma.athlete.update({
        where: { id: athlete.id },
        data: { 
          firebaseId,
          photoURL: photoURL || undefined
        }
      });
      
      return res.json({
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
        instagram: athlete.instagram
      });
    }
    
    // 3. No Athlete found - Create new Athlete
    console.log('📝 AUTH: Creating new Athlete for:', email);
    
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
    
    console.log('✅ AUTH: New Athlete created:', athlete.id);
    
    res.status(201).json({
      id: athlete.id,
      firebaseId: athlete.firebaseId,
      email: athlete.email,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      photoURL: athlete.photoURL
    });
    
  } catch (error) {
    console.error('❌ AUTH: FindOrCreate error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
