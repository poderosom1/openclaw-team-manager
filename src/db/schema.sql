-- Company Manager Database Schema v0.0.3
-- 多Agent协作框架数据库表结构（基础版）
-- 仅包含：公司、事业部、Agent、职业、技能包、配置变更

-- ============================================
-- 1. 公司信息表
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 事业部表
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_id TEXT,
    feishu_group_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ============================================
-- 3. 项目表
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ============================================
-- 4. 技能包表（全局共享）
-- ============================================
CREATE TABLE IF NOT EXISTS skill_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT,  -- JSON格式
    version TEXT DEFAULT '1.0.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. 职业表（全局共享，只与执行者相关）
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    skill_pack_ids TEXT,  -- JSON数组，关联skill_packs表
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. Agent表
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT,  -- 总助理为NULL
    job_id TEXT,         -- 只有执行者需要，其他角色为NULL
    role TEXT NOT NULL CHECK(role IN ('assistant', 'manager', 'executor', 'reviewer')),
    feishu_bot_id TEXT,
    workspace_path TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    last_active_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- ============================================
-- 7. 配置变更记录表
-- ============================================
CREATE TABLE IF NOT EXISTS config_changes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,         -- Related to init session ID
    change_type TEXT NOT NULL CHECK(change_type IN (
        'agent_create', 'agent_delete', 
        'agent_allow_list_update',   -- Agent allowAgents list update
        'binding_create', 'binding_delete', 
        'channel_config', 
        'skill_pack_create', 'skill_pack_delete', 
        'job_create', 'job_delete', 
        'directory_create', 
        'config_update', 
        'feishu_group_bind', 'feishu_group_unbind', 
        'feishu_pairing_approve',  -- From team-manager: pairing approval
        'other'
    )),
    target_type TEXT NOT NULL CHECK(target_type IN (
        'agents.list', 
        'agents.list.allow_agents',  -- Agent allowAgents list
        'bindings', 
        'channels.feishu', 'channels.feishu.groups', 
        'skill_packs', 'jobs', 'directories', 
        'gateway', 'departments', 
        'credentials',  -- From team-manager: credentials support
        'other'
    )),
    target_path TEXT NOT NULL,        -- JSONPath, e.g. 'agents.list[0]' or 'bindings[0]'
    action TEXT NOT NULL CHECK(action IN ('add', 'remove', 'update')),
    old_value TEXT,                   -- Old value (JSON format)
    new_value TEXT,                   -- New value (JSON format)
    related_id TEXT,                  -- Related entity ID (e.g. agent_id)
    description TEXT,                 -- Change description
    cleaned BOOLEAN DEFAULT 0,        -- Is cleaned
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. 初始化会话表
-- ============================================
CREATE TABLE IF NOT EXISTS init_sessions (
    id TEXT PRIMARY KEY,
    openclaw_root TEXT NOT NULL,          -- OpenClaw 工作目录路径
    assistant_name TEXT,                  -- 总助理名称
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'reset')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_at DATETIME                     -- 重置时间
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department_id);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_config_changes_type ON config_changes(target_type);
CREATE INDEX IF NOT EXISTS idx_config_changes_related ON config_changes(related_id);