/**
 * Core Type Definitions
 */

// ============================================
// Role Types
// ============================================
export type RoleType = 'assistant' | 'manager' | 'executor' | 'reviewer';

// ============================================
// Agent Status
// ============================================
export type AgentStatus = 'active' | 'inactive';

// ============================================
// Skill Pack Content Structure
// ============================================
export interface SkillPackContent {
  skill_pack_id: string;
  name: string;
  version: string;
  description: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

// ============================================
// Database Entity Types
// ============================================

export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  company_id: string | null;
  feishu_group_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  department_id: string | null;
  created_at: string;
}

export interface SkillPack {
  id: string;
  name: string;
  description: string | null;
  content: string | null;  // JSON string
  version: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  name: string;
  skill_pack_ids: string | null;  // JSON array string
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  department_id: string | null;
  job_id: string | null;
  role: RoleType;
  feishu_bot_id: string | null;
  workspace_path: string | null;
  status: AgentStatus;
  last_active_at: string | null;
  created_at: string;
}

// ============================================
// Command Parameter Types
// ============================================

export interface CreateDeptOptions {
  id: string;
  name: string;
}

export interface UpdateDeptOptions {
  id: string;
  name?: string;
  feishu_group_id?: string;
}

export interface CreateAgentOptions {
  id: string;
  name: string;
  dept: string;  // department_id
  role: RoleType;
  job?: string;  // job_id, required for executor only
}

export interface GetAgentOptions {
  id?: string;
  department_id?: string;
  role?: RoleType;
}

export interface UpdateAgentOptions {
  id: string;
  name?: string;
  job?: string;
  status?: AgentStatus;
}

export interface CreateJobOptions {
  id: string;
  name: string;
  skill_pack_ids?: string[];
}

export interface CreateSkillPackOptions {
  id: string;
  name: string;
  description: string;
  content: string;  // JSON string or file path
}