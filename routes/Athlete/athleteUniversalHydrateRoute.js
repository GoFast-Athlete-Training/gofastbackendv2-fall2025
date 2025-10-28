import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// UNIVERSAL HYDRATE - Find athlete by Firebase ID and return full data
router.get('/universal-hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { firebaseId } = req.user; // From Firebase middleware
    
    console.log('🚀 UNIVERSAL HYDRATE: Finding athlete by Firebase ID:', firebaseId);
    
    // Find athlete by Firebase ID
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (!athlete) {
      console.log('❌ UNIVERSAL HYDRATE: No athlete found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: 'No athlete found for this Firebase user. Please sign up first.',
        code: 'ATHLETE_NOT_FOUND'
      });
    }
    
    console.log('✅ UNIVERSAL HYDRATE: Found athlete:', athlete.id, athlete.email);
    
    // Format athlete data for frontend consumption
    const hydratedAthlete = {
      athleteId: athlete.id,
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
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
      
      // Computed fields
      fullName: athlete.firstName && athlete.lastName 
        ? `${athlete.firstName} ${athlete.lastName}` 
        : 'No Name Set',
      profileComplete: !!(athlete.firstName && athlete.lastName),
      hasLocation: !!(athlete.city && athlete.state),
      hasSport: !!athlete.primarySport,
      hasBio: !!athlete.bio
    };
    
    console.log('🎯 UNIVERSAL HYDRATE: Returning hydrated athlete data');
    
    res.json({
      success: true,
      message: 'Athlete hydrated successfully',
      athlete: hydratedAthlete,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ UNIVERSAL HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

export default router;
