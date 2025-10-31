import express from 'express';
import dotenv from 'dotenv';
import { getPrismaClient } from '../../config/database.js';
import { resolveAthleteId } from '../../services/athleteService.js';

dotenv.config();

const router = express.Router();

// GET /api/strava/callback - Exchange code and update athlete
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const athleteId = resolveAthleteId(req.query);
    if (!code || !athleteId) {
      return res.status(400).json({ error: 'Missing code or state (athleteId)' });
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    const tokenResp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResp.ok) {
      const text = await tokenResp.text();
      console.error('Strava token exchange failed:', text);
      return res.status(502).json({ error: 'Strava token exchange failed', details: text });
    }

    const data = await tokenResp.json();
    const prisma = getPrismaClient();

    const stravaId = data?.athlete?.id ? Number(data.athlete.id) : null;
    if (!stravaId) {
      return res.status(500).json({ error: 'No Strava athlete id in token response' });
    }

    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        strava_id: stravaId,
        strava_access_token: data?.access_token || null,
        strava_refresh_token: data?.refresh_token || null,
        strava_expires_at: data?.expires_at || null
      }
    });

    const redirectUrl = 'https://athlete.gofastcrushgoals.com/stravasuccess';
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Strava callback error:', err);
    return res.status(500).json({ error: 'Failed to handle Strava callback' });
  }
});

export default router;

