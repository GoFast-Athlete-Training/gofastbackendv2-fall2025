// Admin Upsert Routes
// Universal admin upsert system - creates model records and links to athleteId
// Pattern: Universal entry point → dynamically dispatches using MODEL_CONFIG

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { MODEL_CONFIG } from '../../config/modelConfig.js';

const router = express.Router();

// Handler functions will be defined below, then registry built at the end

/**
 * Generic Upsert Handler
 * Works with any model that follows the standard pattern:
 * - Links via athleteId (or linkField from config)
 * - Has unique constraint on linkField
 * - Returns standard response format
 */
async function genericUpsertHandler(req, res, modelConfig) {
  try {
    const prisma = getPrismaClient();
    const { athleteId } = req.body;
    const { prismaModel, linkField, uniqueField } = modelConfig;
    
    if (!prismaModel) {
      return res.status(500).json({
        success: false,
        error: 'Model configuration error',
        message: 'prismaModel not defined in MODEL_CONFIG'
      });
    }
    
    const linkFieldName = linkField || 'athleteId';
    const uniqueFieldName = uniqueField || linkFieldName;
    
    console.log(`🚀 GENERIC UPSERT ${modelConfig.name}: Athlete ID:`, athleteId);
    
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        required: [linkFieldName]
      });
    }
    
    // Verify athlete exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID: ${athleteId}`
      });
    }
    
    // Check if record already exists
    const existing = await prisma[prismaModel].findUnique({
      where: { [uniqueFieldName]: athleteId },
      include: {
        athlete: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
    
    if (existing) {
      return res.json({
        success: true,
        message: `${modelConfig.name} already exists`,
        [modelConfig.name.toLowerCase()]: existing
      });
    }
    
    // Create new record
    const created = await prisma[prismaModel].create({
      data: { [linkFieldName]: athleteId },
      include: {
        athlete: {
          select: { id: true, email: true, firstName: true, lastName: true }
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: `${modelConfig.name} created successfully`,
      [modelConfig.name.toLowerCase()]: created
    });
    
  } catch (error) {
    console.error(`❌ GENERIC UPSERT ${modelConfig.name}: Error:`, error);
    return res.status(500).json({
      success: false,
      error: `Failed to upsert ${modelConfig.name}`,
      message: error.message
    });
  }
}

/**
 * Entity-specific upsert handlers
 * Custom handlers for models that need special logic
 * These override the generic handler
 */

// Founder upsert handler (admin version - no Firebase auth required)
async function upsertFounder(req, res) {
  try {
    const prisma = getPrismaClient();
    const { athleteId } = req.body;
    
    console.log('🚀 ADMIN UPSERT FOUNDER: ===== UPSERTING FOUNDER =====');
    console.log('🚀 ADMIN UPSERT FOUNDER: Athlete ID:', athleteId);
    
    if (!athleteId) {
      console.log('❌ ADMIN UPSERT FOUNDER: Missing athleteId');
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        required: ['athleteId']
      });
    }
    
    // Verify athlete exists
    console.log('🔍 ADMIN UPSERT FOUNDER: Verifying athlete...');
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        photoURL: true
      }
    });
    
    if (!athlete) {
      console.log('❌ ADMIN UPSERT FOUNDER: Athlete not found:', athleteId);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID: ${athleteId}`
      });
    }
    
    console.log('✅ ADMIN UPSERT FOUNDER: Athlete verified:', athlete.email);
    
    // Check if Founder already exists
    let founder = await prisma.founder.findUnique({
      where: { athleteId },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });
    
    if (founder) {
      console.log('✅ ADMIN UPSERT FOUNDER: Existing Founder found:', founder.id);
      return res.json({
        success: true,
        message: 'Founder already exists',
        founder: {
          id: founder.id,
          athleteId: founder.athleteId,
          athlete: {
            id: founder.athlete.id,
            email: founder.athlete.email,
            firstName: founder.athlete.firstName,
            lastName: founder.athlete.lastName,
            photoURL: founder.athlete.photoURL
          },
          createdAt: founder.createdAt,
          updatedAt: founder.updatedAt
        }
      });
    }
    
    // Create new Founder
    console.log('📝 ADMIN UPSERT FOUNDER: Creating new Founder for athleteId:', athleteId);
    founder = await prisma.founder.create({
      data: {
        athleteId: athleteId
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });
    
    console.log('✅ ADMIN UPSERT FOUNDER: ===== FOUNDER CREATED SUCCESSFULLY =====');
    console.log('✅ ADMIN UPSERT FOUNDER: Founder ID:', founder.id);
    
    res.status(201).json({
      success: true,
      message: 'Founder created successfully',
      founder: {
        id: founder.id,
        athleteId: founder.athleteId,
        athlete: {
          id: founder.athlete.id,
          email: founder.athlete.email,
          firstName: founder.athlete.firstName,
          lastName: founder.athlete.lastName,
          photoURL: founder.athlete.photoURL
        },
        createdAt: founder.createdAt,
        updatedAt: founder.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ ADMIN UPSERT FOUNDER: ===== ERROR =====');
    console.error('❌ ADMIN UPSERT FOUNDER: Error message:', error.message);
    console.error('❌ ADMIN UPSERT FOUNDER: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to upsert Founder',
      message: error.message
    });
  }
}

/**
 * UNIVERSAL UPSERT ROUTE
 * POST /api/admin/upsert?model=founder
 * Universal entry point - dynamically dispatches using MODEL_CONFIG
 * 
 * How it works:
 * 1. Gets model from query param
 * 2. Looks up model config from MODEL_CONFIG
 * 3. Finds handler function from handlerRegistry
 * 4. Calls handler or uses generic upsert if no custom handler
 */
router.post('/upsert', async (req, res) => {
  const { model } = req.query;
  
  if (!model) {
    const availableModels = MODEL_CONFIG.getAvailableModels().map(m => m.value);
    return res.status(400).json({
      success: false,
      error: 'Model parameter required',
      message: `Specify model: ?model=${availableModels.join('|')}`,
      availableModels: availableModels
    });
  }

  console.log(`🔄 UNIVERSAL UPSERT: Requested model: ${model}`);

  // Get model config
  const modelConfig = MODEL_CONFIG.getModelConfig(model);
  
  if (!modelConfig) {
    const availableModels = MODEL_CONFIG.getAvailableModels().map(m => m.value);
    return res.status(400).json({
      success: false,
      error: 'Unknown model',
      message: `Model '${model}' not found in MODEL_CONFIG`,
      availableModels: availableModels
    });
  }

  // Get handler from registry
  const handler = handlerRegistry[model];
  
  if (handler) {
    // Custom handler exists - use it
    console.log(`✅ UNIVERSAL UPSERT: Using custom handler for ${model}`);
    return handler(req, res);
  } else {
    // No custom handler - use generic upsert
    console.log(`✅ UNIVERSAL UPSERT: Using generic handler for ${model}`);
    return genericUpsertHandler(req, res, modelConfig);
  }
});

/**
 * MODEL-SPECIFIC ROUTES (for direct access)
 * Dynamically creates routes for each model in MODEL_CONFIG
 * These can be called directly without going through universal route
 */

/**
 * Handler Registry
 * Maps model keys to custom handler functions
 * Built after all handlers are defined
 * If no custom handler exists, generic handler is used
 */
const handlerRegistry = {
  founder: upsertFounder
  // Add more custom handlers here as needed
  // Example: trainingGoal: upsertTrainingGoal,
};

// Dynamically register model-specific routes
MODEL_CONFIG.getAvailableModels().forEach(({ value: modelKey }) => {
  const modelConfig = MODEL_CONFIG.getModelConfig(modelKey);
  const handler = handlerRegistry[modelKey] || ((req, res) => genericUpsertHandler(req, res, modelConfig));
  
  router.post(`/upsert/${modelKey}`, handler);
  console.log(`✅ Registered route: POST /api/admin/upsert/${modelKey}`);
});

export default router;

