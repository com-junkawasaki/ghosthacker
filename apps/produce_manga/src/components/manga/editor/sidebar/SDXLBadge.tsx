/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/sdxl-badge
 * 
 * SDXL badge component
 */
'use client';

import { Badge } from '@/components/shared/ui/Badge';

export function SDXLBadge() {
  return <Badge variant="primary">SDXL</Badge>;
}

