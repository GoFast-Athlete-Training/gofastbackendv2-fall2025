import express from 'express';
import dotenv from 'dotenv';
import { getPrismaClient } from '../../config/database.js';
import { resolveAthleteId } from '../../services/athleteService.js';

dotenv.config();

const router = express.Router();

// GET /api/strava/activities - Fetch recent activities for athlete
router.get('/activities', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const athleteId = resolveAthleteId(req.query);
    if (!athleteId) return res.status(400).json({ error: 'athleteId is required' });

    const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete || !athlete.strava_access_token) {
      return res.status(404).json({ error: 'Athlete not connected to Strava' });
    }

    const baseUrl = process.env.STRAVA_BASE_URL || 'https://www.strava.com/api/v3';
    const resp = await fetch(`${baseUrl}/athlete/activities?per_page=5`, {
      headers: { Authorization: `Bearer ${athlete.strava_access_token}` }
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Strava activities fetch failed:', text);
      return res.status(502).json({ error: 'Failed to fetch Strava activities', details: text });
    }

    const json = await resp.json();
    return res.json(json);
  } catch (err) {
    console.error('Strava activities error:', err);
    return res.status(500).json({ error: 'Failed to fetch Strava activities' });
  }
});

export default router;

