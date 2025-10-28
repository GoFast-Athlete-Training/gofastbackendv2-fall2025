import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple route to get tokens by athleteId
router.get('/tokenretrieve', async (req, res) => {
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' });
    }

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
      return res.status(404).json({ error: 'Athlete not found' });
    }

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
