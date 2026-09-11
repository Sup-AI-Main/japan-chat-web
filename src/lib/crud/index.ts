/**
 * Unified CRUD Layer Index
 * All admin operations should go through these functions.
 *
 * Architecture:
 *   Client (inline edit / admin page)
 *     ↓
 *   API Route (/api/admin/*)
 *     ↓
 *   CRUD Layer (this file)
 *     ↓
 *   Supabase DB
 */

// Areas
export {
  listAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
  getAreaImpactReport,
} from "./areas";

// Categories
export {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryImpactReport,
} from "./categories";

// Entities
export {
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  changePrimaryCategory,
} from "./entities";

// Field Definitions
export {
  listFieldDefinitions,
  getFieldDefinition,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  addFieldScope,
  removeFieldScope,
  setFieldScopes,
  getApplicableFieldDefinitions,
} from "./field-definitions";

// Entity Field Values
export {
  getEntityFieldValues,
  setEntityFieldValue,
  deleteEntityFieldValue,
  deleteEntityFieldValueByPair,
  bulkSetEntityFieldValues,
} from "./entity-field-values";

// Compound Delete
export {
  deleteEntityFull,
  deleteAreaFull,
  deleteCategoryFull,
  deleteFieldDefinitionFull,
} from "./compound-delete";

// Response helpers
export { ok, created, badRequest, notFound, conflict, serverError, unauthorized, safeJson } from "./response";
export type { ApiResponse, ApiSuccess, ApiFailure } from "./response";

// Validation helpers
export {
  isUuid,
  isNonEmpty,
  isActive,
  toBool,
  toInt,
  toStr,
  requireFields,
  generateSlug,
  generateFieldKey,
  FIELD_TYPES,
  SCOPE_TYPES,
} from "./validation";

// Change log
export { logChange, hashActor } from "./change-log";
