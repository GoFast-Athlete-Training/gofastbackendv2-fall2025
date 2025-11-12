/**
 * Roadmap Field Mapper
 * 
 * Maps CompanyRoadmapItem database fields to human-readable labels and descriptions.
 * Used for form labels, tooltips, and field explanations.
 * 
 * Based on PRODUCT_ROADMAP.md and CompanyRoadmapItem schema
 */

import {
  priorityConfig,
  statusConfig,
  itemTypeConfig,
  categoryConfig,
  primaryRepoSuggestions
} from './roadmapConfig.js';

/**
 * Field Mappings - Maps database field names to display info
 */
export const fieldMappings = {
  // Item Classification
  itemType: {
    label: "Item Type",
    description: "Whether this is Dev Work or Product Milestone",
    fieldType: "select",
    options: itemTypeConfig,
    required: false,
    default: "Dev Work"
  },
  primaryRepo: {
    label: "Primary Repo",
    description: "Primary repository where this work lives (e.g., 'mvp1', 'eventslanding', 'companystack')",
    fieldType: "text",
    placeholder: "mvp1",
    suggestions: primaryRepoSuggestions,
    required: false
  },
  category: {
    label: "Category",
    description: "Category of work (Core Feature, Frontend Demo, API Integration, etc.)",
    fieldType: "select",
    options: categoryConfig,
    required: false,
    default: "Core Feature"
  },

  // Core Details
  title: {
    label: "Title",
    description: "Feature or milestone name",
    fieldType: "text",
    placeholder: "Join RunCrew",
    required: true
  },
  whatItDoes: {
    label: "What It Does",
    description: "User value proposition - what does this feature do for users?",
    fieldType: "textarea",
    placeholder: "Allow users to join RunCrews and participate in group runs",
    required: false
  },
  howItHelps: {
    label: "How It Helps",
    description: "How this feature helps the overall product/build",
    fieldType: "textarea",
    placeholder: "Enables accountability through community - seamless onboarding",
    required: false
  },

  // Data & Integration
  quickModelScaffolding: {
    label: "Data Model Structure",
    description: "What models, tables, or data structures are needed for this feature?",
    fieldType: "textarea",
    placeholder: "joinCode, athleteId, runCrewId, RunCrewMembership junction table",
    required: false
  },
  relationalMapping: {
    label: "Database Relationships",
    description: "How does this connect to the existing data model? What's the relationship chain?",
    fieldType: "textarea",
    placeholder: "Athlete -> RunCrewMembership -> RunCrew (many-to-many)",
    required: false
  },
  apiIntegration: {
    label: "API Integration",
    description: "API-specific integration details (e.g., 'hit garmin backend with a token')",
    fieldType: "textarea",
    placeholder: "POST /api/garmin/sync with OAuth token",
    required: false
  },
  prerequisites: {
    label: "Prerequisites",
    description: "Setup, research, account creation, auth - what's needed first? (can include links)",
    fieldType: "textarea",
    placeholder: "Apply for Garmin API token: https://developer.garmin.com/...",
    required: false
  },

  // Planning
  orderNumber: {
    label: "Order Number",
    description: "Order in sequence (1, 2, 3...) - auto-assigned if not provided",
    fieldType: "number",
    placeholder: "1",
    required: false
  },

  // Time Tracking
  hoursEstimated: {
    label: "Hours Estimated",
    description: "Initial estimate of work hours",
    fieldType: "number",
    placeholder: "40",
    required: false
  },
  hoursSpent: {
    label: "Hours Spent",
    description: "Actual time spent (updated as work progresses)",
    fieldType: "number",
    placeholder: "0",
    required: false
  },

  // Dates & Status
  targetDate: {
    label: "Target Date",
    description: "Target completion date",
    fieldType: "date",
    required: false
  },
  dueDate: {
    label: "Due Date",
    description: "Due date for completion",
    fieldType: "date",
    required: false
  },
  status: {
    label: "Status",
    description: "Current status of the feature",
    fieldType: "select",
    options: statusConfig,
    required: false,
    default: "Not Started"
  },
  priority: {
    label: "Priority",
    description: "Priority level (Critical Path, Enhanced User Feature, Future Release, Revenue Builder)",
    fieldType: "select",
    options: priorityConfig,
    required: false,
    default: "Enhanced User Feature"
  },
  completedAt: {
    label: "Completed At",
    description: "Date when feature was completed (auto-set when status changes to Done)",
    fieldType: "datetime",
    required: false,
    readOnly: true
  }
};

/**
 * Get field mapping for a specific field
 */
export const getFieldMapping = (fieldName) => {
  return fieldMappings[fieldName];
};

/**
 * Get all field mappings
 */
export const getAllFieldMappings = () => {
  return fieldMappings;
};

/**
 * Get human-readable label for a field
 */
export const getFieldLabel = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping ? mapping.label : fieldName;
};

/**
 * Get description for a field
 */
export const getFieldDescription = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping ? mapping.description : null;
};

/**
 * Get field type (for form rendering)
 */
export const getFieldType = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping ? mapping.fieldType : "text";
};

/**
 * Get options for a select field
 */
export const getFieldOptions = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping && mapping.options ? mapping.options : null;
};

/**
 * Get default value for a field
 */
export const getFieldDefault = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping && mapping.default !== undefined ? mapping.default : null;
};

/**
 * Get required status for a field
 */
export const getFieldRequired = (fieldName) => {
  const mapping = fieldMappings[fieldName];
  return mapping ? mapping.required : false;
};

/**
 * Field Groups - Organize fields by category for forms
 */
export const fieldGroups = {
  classification: {
    label: "Classification",
    fields: ["itemType", "primaryRepo", "category"]
  },
  details: {
    label: "Core Details",
    fields: ["title", "whatItDoes", "howItHelps"]
  },
  integration: {
    label: "Data & Integration",
    fields: ["quickModelScaffolding", "relationalMapping", "apiIntegration", "prerequisites"]
  },
  planning: {
    label: "Planning",
    fields: ["orderNumber"]
  },
  tracking: {
    label: "Time Tracking",
    fields: ["hoursEstimated", "hoursSpent"]
  },
  status: {
    label: "Status & Dates",
    fields: ["status", "priority", "targetDate", "dueDate", "completedAt"]
  }
};

/**
 * Get fields for a specific group
 */
export const getGroupFields = (groupName) => {
  const group = fieldGroups[groupName];
  return group ? group.fields : [];
};

/**
 * Get all field groups
 */
export const getAllFieldGroups = () => {
  return fieldGroups;
};

/**
 * Field Explanations - Detailed explanations for complex fields
 */
export const fieldExplanations = {
  whatItDoes: "Describe the user value proposition. What does this feature do for users? What problem does it solve?",
  howItHelps: "Explain how this feature helps the overall product/build. Why is this important? What does it enable?",
  quickModelScaffolding: "What models, tables, or data structures are needed for this feature? Helps devs think about architecture fit.",
  relationalMapping: "How does this connect to the existing data model? What's the relationship chain? (e.g., Athlete -> RunCrewMembership -> RunCrew)",
  apiIntegration: "API-specific integration details. How do we hit external APIs? (e.g., 'hit garmin backend with a token')",
  prerequisites: "What needs to be in place first? Setup, research, account creation, authentication, dependencies? Can include links (e.g., 'apply for token: https://...')",
  primaryRepo: "Primary repository where this work lives. Examples: 'mvp1', 'eventslanding', 'companystack', 'user-dashboard', 'backend'",
  priority: "Critical Path = Must have (critical, blocking), Enhanced User Feature = Should have (important, growth driver), Future Release = Nice to have (enhancement, polish), Revenue Builder = Revenue-generating feature"
};

/**
 * Get explanation for a field
 */
export const getFieldExplanation = (fieldName) => {
  return fieldExplanations[fieldName] || getFieldDescription(fieldName);
};
