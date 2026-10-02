import type { Component, Provenance } from './product';
export function analyzeCompatibility(component: Component, candidate: { specifications: Record<string, string>; provenance: Provenance }) {
  const checks = Object.entries(component.replacement.requirements).map(([field, required]) => ({ field, required, actual: candidate.specifications[field] ?? 'unknown', result: required === 'unknown' || !candidate.specifications[field] || candidate.specifications[field] === 'unknown' ? 'unknown' : required === candidate.specifications[field] ? 'match' : 'mismatch' }));
  const verifiedSource = candidate.provenance.verified && ['manufacturer', 'serviceManual', 'structuredDataset'].includes(candidate.provenance.sourceType);
  const status = checks.some(c => c.result === 'mismatch') ? 'NOT_COMPATIBLE' : checks.every(c => c.result === 'match') && verifiedSource ? 'VERIFIED_COMPATIBLE' : checks.some(c => c.result === 'match') ? 'POTENTIALLY_COMPATIBLE' : 'UNKNOWN';
  return { status, checks, missingVerification: checks.filter(c => c.result === 'unknown').map(c => c.field) };
}
