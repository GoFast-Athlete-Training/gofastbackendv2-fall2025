// Athlete Auth Route - Firebase authentication to Athlete record
// Based on athlete-first architecture from AUTH-FLOW.md

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { debugFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create or Find Athlete from Firebase data
 * POST /api/auth/athleteuser
 * Links Firebase authentication to Athlete record
 */
router.post('/athleteuser', debugFirebaseToken, async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL, firebaseToken } = req.body;
    
    console.log('🔐 AUTH: ===== ATHLETE CREATION DEBUG =====');
    console.log('🔐 AUTH: Firebase ID:', firebaseId);
    console.log('🔐 AUTH: Email:', email);
    console.log('🔐 AUTH: First Name:', firstName);
    console.log('🔐 AUTH: Last Name:', lastName);
    console.log('🔐 AUTH: Photo URL:', photoURL);
    console.log('🔐 AUTH: Firebase Token Present:', !!firebaseToken);
    console.log('🔐 AUTH: Token Length:', firebaseToken ? firebaseToken.length : 0);
    
    // TODO: Add Firebase token verification here
    // For now, just log that we're skipping verification
    console.log('⚠️ AUTH: WARNING - Firebase token verification not implemented yet!');
    console.log('⚠️ AUTH: This is a security risk - anyone can create athletes!');
    
    if (!firebaseId || !email) {
      console.log('❌ AUTH: Missing required fields - firebaseId or email');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firebaseId', 'email'],
        received: { firebaseId: !!firebaseId, email: !!email }
      });
    }
    
    console.log('🔐 AUTH: Starting athlete lookup/creation process...');
    
    // 1. Find existing Athlete by firebaseId first
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (athlete) {
      console.log('✅ AUTH: Existing Athlete found:', athlete.id);
      console.log('✅ AUTH: Athlete email:', athlete.email);
      console.log('✅ AUTH: Athlete status:', athlete.status);
      return res.json({
        success: true,
        message: 'Existing athlete found',
        athleteId: athlete.id,
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
      console.log('✅ AUTH: Linking firebaseId to existing athlete');
      // Link firebaseId to existing Athlete
      athlete = await prisma.athlete.update({
        where: { id: athlete.id },
        data: { 
          firebaseId,
          photoURL: photoURL || undefined
        }
      });
      
      console.log('✅ AUTH: Successfully linked firebaseId to existing athlete');
      return res.json({
        success: true,
        message: 'Firebase ID linked to existing athlete',
        athleteId: athlete.id,
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
    console.log('📝 AUTH: Creating new Athlete for email:', email);
    console.log('📝 AUTH: Firebase ID:', firebaseId);
    
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
    
    console.log('✅ AUTH: ===== ATHLETE CREATED SUCCESSFULLY =====');
    console.log('✅ AUTH: New Athlete ID:', athlete.id);
    console.log('✅ AUTH: Athlete Email:', athlete.email);
    console.log('✅ AUTH: Athlete Firebase ID:', athlete.firebaseId);
    console.log('✅ AUTH: Athlete Status:', athlete.status);
    console.log('✅ AUTH: Athlete Created At:', athlete.createdAt);
    
    res.status(201).json({
      success: true,
      message: 'Athlete created successfully',
      athleteId: athlete.id,
      id: athlete.id,
      firebaseId: athlete.firebaseId,
      email: athlete.email,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      photoURL: athlete.photoURL,
      status: athlete.status,
      createdAt: athlete.createdAt
    });
    
  } catch (error) {
    console.error('❌ AUTH: ===== ATHLETE CREATION ERROR =====');
    console.error('❌ AUTH: Error message:', error.message);
    console.error('❌ AUTH: Error stack:', error.stack);
    console.error('❌ AUTH: Full error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message,
      message: 'Failed to create/find athlete'
    });
  }
});

export default router;
