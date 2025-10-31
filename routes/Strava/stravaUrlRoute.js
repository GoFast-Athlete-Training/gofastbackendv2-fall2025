import express from 'express';
import dotenv from 'dotenv';
import { resolveAthleteId } from '../../services/athleteService.js';

dotenv.config();

const router = express.Router();

// GET /api/strava/auth - Build Strava authorization URL with state=athleteId
router.get('/auth', async (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.STRAVA_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: 'STRAVA_CLIENT_ID or STRAVA_REDIRECT_URI not configured' });
    }

    const athleteId = resolveAthleteId(req.query) || req.user?.id;
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' });
    }

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all,profile:read_all&approval_prompt=auto&state=${encodeURIComponent(athleteId)}`;
    return res.json({ url: authUrl });
  } catch (err) {
    console.error('Strava URL generation error:', err);
    return res.status(500).json({ error: 'Failed to generate Strava OAuth URL' });
  }
});

export default router;

