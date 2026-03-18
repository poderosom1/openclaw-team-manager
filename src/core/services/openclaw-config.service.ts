/**
 * OpenClaw Config Management Module
 * Used for updating openclaw.json, follows official standard
 */

import * as fs from 'fs';
import * as path from 'path';
import { getOpenClawJsonPath } from '../utils';

/**
 * Agent config interface (item in agents.list in openclaw.json)
 */
export interface AgentConfig {
  id: string;
  default?: boolean;
  name?: string;
  workspace: string;
  agentDir?: string;
  model?: string | { primary: string; fallbacks?: string[] };
  identity?: {
    name?: string;
    theme?: string;
    emoji?: string;
    avatar?: string;
  };
  groupChat?: {
    mentionPatterns?: string[];
  };
  sandbox?: {
    mode?: 'off' | 'non-main' | 'all';
    scope?: 'session' | 'agent' | 'shared';
  };
  tools?: {
    allow?: string[];
    deny?: string[];
  };
}

/**
 * Binding config interface
 */
export interface BindingConfig {
  agentId: string;
  match: {
    channel: string;
    accountId?: string;
    peer?: {
      kind: 'dm' | 'group' | 'channel';
      id: string;
    };
    guildId?: string;
    teamId?: string;
  };
}

/**
 * Feishu account config interface
 */
export interface FeishuAccountConfig {
  appId?: string;
  appSecret?: string;
  botName?: string;
  webhookUrl?: string;
  encryptKey?: string;
  verificationToken?: string;
}

/**
 * Feishu channel config interface
 */
export interface FeishuChannelConfig {
  enabled?: boolean;
  dmPolicy?: string;
  groupPolicy?: string;
  webhookUrl?: string;
  accounts?: Record<string, FeishuAccountConfig>;
  groups?: Record<string, {
    requireMention?: boolean;
    allowFrom?: string[];
  }>;
}

/**
 * OpenClaw config interface
 */
export interface OpenClawConfig {
  gateway?: {
    port?: number;
    mode?: string;
    bind?: string;
    auth?: {
      mode?: string;
      token?: string;
    };
  };
  agents?: {
    defaults?: {
      workspace?: string;
      model?: string | { primary: string; fallbacks?: string[] };
    };
    list?: AgentConfig[];
  };
  bindings?: BindingConfig[];
  models?: {
    providers?: Record<string, {
      baseUrl?: string;
      apiKey?: string;
      api?: string;
      models?: Array<{
        id: string;
        name?: string;
        contextWindow?: number;
      }>;
    }>;
  };
  channels?: {
    feishu?: FeishuChannelConfig;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * OpenClaw Config Manager Class
 */
export class OpenClawConfigManager {
  private configPath: string;
  private config: OpenClawConfig | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || getOpenClawJsonPath();
  }

  /**
   * Load config
   */
  load(): OpenClawConfig {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      // Create default config
      this.config = this.createDefaultConfig();
      return this.config;
    }

    const content = fs.readFileSync(this.configPath, 'utf-8');
    
    // Use JSON5 parsing (supports comments and trailing commas)
    // Simple handling: remove comments and trailing commas
    const cleanContent = this.cleanJson5(content);
    this.config = JSON.parse(cleanContent);
    
    return this.config!;
  }

  /**
   * Clean JSON5 content, convert to standard JSON
   */
  private cleanJson5(content: string): string {
    // Remove single-line comments
    let result = content.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove trailing commas
    result = result.replace(/,(\s*[}\]])/g, '$1');
    return result;
  }

  /**
   * Save config
   */
  save(): void {
    if (!this.config) {
      throw new Error('No config to save');
    }

    // Ensure directory exists
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write JSON (formatted)
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * Create default config
   */
  private createDefaultConfig(): OpenClawConfig {
    return {
      gateway: {
        port: 28789,
        mode: 'local',
        bind: 'loopback',
        auth: {
          mode: 'token',
          token: 'default-token'
        }
      },
      agents: {
        defaults: {
          workspace: '',
          model: ''
        },
        list: []
      },
      bindings: [],
      models: {
        providers: {}
      },
      channels: {}
    };
  }

  /**
   * Get agents.list
   */
  getAgentsList(): AgentConfig[] {
    const config = this.load();
    return config.agents?.list || [];
  }

  /**
   * Get agent config by ID
   */
  getAgentById(agentId: string): AgentConfig | undefined {
    const agents = this.getAgentsList();
    return agents.find(a => a.id === agentId);
  }

  /**
   * Add or update agent config
   */
  upsertAgent(agentConfig: AgentConfig): void {
    const config = this.load();
    
    if (!config.agents) {
      config.agents = { defaults: {}, list: [] };
    }
    if (!config.agents.list) {
      config.agents.list = [];
    }

    const existingIndex = config.agents.list.findIndex(a => a.id === agentConfig.id);
    
    if (existingIndex >= 0) {
      // Update existing config
      config.agents.list[existingIndex] = {
        ...config.agents.list[existingIndex],
        ...agentConfig
      };
    } else {
      // Add new config
      config.agents.list.push(agentConfig);
    }

    this.save();
  }

  /**
   * Remove agent config
   */
  removeAgent(agentId: string): boolean {
    const config = this.load();
    
    if (!config.agents?.list) {
      return false;
    }

    const index = config.agents.list.findIndex(a => a.id === agentId);
    if (index < 0) {
      return false;
    }

    config.agents.list.splice(index, 1);
    this.save();
    
    return true;
  }

  /**
   * Get bindings
   */
  getBindings(): BindingConfig[] {
    const config = this.load();
    return config.bindings || [];
  }

  /**
   * Add binding
   */
  addBinding(binding: BindingConfig): void {
    const config = this.load();
    
    if (!config.bindings) {
      config.bindings = [];
    }

    // Check if same binding already exists
    const exists = config.bindings.some(b => 
      b.agentId === binding.agentId &&
      JSON.stringify(b.match) === JSON.stringify(binding.match)
    );

    if (!exists) {
      config.bindings.push(binding);
      this.save();
    }
  }

  /**
   * Remove binding
   */
  removeBinding(agentId: string, match: BindingConfig['match']): boolean {
    const config = this.load();
    
    if (!config.bindings) {
      return false;
    }

    const index = config.bindings.findIndex(b =>
      b.agentId === agentId &&
      JSON.stringify(b.match) === JSON.stringify(match)
    );

    if (index < 0) {
      return false;
    }

    config.bindings.splice(index, 1);
    this.save();
    
    return true;
  }

  /**
   * Update feishu config
   */
  updateFeishuConfig(feishuConfig: FeishuChannelConfig): void {
    const config = this.load();
    
    if (!config.channels) {
      config.channels = {};
    }

    config.channels.feishu = {
      ...config.channels.feishu,
      ...feishuConfig
    };

    this.save();
  }

  /**
   * Set default model
   */
  setDefaultModel(model: string | { primary: string; fallbacks?: string[] }): void {
    const config = this.load();
    
    if (!config.agents) {
      config.agents = { defaults: {} };
    }
    if (!config.agents.defaults) {
      config.agents.defaults = {};
    }

    config.agents.defaults.model = model;
    this.save();
  }

  /**
   * Set default workspace
   */
  setDefaultWorkspace(workspace: string): void {
    const config = this.load();
    
    if (!config.agents) {
      config.agents = { defaults: {} };
    }
    if (!config.agents.defaults) {
      config.agents.defaults = {};
    }

    config.agents.defaults.workspace = workspace;
    this.save();
  }
}

// Export singleton
export const openClawConfigManager = new OpenClawConfigManager();