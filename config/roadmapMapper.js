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
  roadmapTypeConfig,
  itemTypeConfig,
  categoryConfig,
  visualConfig
} from './roadmapConfig.js';

/**
 * Field Mappings - Maps database field names to display info
 */
export const fieldMappings = {
  // Item Classification
  itemType: {
    label: "Item Type",
    description: "Whether this is a Feature or Milestone",
    fieldType: "select",
    options: itemTypeConfig,
    required: false,
    default: "Feature"
  },
  parentArchitecture: {
    label: "Parent Architecture",
    description: "Group related features (e.g., 'RunCrew', 'Profile', 'Messaging')",
    fieldType: "text",
    placeholder: "RunCrew",
    required: false
  },
  roadmapType: {
    label: "Roadmap Type",
    description: "Type of roadmap (Product, GTM, Operations, etc.)",
    fieldType: "select",
    options: roadmapTypeConfig,
    required: true,
    default: "Product"
  },
  category: {
    label: "Category",
    description: "Category of work (Frontend Demo, API Integration, etc.)",
    fieldType: "select",
    options: categoryConfig,
    required: false,
    default: "Frontend Demo"
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
  fieldsData: {
    label: "Fields/Data",
    description: "What fields/data are needed for this feature?",
    fieldType: "textarea",
    placeholder: "joinCode, athleteId, runCrewId, RunCrewMembership junction table",
    required: false
  },
  howToGet: {
    label: "How To Get",
    description: "APIs, routes, data sources - how do we get the data?",
    fieldType: "textarea",
    placeholder: "POST /api/runcrew/join, GET /api/join/validate",
    required: false
  },
  prerequisites: {
    label: "Prerequisites",
    description: "Setup, research, account creation, auth - what's needed first?",
    fieldType: "textarea",
    placeholder: "RunCrew must exist with unique joinCode, user authenticated",
    required: false
  },

  // Visual & Planning
  visual: {
    label: "Visual",
    description: "How should this be displayed? (List, Timeline, Kanban)",
    fieldType: "select",
    options: visualConfig,
    required: false,
    default: "List"
  },
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
    description: "Priority level (P0 = Critical, P1 = Important, P2 = Nice to Have)",
    fieldType: "select",
    options: priorityConfig,
    required: false,
    default: "P1"
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
    fields: ["itemType", "parentArchitecture", "roadmapType", "category"]
  },
  details: {
    label: "Core Details",
    fields: ["title", "whatItDoes", "howItHelps"]
  },
  integration: {
    label: "Data & Integration",
    fields: ["fieldsData", "howToGet", "prerequisites"]
  },
  planning: {
    label: "Planning & Display",
    fields: ["visual", "orderNumber"]
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
  fieldsData: "List the data fields needed. What database fields, models, or data structures are required?",
  howToGet: "List the APIs, routes, or data sources. How do we fetch or create the data? What endpoints are involved?",
  prerequisites: "What needs to be in place first? Setup, research, account creation, authentication, dependencies?",
  parentArchitecture: "Group related features. Examples: 'RunCrew' for all RunCrew features, 'Profile' for profile features, 'Messaging' for messaging features.",
  priority: "P0 = Must have (critical, blocking), P1 = Should have (important, growth driver), P2 = Nice to have (enhancement, polish)"
};

/**
 * Get explanation for a field
 */
export const getFieldExplanation = (fieldName) => {
  return fieldExplanations[fieldName] || getFieldDescription(fieldName);
};

