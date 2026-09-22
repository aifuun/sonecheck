import { MAX_ITEMS, RISK_THRESHOLD } from '../constants';

/** Normalized configuration consumed by the core pipeline (`CFG-01`). */
export interface SoneCheckConfig {
  riskThreshold: number;
  maxItems: number;
  enabled: boolean;
  sensitivePathPatterns: string[];
}

/** Shape accepted from the infra layer, before validation. */
export interface RawConfigInput {
  riskThreshold?: number;
  maxItems?: number;
  enabled?: boolean;
  sensitivePathPatterns?: string[];
}

/** `CFG-01` default sensitive paths. */
const DEFAULT_SENSITIVE_PATH_PATTERNS: readonly string[] = ['auth', 'payment', 'migration'];

const MIN_RISK_THRESHOLD = 0;
const MAX_RISK_THRESHOLD = 1;
const MIN_ITEMS = 1;
const MAX_ITEMS_LIMIT = 20;

/**
 * Validate and complete raw settings (`CFG-01`).
 *
 * Pure function, no VS Code API: out-of-range values fall back to the named
 * constants, missing fields are filled with defaults, and every value stays
 * inside the contract's documented bounds.
 */
export function normalizeConfig(raw: RawConfigInput): SoneCheckConfig {
  return {
    riskThreshold: normalizeRiskThreshold(raw.riskThreshold),
    maxItems: normalizeMaxItems(raw.maxItems),
    enabled: raw.enabled ?? true,
    sensitivePathPatterns: normalizePatterns(raw.sensitivePathPatterns),
  };
}

function normalizeRiskThreshold(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return RISK_THRESHOLD;
  // `CFG-01`: 0.0 < v < 1.0 — both ends are exclusive.
  if (value <= MIN_RISK_THRESHOLD || value >= MAX_RISK_THRESHOLD) return RISK_THRESHOLD;
  return value;
}

function normalizeMaxItems(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return MAX_ITEMS;
  if (value < MIN_ITEMS || value > MAX_ITEMS_LIMIT) return MAX_ITEMS;
  return value;
}

function normalizePatterns(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_SENSITIVE_PATH_PATTERNS];

  const patterns = value
    .filter((pattern): pattern is string => typeof pattern === 'string')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  return patterns.length > 0 ? patterns : [...DEFAULT_SENSITIVE_PATH_PATTERNS];
}
