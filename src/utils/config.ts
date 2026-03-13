/**
 * CLI Configuration Management
 * Handles auth credentials, multi-context support, and config persistence
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface EpContext {
  name: string;
  url: string;
  token: string;
}

export interface EpConfig {
  activeContext: string;
  contexts: EpContext[];
}

const CONFIG_DIR = join(homedir(), '.config', 'easypanel');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function readConfig(): EpConfig {
  if (!configExists()) {
    return { activeContext: '', contexts: [] };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as EpConfig;
  } catch {
    return { activeContext: '', contexts: [] };
  }
}

export function writeConfig(config: EpConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function deleteConfig(): void {
  if (configExists()) {
    unlinkSync(CONFIG_FILE);
  }
}

export function getActiveContext(): EpContext | undefined {
  const config = readConfig();
  if (!config.activeContext || config.contexts.length === 0) return undefined;
  return config.contexts.find(c => c.name === config.activeContext);
}

export function addContext(ctx: EpContext): void {
  const config = readConfig();
  const existing = config.contexts.findIndex(c => c.name === ctx.name);
  if (existing >= 0) {
    config.contexts[existing] = ctx;
  } else {
    config.contexts.push(ctx);
  }
  if (!config.activeContext) {
    config.activeContext = ctx.name;
  }
  writeConfig(config);
}

export function removeContext(name: string): boolean {
  const config = readConfig();
  const idx = config.contexts.findIndex(c => c.name === name);
  if (idx < 0) return false;
  config.contexts.splice(idx, 1);
  if (config.activeContext === name) {
    config.activeContext = config.contexts[0]?.name ?? '';
  }
  writeConfig(config);
  return true;
}

export function setActiveContext(name: string): boolean {
  const config = readConfig();
  const ctx = config.contexts.find(c => c.name === name);
  if (!ctx) return false;
  config.activeContext = name;
  writeConfig(config);
  return true;
}

/**
 * Load config into process.env so EasyPanelClient picks it up.
 * Priority: CLI flags (already in env) > env vars > config file
 */
export function loadConfig(urlOverride?: string, tokenOverride?: string): void {
  // CLI flags take highest priority
  if (urlOverride) process.env.EASYPANEL_URL = urlOverride;
  if (tokenOverride) process.env.EASYPANEL_TOKEN = tokenOverride;

  // If env vars are already set, don't override with config file
  if (process.env.EASYPANEL_URL && (process.env.EASYPANEL_TOKEN || process.env.EASYPANEL_PASSWORD)) {
    return;
  }

  // Load from config file
  const ctx = getActiveContext();
  if (ctx) {
    if (!process.env.EASYPANEL_URL) process.env.EASYPANEL_URL = ctx.url;
    if (!process.env.EASYPANEL_TOKEN) process.env.EASYPANEL_TOKEN = ctx.token;
  }
}

export function isConfigured(): boolean {
  return !!(
    (process.env.EASYPANEL_URL && (process.env.EASYPANEL_TOKEN || process.env.EASYPANEL_PASSWORD)) ||
    getActiveContext()
  );
}
