import express from "express";
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/garmin/user - Get current user's Garmin status
router.get("/user", async (req, res) => {
  try {
    // TODO: Get user ID from JWT token/auth middleware
    const userId = req.user?.id; // This should come from your auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Get user's Garmin connection status
    const athlete = await prisma.athlete.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_connected_at: true,
        garmin_last_sync_at: true,
        garmin_scope: true,
        // Don't return tokens for security
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      user: {
        id: athlete.id,
        email: athlete.email,
        garmin: {
          connected: !!athlete.garmin_user_id,
          userId: athlete.garmin_user_id,
          connectedAt: athlete.garmin_connected_at,
          lastSyncAt: athlete.garmin_last_sync_at,
          scope: athlete.garmin_scope
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Garmin user route error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user Garmin status' 
    });
  }
});

// POST /api/garmin/user/connect - Connect user to Garmin (called after OAuth success)
router.post("/user/connect", async (req, res) => {
  try {
    const { userId, garminUserId, accessToken, refreshToken, expiresIn, scope } = req.body;
    
    if (!userId || !garminUserId || !accessToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Update user's Garmin connection
    const updatedAthlete = await prisma.athlete.update({
      where: { id: userId },
      data: {
        garmin_user_id: garminUserId,
        garmin_access_token: accessToken,
        garmin_refresh_token: refreshToken,
        garmin_expires_in: expiresIn,
        garmin_scope: scope,
        garmin_connected_at: new Date(),
        garmin_last_sync_at: new Date()
      },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_connected_at: true,
        garmin_scope: true
      }
    });
    
    console.log('✅ Garmin connection saved for user:', userId);
    
    res.json({
      success: true,
      message: 'Garmin connected successfully',
      user: {
        id: updatedAthlete.id,
        email: updatedAthlete.email,
        garmin: {
          userId: updatedAthlete.garmin_user_id,
          connectedAt: updatedAthlete.garmin_connected_at,
          scope: updatedAthlete.garmin_scope
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Garmin user connect error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save Garmin connection' 
    });
  }
});

export default router;
