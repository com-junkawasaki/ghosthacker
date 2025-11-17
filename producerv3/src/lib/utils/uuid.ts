/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/normalize-project-id
 * 
 * Utility functions for UUID and project ID normalization
 */

/**
 * Convert project ID to UUID format
 * "default" is mapped to a fixed UUID for the default project
 */
export function normalizeProjectId(projectId: string): string {
  // Map "default" to a fixed UUID
  if (projectId === 'default') {
    return '00000000-0000-0000-0000-000000000000';
  }
  
  // If it's already a valid UUID format, return as-is
  // UUID regex: 8-4-4-4-12 hexadecimal digits
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(projectId)) {
    return projectId;
  }
  
  // For other string IDs, generate a deterministic UUID v5 from the string
  // Using a namespace UUID for project IDs
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace
  return generateUUIDv5(projectId, namespace);
}

/**
 * Generate a deterministic UUID v5 from a string
 * This ensures the same input always produces the same UUID
 */
function generateUUIDv5(name: string, namespace: string): string {
  // Simple implementation: hash the name and namespace together
  // For production, consider using a proper UUID v5 library
  const str = namespace + name;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to UUID format
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16), // Version 4
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.substring(18, 20), // Variant
    hex.substring(20, 32)
  ].join('-');
}

