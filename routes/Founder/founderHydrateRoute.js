// Founder Hydrate Route
// GET /api/founder/hydrate
// Loads all Founder data for the FounderOutlook frontend
// Hydrates: Founder profile, tasks, CRM contacts, roadmap items

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Hydrate Founder Data
 * GET /api/founder/hydrate
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Find Founder via Athlete relation
 * 3. Load all related data (tasks, CRM, roadmaps)
 * 4. Return formatted response for frontend
 * 
 * Response Structure:
 * {
 *   success: true,
 *   founder: { id, athleteId, athlete, tasks, crmContacts, roadmaps }
 * }
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    
    console.log('🔄 FOUNDER HYDRATE: Loading Founder data for Firebase ID:', firebaseId);
    
    // Find Founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'desc' }
        },
        crmContacts: {
          orderBy: { createdAt: 'desc' }
        },
        roadmapItems: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!founder) {
      console.log('❌ FOUNDER HYDRATE: Founder not found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'Founder not found',
        message: 'No Founder profile found. Please create a Founder profile first.'
      });
    }
    
    console.log('✅ FOUNDER HYDRATE: Found Founder with', 
      founder.tasks.length, 'tasks,',
      founder.crmContacts.length, 'CRM contacts,',
      founder.roadmapItems.length, 'roadmap items'
    );
    
    // Group roadmap items by type
    const roadmaps = {
      product: founder.roadmapItems.filter(item => item.roadmapType === 'product'),
      gtm: founder.roadmapItems.filter(item => item.roadmapType === 'gtm'),
      personal: founder.roadmapItems.filter(item => item.roadmapType === 'personal')
    };
    
    res.json({
      success: true,
      message: 'Founder data hydrated successfully',
      founder: {
        id: founder.id,
        athleteId: founder.athleteId,
        athlete: founder.athlete,
        tasks: founder.tasks,
        crmContacts: founder.crmContacts,
        roadmaps,
        createdAt: founder.createdAt,
        updatedAt: founder.updatedAt
      },
      counts: {
        tasks: founder.tasks.length,
        crmContacts: founder.crmContacts.length,
        roadmaps: founder.roadmapItems.length,
        product: roadmaps.product.length,
        gtm: roadmaps.gtm.length,
        personal: roadmaps.personal.length
      }
    });
    
  } catch (error) {
    console.error('❌ FOUNDER HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate Founder data',
      message: error.message
    });
  }
});

export default router;

