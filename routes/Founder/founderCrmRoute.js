// Founder CRM Route
// Handles all CRM contact-related endpoints for FounderOutlook

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get all CRM contacts
 * GET /api/founder/crm
 * Query: ?pipeline=Founders|Collaborators|Funders|Advisors&status=New|Warm|Active|Exploring
 */
router.get('/crm', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { pipeline, status } = req.query;

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Build where clause
    const where = { founderId: founder.id };
    if (pipeline) {
      where.pipeline = pipeline;
    }
    if (status) {
      where.status = status;
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: contacts.length,
      contacts
    });
  } catch (error) {
    console.error('❌ FOUNDER CRM GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get contacts grouped by pipeline
 * GET /api/founder/crm/pipelines
 */
router.get('/crm/pipelines', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    const contacts = await prisma.crmContact.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' }
    });

    // Group by pipeline
    const pipelines = {
      Founders: contacts.filter(c => c.pipeline === 'Founders'),
      Collaborators: contacts.filter(c => c.pipeline === 'Collaborators'),
      Funders: contacts.filter(c => c.pipeline === 'Funders'),
      Advisors: contacts.filter(c => c.pipeline === 'Advisors')
    };

    res.json({
      success: true,
      pipelines
    });
  } catch (error) {
    console.error('❌ FOUNDER CRM PIPELINES:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a new CRM contact
 * POST /api/founder/crm
 * Body: { name: string, role?: string, pipeline: string, status?: string, nextStep?: string, email?: string, company?: string, notes?: string }
 */
router.post('/crm', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { name, role, pipeline, status = 'New', nextStep, email, company, notes } = req.body;

    if (!name || !pipeline) {
      return res.status(400).json({
        success: false,
        error: 'Name and pipeline are required'
      });
    }

    // Validate pipeline
    const validPipelines = ['Founders', 'Collaborators', 'Funders', 'Advisors'];
    if (!validPipelines.includes(pipeline)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pipeline',
        validPipelines
      });
    }

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    const contact = await prisma.crmContact.create({
      data: {
        founderId: founder.id,
        name: name.trim(),
        role: role?.trim() || null,
        pipeline,
        status,
        nextStep: nextStep?.trim() || null,
        email: email?.trim() || null,
        company: company?.trim() || null,
        notes: notes?.trim() || null
      }
    });

    res.status(201).json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('❌ FOUNDER CRM CREATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update a CRM contact
 * PUT /api/founder/crm/:contactId
 * Body: { name?, role?, pipeline?, status?, nextStep?, email?, company?, notes? }
 */
router.put('/crm/:contactId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { contactId } = req.params;
    const { name, role, pipeline, status, nextStep, email, company, notes } = req.body;

    // Find founder
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify contact belongs to founder
    const existingContact = await prisma.crmContact.findFirst({
      where: {
        id: contactId,
        founderId: founder.id
      }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Validate pipeline if provided
    if (pipeline) {
      const validPipelines = ['Founders', 'Collaborators', 'Funders', 'Advisors'];
      if (!validPipelines.includes(pipeline)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pipeline',
          validPipelines
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) updateData.role = role?.trim() || null;
    if (pipeline !== undefined) updateData.pipeline = pipeline;
    if (status !== undefined) updateData.status = status;
    if (nextStep !== undefined) updateData.nextStep = nextStep?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (company !== undefined) updateData.company = company?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const contact = await prisma.crmContact.update({
      where: { id: contactId },
      data: updateData
    });

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('❌ FOUNDER CRM UPDATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a CRM contact
 * DELETE /api/founder/crm/:contactId
 */
router.delete('/crm/:contactId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { contactId } = req.params;

    // Find founder
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify contact belongs to founder and delete
    await prisma.crmContact.deleteMany({
      where: {
        id: contactId,
        founderId: founder.id
      }
    });

    res.json({
      success: true,
      message: 'Contact deleted'
    });
  } catch (error) {
    console.error('❌ FOUNDER CRM DELETE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

