import * as vscode from 'vscode';

/**
 * Raw (not yet validated) values of the `sonecheck.*` settings.
 *
 * Every field is optional: absent or invalid values are filled in by
 * `core/config.normalizeConfig` (`CFG-01`).
 */
export interface RawConfig {
  riskThreshold?: number;
  maxItems?: number;
  enabled?: boolean;
  sensitivePathPatterns?: string[];
}

/**
 * The **only** place in the extension that reads VS Code configuration
 * (`GUARD-02`). Everything else receives normalized values from `core`.
 */
export function readRawConfig(): RawConfig {
  const section = vscode.workspace.getConfiguration('sonecheck');
  return {
    riskThreshold: section.get<number>('riskThreshold'),
    maxItems: section.get<number>('maxItems'),
    enabled: section.get<boolean>('enabled'),
    sensitivePathPatterns: section.get<string[]>('sensitivePathPatterns'),
  };
}
