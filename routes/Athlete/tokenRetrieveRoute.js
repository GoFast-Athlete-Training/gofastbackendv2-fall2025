import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple route to get tokens by athleteId
router.get('/tokenretrieve', async (req, res) => {
  console.log('🎯 TOKEN RETRIEVE ROUTE HIT!', req.query);
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      console.log('❌ No athleteId provided');
      return res.status(400).json({ error: 'athleteId is required' });
    }

    console.log('🔍 Looking for athlete:', athleteId);
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

export default router;
