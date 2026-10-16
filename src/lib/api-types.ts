export interface Stats {
  totalIndents: number;
  completedIndents: number;
  pendingIndents: number;
  under120: number;
  over120: number;
  complianceRate: number;
  averageTime: number;
  medianTime: number;
}

/**
 * Type guard for the payloads returned by /api/indents/stats.
 * Guards against error objects ({ error: '...' }) and malformed payloads
 * so pages never call .toFixed() on undefined.
 */
export function isStats(data: unknown): data is Stats {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.totalIndents === 'number' &&
    typeof d.completedIndents === 'number' &&
    typeof d.pendingIndents === 'number' &&
    typeof d.under120 === 'number' &&
    typeof d.over120 === 'number' &&
    typeof d.complianceRate === 'number' &&
    typeof d.averageTime === 'number' &&
    typeof d.medianTime === 'number'
  );
}
