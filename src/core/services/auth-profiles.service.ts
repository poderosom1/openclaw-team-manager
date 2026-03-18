/**
 * Auth Profiles Generator
 * Used for creating agent authentication config files
 * Follows OpenClaw official standard
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAuthProfilesPath, getAgentDir } from '../utils';

/**
 * Auth profile type
 */
export type AuthProfileType = 'api_key' | 'token' | 'oauth';

/**
 * Auth profile interface
 */
export interface AuthProfile {
  type: AuthProfileType;
  provider: string;
  profileId: string;
  
  // API Key type
  key?: string;
  keyRef?: {
    source: 'env' | 'file' | 'exec';
    provider: string;
    id: string;
  };
  
  // Token type
  token?: string;
  tokenRef?: {
    source: 'env' | 'file' | 'exec';
    provider: string;
    id: string;
  };
  
  // OAuth related
  access?: string;
  refresh?: string;
  expires?: string;
  accountId?: string;
}

/**
 * auth-profiles.json structure
 */
export interface AuthProfilesConfig {
  profiles: Record<string, AuthProfile>;
  order?: Record<string, string[]>;  // provider -> profileId[]
}

/**
 * Create empty auth-profiles.json
 */
export function createEmptyAuthProfiles(): AuthProfilesConfig {
  return {
    profiles: {},
    order: {}
  };
}

/**
 * Create default auth-profiles.json for agent
 */
export function createDefaultAuthProfilesForAgent(agentId: string): AuthProfilesConfig {
  const config = createEmptyAuthProfiles();
  // Default has no auth configs, added by subsequent configuration
  return config;
}

/**
 * Add API Key auth config
 */
export function addApiKeyProfile(
  config: AuthProfilesConfig,
  provider: string,
  profileId: string,
  apiKey: string
): AuthProfilesConfig {
  config.profiles[profileId] = {
    type: 'api_key',
    provider,
    profileId,
    key: apiKey
  };
  
  // Update order
  if (!config.order) {
    config.order = {};
  }
  if (!config.order[provider]) {
    config.order[provider] = [];
  }
  if (!config.order[provider].includes(profileId)) {
    config.order[provider].push(profileId);
  }
  
  return config;
}

/**
 * Add Token auth config (for OAuth or setup-token)
 */
export function addTokenProfile(
  config: AuthProfilesConfig,
  provider: string,
  profileId: string,
  token: string,
  expires?: string
): AuthProfilesConfig {
  config.profiles[profileId] = {
    type: 'token',
    provider,
    profileId,
    token,
    expires
  };
  
  // Update order
  if (!config.order) {
    config.order = {};
  }
  if (!config.order[provider]) {
    config.order[provider] = [];
  }
  if (!config.order[provider].includes(profileId)) {
    config.order[provider].push(profileId);
  }
  
  return config;
}

/**
 * Add OAuth auth config
 */
export function addOAuthProfile(
  config: AuthProfilesConfig,
  provider: string,
  profileId: string,
  accessToken: string,
  refreshToken: string,
  expires: string,
  accountId?: string
): AuthProfilesConfig {
  config.profiles[profileId] = {
    type: 'oauth',
    provider,
    profileId,
    access: accessToken,
    refresh: refreshToken,
    expires,
    accountId
  };
  
  // Update order
  if (!config.order) {
    config.order = {};
  }
  if (!config.order[provider]) {
    config.order[provider] = [];
  }
  if (!config.order[provider].includes(profileId)) {
    config.order[provider].push(profileId);
  }
  
  return config;
}

/**
 * Add API Key config using SecretRef
 */
export function addApiKeyRefProfile(
  config: AuthProfilesConfig,
  provider: string,
  profileId: string,
  keyRef: {
    source: 'env' | 'file' | 'exec';
    provider: string;
    id: string;
  }
): AuthProfilesConfig {
  config.profiles[profileId] = {
    type: 'api_key',
    provider,
    profileId,
    keyRef
  };
  
  // Update order
  if (!config.order) {
    config.order = {};
  }
  if (!config.order[provider]) {
    config.order[provider] = [];
  }
  if (!config.order[provider].includes(profileId)) {
    config.order[provider].push(profileId);
  }
  
  return config;
}

/**
 * Save auth-profiles.json
 */
export function saveAuthProfiles(agentId: string, config: AuthProfilesConfig): void {
  const filePath = getAuthProfilesPath(agentId);
  const dir = path.dirname(filePath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Load auth-profiles.json
 */
export function loadAuthProfiles(agentId: string): AuthProfilesConfig | null {
  const filePath = getAuthProfilesPath(agentId);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Initialize agent's auth-profiles.json
 */
export function initializeAuthProfiles(agentId: string): void {
  const config = createDefaultAuthProfilesForAgent(agentId);
  saveAuthProfiles(agentId, config);
}

/**
 * Check if agent has auth config
 */
export function hasAuthProfiles(agentId: string): boolean {
  const config = loadAuthProfiles(agentId);
  return config !== null && Object.keys(config.profiles).length > 0;
}

/**
 * Get all auth profiles for agent
 */
export function getAuthProfiles(agentId: string): AuthProfile[] {
  const config = loadAuthProfiles(agentId);
  if (!config) {
    return [];
  }
  return Object.values(config.profiles);
}

/**
 * Get auth profiles by provider
 */
export function getAuthProfilesByProvider(agentId: string, provider: string): AuthProfile[] {
  const profiles = getAuthProfiles(agentId);
  return profiles.filter(p => p.provider === provider);
}