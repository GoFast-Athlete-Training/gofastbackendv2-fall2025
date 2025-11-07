/**
 * Pipeline Configuration - Config-Driven Pipeline System
 * 
 * This config defines all pipeline types and their stages.
 * The Contact model stores audienceType and pipelineStage fields,
 * validated against this config.
 */

export const pipelineConfig = {
  EliteRunner: {
    label: "Elite Runner",
    description: "Top-tier athletes invited to represent the GoFast platform.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },

  RunnerInfluencer: {
    label: "Runner Influencer",
    description: "Content-driven athletes who can amplify GoFast through reach and authenticity.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },

  RunMerch: {
    label: "Run Merch Partner",
    description: "Brands offering running gear, apparel, or accessories through GoFast.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },

  RunFeed: {
    label: "Run Feed Partner",
    description: "Content, podcasts, or media channels featuring GoFast athletes or clubs.",
    stages: ["Interest", "Meeting", "Agreement", "OnPlatform"],
  },

  RunClub: {
    label: "Run Club Organizer",
    description: "Local or regional clubs organizing weekly runs and crew challenges.",
    stages: ["Interest", "Demo", "Agreement", "OnPlatform"], // Note: "Demo" instead of "Meeting"
  },

  RunEventOrganizer: {
    label: "Run Event Organizer",
    description: "Race directors or event organizers integrating GoFast for results, tracking, or sponsorship.",
    stages: ["Interest", "Pitch", "Agreement", "OnPlatform"], // Note: "Pitch" instead of "Meeting"
  },
};

/**
 * Get all audience type keys
 */
export const getAudienceTypes = () => Object.keys(pipelineConfig);

/**
 * Get config for a specific audience type
 */
export const getAudienceConfig = (audienceType) => {
  return pipelineConfig[audienceType];
};

/**
 * Validate that a stage is valid for an audience type
 */
export const validateStage = (audienceType, stage) => {
  const config = pipelineConfig[audienceType];
  if (!config) {
    throw new Error(`Invalid audience type: ${audienceType}`);
  }

  if (!config.stages.includes(stage)) {
    throw new Error(
      `Invalid stage "${stage}" for audience type "${config.label}". Allowed: ${config.stages.join(", ")}`
    );
  }

  return true;
};

/**
 * Get the first stage for an audience type (default stage)
 */
export const getFirstStage = (audienceType) => {
  const config = pipelineConfig[audienceType];
  if (!config) {
    throw new Error(`Invalid audience type: ${audienceType}`);
  }
  return config.stages[0];
};

