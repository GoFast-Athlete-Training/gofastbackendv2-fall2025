// Upsert Configuration
// Universal upsert system - defines which models can be upserted to an athleteId
// Used by Admin Upsert Tool and Backend Routes

export const UPSERT_CONFIG = {
  // Models that can be upserted (created and linked to athleteId)
  // Athlete-first architecture: All models link back to athleteId
  models: {
    runCrewManager: {
      name: 'RunCrew Manager',
      description: 'Assign RunCrew admin or manager role to athlete',
      endpoint: '/api/admin/upsert/runCrewManager',
      prismaModel: 'runCrewManager',
      linkField: 'athleteId',
      uniqueField: 'runCrewId_athleteId', // Composite unique: [runCrewId, athleteId]
      relationship: 'many-to-many', // Athlete can be manager of multiple RunCrews
      requiresAdditionalFields: true,
      additionalFields: [
        {
          name: 'runCrewId',
          label: 'RunCrew',
          type: 'select',
          required: true,
          fetchOptions: '/api/admin/runcrews/hydrate', // Endpoint to fetch available RunCrews
          optionValue: 'id',
          optionLabel: 'name'
        },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'admin', label: 'Admin (Owner)' },
            { value: 'manager', label: 'Manager' }
          ]
        }
      ],
      icon: '👥',
      notes: 'Assigns RunCrew admin or manager role. Athlete must be a member of the RunCrew first.'
    }
    
    // Future models can be added here:
    // trainingGoal: { ... },
    // investor: { ... },
    // coach: { ... }
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
  },

  // Get additional fields config for a model
  getAdditionalFields(modelKey) {
    return this.models[modelKey]?.additionalFields || [];
  }
};

export default UPSERT_CONFIG;

