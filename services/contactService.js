/**
 * Contact Service - Pipeline Stage Management
 * 
 * Handles contact pipeline stage updates with config validation
 */

import { getPrismaClient } from '../config/database.js';
import { validateStage, getAudienceConfig } from '../config/pipelineConfig.js';

/**
 * Update contact pipeline stage
 * Validates stage against pipelineConfig before updating
 * Auto-generates pipelineId if not present
 * 
 * @param {string} contactId - Contact ID
 * @param {string} audienceType - Audience type (e.g., "EliteRunner", "RunClub")
 * @param {string} stage - Pipeline stage (e.g., "Interest", "Meeting", "Agreement")
 * @param {string} pipelineId - Optional pipeline ID (auto-generated if not provided)
 * @returns {Promise<Object>} Updated contact
 */
export async function updateContactStage(contactId, audienceType, stage, pipelineId = null) {
  const prisma = getPrismaClient();

  // Validate audience type exists
  const config = getAudienceConfig(audienceType);
  if (!config) {
    throw new Error(`Invalid audience type: ${audienceType}`);
  }

  // Validate stage is valid for this audience type
  validateStage(audienceType, stage);

  // Get current contact to check if pipelineId exists
  const currentContact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  // Generate pipelineId if not provided and contact doesn't have one
  const finalPipelineId = pipelineId || currentContact?.pipelineId || `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Update contact
  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: {
      pipelineId: finalPipelineId,
      audienceType,
      pipelineStage: stage,
    },
    include: {
      company: true,
    },
  });

  return contact;
}

/**
 * Get all contacts with their pipeline information
 * 
 * @param {string} companyId - Company ID (optional, filters by company)
 * @returns {Promise<Array>} Array of contacts with pipeline data
 */
export async function getContactsWithPipeline(companyId = null) {
  const prisma = getPrismaClient();

  const where = companyId ? { companyId } : {};

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Enrich with pipeline config data
  return contacts.map(contact => {
    const config = contact.audienceType 
      ? getAudienceConfig(contact.audienceType)
      : null;

    return {
      ...contact,
      pipelineConfig: config, // Attach config for frontend use
    };
  });
}

