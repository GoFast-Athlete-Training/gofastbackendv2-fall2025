// Model Configuration for Universal Upsert System
// Defines which models can be upserted to an athleteId
// Used by Admin Upsert Wizard and Backend Routes

export const MODEL_CONFIG = {
  // Models that can be upserted (created and linked to athleteId)
  models: {
    founder: {
      name: 'Founder',
      description: 'Founder profile - access to tasks, CRM, and roadmaps',
      endpoint: '/api/admin/upsert/founder',
      linkField: 'athleteId',
      relationship: 'one-to-one', // One founder per athlete
      requiresAdditionalFields: false,
      icon: '💼',
      notes: 'Creates Founder record. Founder IS an athlete with additional capabilities.',
      // Prisma model name (for dynamic queries) - MUST match schema.prisma model name
      prismaModel: 'founder',
      // Unique constraint field (for checking if exists) - MUST match schema constraint
      uniqueField: 'athleteId'
    },
    
    // NOTE: Other models in schema that link to athleteId:
    // 
    // 1. TrainingGoal - requires raceId (additional field needed)
    //    Schema: athleteId String, raceId String (both required)
    //    Would need: requiresAdditionalFields: true, additionalFields: ['raceId']
    //
    // 2. TrainingDay - requires trainingGoalId (additional field needed)
    //    Schema: athleteId String, trainingGoalId String (both required)
    //    Would need: requiresAdditionalFields: true, additionalFields: ['trainingGoalId']
    //
    // 3. TrainingSession - requires garminActivityId OR trainingDayId
    //    Schema: athleteId String, trainingDayId String? (optional), garminActivityId String? @unique
    //    Too complex for simple upsert - handled by activity sync
    //
    // 4. RunCrewMembership - requires runCrewId (additional field needed)
    //    Schema: athleteId String, runCrewId String (both required)
    //    @@unique([runCrewId, athleteId]) - composite unique
    //    Would need: requiresAdditionalFields: true, additionalFields: ['runCrewId']
    //
    // 5. AthleteActivity - many-to-one (athlete has many activities)
    //    Schema: athleteId String (NOT unique)
    //    Not appropriate for upsert - handled by activity sync
  },

  // Get list of available models for dropdown
  getAvailableModels() {
    return Object.entries(this.models).map(([key, config]) => ({
      value: key,
      label: config.name,
      description: config.description,
      icon: config.icon
    }));
  },

  // Get model config by key
  getModelConfig(modelKey) {
    return this.models[modelKey] || null;
  },

  // Check if model requires additional fields
  requiresAdditionalFields(modelKey) {
    return this.models[modelKey]?.requiresAdditionalFields || false;
  }
};

export default MODEL_CONFIG;

