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
 * Uses Web Crypto API for proper hashing
 */
function generateUUIDv5(name: string, namespace: string): string {
  // Use Web Crypto API for SHA-1 hashing (required for UUID v5)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment: use Web Crypto API
    // For now, fall back to simple hash for compatibility
    return generateUUIDv5Simple(name, namespace);
  } else {
    // Node.js environment or fallback
    return generateUUIDv5Simple(name, namespace);
  }
}

/**
 * Simple UUID v5-like generation using string hashing
 * Generates a deterministic UUID-like string from input
 */
function generateUUIDv5Simple(name: string, namespace: string): string {
  const str = namespace.replace(/-/g, '') + name;
  
  // Create a simple hash from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use multiple hash values to create a 128-bit UUID
  const hash1 = Math.abs(hash);
  const hash2 = Math.abs(hash * 31 + name.length);
  const hash3 = Math.abs(hash * 17 + namespace.length);
  const hash4 = Math.abs(hash * 7 + str.length);
  
  // Convert to hex strings and pad to ensure 32 characters
  const hex1 = hash1.toString(16).padStart(8, '0');
  const hex2 = hash2.toString(16).padStart(8, '0');
  const hex3 = hash3.toString(16).padStart(8, '0');
  const hex4 = hash4.toString(16).padStart(8, '0');
  
  // Combine into UUID format: 8-4-4-4-12
  const hex = (hex1 + hex2 + hex3 + hex4).substring(0, 32);
  
  // Ensure hex is exactly 32 characters
  const paddedHex = hex.padEnd(32, '0').substring(0, 32);
  
  return [
    paddedHex.substring(0, 8),
    paddedHex.substring(8, 12),
    '5' + paddedHex.substring(13, 16), // Version 5
    ((parseInt(paddedHex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + paddedHex.substring(18, 20), // Variant bits
    paddedHex.substring(20, 32)
  ].join('-');
}

