// GoFast Athlete Hydration Routes (Legacy/User-facing)
// Pattern: Query container athlete + hydrate frontend
// NOTE: Admin hydrate routes moved to routes/Admin/adminHydrateRoute.js

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * GET /api/athlete/athletesallhydrate (Legacy route)
 * DEPRECATED: Use /api/admin/athletes/hydrate instead
 * Kept for backward compatibility
 */
router.get('/athletesallhydrate', async (req, res) => {
  try {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const prisma = getPrismaClient();
    console.log('🔄 ATHLETE HYDRATE: Loading all athletes for admin (SQL/Prisma)...');
    
    // SQL equivalent of MongoDB find() with sort
    const athletes = await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
      // No include needed yet - single table for now
    });
    
    // Redirect to new admin route
    console.log('⚠️ LEGACY ROUTE: /athletesallhydrate - Redirecting to /api/admin/athletes/hydrate');
    return res.redirect(307, '/api/admin/athletes/hydrate');
});
    
// Legacy route - kept for backward compatibility but redirects

export default router;
