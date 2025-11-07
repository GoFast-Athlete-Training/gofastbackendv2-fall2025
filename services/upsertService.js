// Upsert Service
// Maps string model value to Prisma model and handles mutation
// Flow: Route → Service (determine table) → Hit Prisma to mutate

import { getPrismaClient } from '../config/database.js';
import { UPSERT_CONFIG } from '../config/upsertConfig.js';

/**
 * Upsert a model record
 * @param {string} modelKey - Model key from UPSERT_CONFIG
 * @param {Object} data - Data to upsert (includes linkField and additionalFields)
 * @returns {Promise<Object>} - Upserted record
 */
export const upsertModel = async (modelKey, data) => {
  const prisma = getPrismaClient();
  const modelConfig = UPSERT_CONFIG.getModelConfig(modelKey);
  
  if (!modelConfig) {
    throw new Error(`Unknown model: ${modelKey}. Available models: ${UPSERT_CONFIG.getAvailableModels().map(m => m.value).join(', ')}`);
  }
  
  const { prismaModel, linkField, uniqueField } = modelConfig;
  
  // Validate Prisma model exists
  if (!prisma[prismaModel]) {
    throw new Error(`Prisma model '${prismaModel}' not found. Check schema.prisma.`);
  }
  
  // Build where clause for unique constraint
  let where = {};
  
  if (uniqueField.includes('_')) {
    // Composite unique constraint (e.g., runCrewId_athleteId)
    // Prisma format for composite unique: { field1_field2: { field1: value1, field2: value2 } }
    const fields = uniqueField.split('_');
    
    console.log(`🔧 UPSERT SERVICE: Building composite unique constraint: ${uniqueField}`, {
      fields,
      dataFields: Object.keys(data)
    });
    
    // Build composite where clause
    const compositeWhere = {};
    for (const field of fields) {
      if (!data[field]) {
        throw new Error(`Missing required field for composite unique: ${field}. Available fields: ${Object.keys(data).join(', ')}`);
      }
      compositeWhere[field] = data[field];
    }
    
    // For composite unique in Prisma upsert, use the constraint name format
    // The constraint name is auto-generated as field1_field2
    where = {
      [uniqueField]: compositeWhere
    };
    
    console.log(`✅ UPSERT SERVICE: Composite where clause built:`, where);
  } else {
    // Single field unique constraint
    const fieldValue = data[linkField] || data[uniqueField];
    if (!fieldValue) {
      throw new Error(`Missing required field: ${linkField || uniqueField}`);
    }
    where[uniqueField] = fieldValue;
  }
  
  console.log(`🔄 UPSERT SERVICE: Upserting ${modelConfig.name}`, {
    modelKey,
    prismaModel,
    uniqueField,
    where,
    data
  });
  
  // Upsert (create or update)
  const result = await prisma[prismaModel].upsert({
    where: where,
    update: data, // Update existing record
    create: data // Create new record if doesn't exist
  });
  
  console.log(`✅ UPSERT SERVICE: Successfully upserted ${modelConfig.name}`, {
    id: result.id,
    modelKey
  });
  
  return result;
};

/**
 * Validate upsert data against model config
 * @param {string} modelKey - Model key from UPSERT_CONFIG
 * @param {Object} data - Data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const validateUpsertData = (modelKey, data) => {
  const modelConfig = UPSERT_CONFIG.getModelConfig(modelKey);
  
  if (!modelConfig) {
    return {
      valid: false,
      errors: [`Unknown model: ${modelKey}`]
    };
  }
  
  const errors = [];
  
  // Validate linkField (athleteId)
  if (modelConfig.linkField && !data[modelConfig.linkField]) {
    errors.push(`Missing required field: ${modelConfig.linkField}`);
  }
  
  // Validate additional fields if required
  if (modelConfig.requiresAdditionalFields && modelConfig.additionalFields) {
    for (const field of modelConfig.additionalFields) {
      if (field.required && !data[field.name]) {
        errors.push(`Missing required field: ${field.label || field.name}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  upsertModel,
  validateUpsertData
};

