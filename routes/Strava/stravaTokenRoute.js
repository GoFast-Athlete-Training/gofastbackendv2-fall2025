import express from 'express';
import dotenv from 'dotenv';
import { getPrismaClient } from '../../config/database.js';
import { resolveAthleteId } from '../../services/athleteService.js';

dotenv.config();

const router = express.Router();

// GET /api/strava/token - Refresh or return current token (diagnostic)
router.get('/token', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const athleteId = resolveAthleteId(req.query);
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' });
    }

    const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = athlete.strava_expires_at || 0;

    // If expired (or within 60s), refresh
    if (athlete.strava_refresh_token && (!expiresAt || expiresAt - nowSec < 60)) {
      const resp = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: athlete.strava_refresh_token
        })
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('Strava refresh failed:', text);
        return res.status(502).json({ error: 'Failed to refresh token', details: text });
      }
      const json = await resp.json();
      const updated = await prisma.athlete.update({
        where: { id: athleteId },
        data: {
          strava_access_token: json.access_token || null,
          strava_refresh_token: json.refresh_token || athlete.strava_refresh_token,
          strava_expires_at: json.expires_at || null
        }
      });
      return res.json({ access_token: updated.strava_access_token, expires_at: updated.strava_expires_at });
    }

    // Not expired: return current
    return res.json({ access_token: athlete.strava_access_token || null, expires_at: expiresAt || null });
  } catch (err) {
    console.error('Strava token route error:', err);
    return res.status(500).json({ error: 'Token utility failed' });
  }
});

export default router;

