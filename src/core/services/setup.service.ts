/**
 * Setup Service
 * 
 * Follows OpenClaw official standard directory structure and config format
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { initializeDatabase, isDatabaseInitialized } from '../../db';
import { companyRepository } from '../../db/repositories/company.repo';
import { agentRepository } from '../../db/repositories/agent.repo';
import * as initSessionRepo from '../../db/repositories/init-session.repo';
import { 
  getOpenClawRoot, 
  getAgentWorkspace, 
  getAgentDir, 
  getAgentSessionsDir,
  setOpenClawRoot,
  isValidOpenClawRoot
} from '../utils';
import { RoleType } from '../models/types';
import { syncOpenClawConfig, createAgentDirectories, createAgentFiles } from '../utils/openclaw-helper';
import { initializeAuthProfiles } from './auth-profiles.service';
import { jobService } from './job.service';
import { skillPackService } from './skill-pack.service';
import * as configTracker from './config-tracker.service';

// Assistant fixed ID
const ASSISTANT_ID = 'assistant_main';

export class SetupService {
  /**
   * Check if system is initialized
   * 
   * Note: This method should not trigger any file or database creation
   * Only checks in-memory state
   */
  isInitialized(): boolean {
    // Check if has active session (only check memory state, don't access database)
    const sessionId = configTracker.getCurrentSession();
    if (sessionId) {
      return true;
    }
    
    // Check if has custom workspace (indicates previous setup)
    // But don't trigger database access
    return false;
  }

  /**
   * Validate OpenClaw workspace directory
   */
  validateOpenClawRoot(dirPath: string): { valid: boolean; error?: string } {
    return isValidOpenClawRoot(dirPath);
  }

  /**
   * Set OpenClaw workspace directory
   */
  configureOpenClawRoot(dirPath: string): { success: boolean; error?: string } {
    return setOpenClawRoot(dirPath);
  }

  /**
   * Initialize system
   * 
   * Complete flow:
   * 1. Set OpenClaw workspace directory (if provided)
   * 2. Initialize database
   * 3. Create/restore initialization session (ensure sessionId available)
   * 4. Create company record
   * 5. Create assistant (including directories, files, config)
   * 6. Create role constraint flow templates
   * 7. Create preset skill packs and jobs
   */
  async init(assistantName: string = '总助理', openClawRoot?: string): Promise<{ success: boolean; message: string; assistant_id: string }> {
    try {
      // If workspace directory provided, validate and set
      if (openClawRoot) {
        const setResult = setOpenClawRoot(openClawRoot);
        if (!setResult.success) {
          return {
            success: false,
            message: `工作目录无效: ${setResult.error}`,
            assistant_id: ''
          };
        }
      }

      // 1. Initialize database (create company directory and company.db)
      initializeDatabase();

      // 2. Check if has active session
      const activeSession = initSessionRepo.getActive();
      if (activeSession) {
        // Restore session ID
        configTracker.setCurrentSession(activeSession.id);
        console.log(chalk.dim(`  恢复会话: ${activeSession.id}`));
        
        // Check if assistant already exists
        const assistant = agentRepository.getAssistant();
        if (assistant) {
          // Ensure directories and files exist (may have been manually deleted)
          await this.ensureAssistantDirectories(assistant.name || assistantName);
          
          return {
            success: true,
            message: '系统已初始化',
            assistant_id: assistant.id
          };
        }
      }

      // 3. Create new initialization session (before creating any directories, ensure sessionId available)
      const session = initSessionRepo.create(assistantName, getOpenClawRoot());
      configTracker.setCurrentSession(session.id);
      console.log(chalk.dim(`  会话ID: ${session.id}`));

      // 4. Create company record
      const company = companyRepository.getDefault();
      if (!company) {
        companyRepository.create('company_001', '一人公司');
      }

      // 6. Create assistant
      let assistant = agentRepository.getAssistant();
      if (!assistant) {
        // ========================================
        // 6.1 Create directory structure (follows official standard)
        // ========================================
        const directories = createAgentDirectories(ASSISTANT_ID);

        // Record directory creation
        configTracker.recordDirectoryCreate(directories.workspace, `总助理工作空间`);
        configTracker.recordDirectoryCreate(directories.agentDir, `总助理Agent目录`);
        configTracker.recordDirectoryCreate(directories.sessionsDir, `总助理会话目录`);

        // ========================================
        // 6.2 Create guide files (follows official standard)
        // ========================================
        createAgentFiles(ASSISTANT_ID, {
          name: assistantName,
          role: 'assistant'
        });

        // ========================================
        // 6.3 Create assistant database record
        // ========================================
        assistant = agentRepository.create({
          id: ASSISTANT_ID,
          name: assistantName,
          role: 'assistant' as RoleType,
          workspace_path: directories.workspace
        });

        // ========================================
        // 6.4 Sync OpenClaw config
        // ========================================
        const syncResult = syncOpenClawConfig(assistant);
        if (!syncResult.success) {
          console.warn(`警告: ${syncResult.message}`);
        }

        // Record agent creation
        const agentConfig = {
          id: assistant.id,
          name: assistant.name,
          workspace: assistant.workspace_path,
          agentDir: getAgentDir(assistant.id)
        };
        configTracker.recordAgentCreate(assistant.id, agentConfig);
      } else {
        // Assistant exists, ensure directories and files exist
        await this.ensureAssistantDirectories(assistant.name || assistantName);
      }

      // 7. Create preset skill packs and jobs
      this.createPresetSkillPacks();
      this.createPresetJobs();

      // 8. Update agent workspace_path if needed
      const currentAssistant = agentRepository.getAssistant();
      if (currentAssistant && !currentAssistant.workspace_path) {
        agentRepository.updateAgent(ASSISTANT_ID, { workspace_path: getAgentWorkspace(ASSISTANT_ID) });
      }

      return {
        success: true,
        message: '系统初始化成功',
        assistant_id: ASSISTANT_ID
      };
    } catch (error) {
      return {
        success: false,
        message: `初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        assistant_id: ''
      };
    }
  }

  /**
   * Ensure assistant directories and files exist
   * If directories were manually deleted, will recreate and record to config_changes
   */
  private async ensureAssistantDirectories(assistantName: string): Promise<void> {
    const workspacePath = getAgentWorkspace(ASSISTANT_ID);
    const agentDir = getAgentDir(ASSISTANT_ID);
    const sessionsDir = getAgentSessionsDir(ASSISTANT_ID);

    // Ensure workspace directory exists
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
      configTracker.recordDirectoryCreate(workspacePath, `总助理工作空间（恢复）`);
      console.log(chalk.dim(`  已创建工作空间目录: ${workspacePath}`));
    }

    // Ensure Agent directory exists
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
      configTracker.recordDirectoryCreate(agentDir, `总助理Agent目录（恢复）`);
      console.log(chalk.dim(`  已创建Agent目录: ${agentDir}`));
    }

    // Ensure sessions directory exists
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
      configTracker.recordDirectoryCreate(sessionsDir, `总助理会话目录（恢复）`);
      console.log(chalk.dim(`  已创建会话目录: ${sessionsDir}`));
    }

    // Ensure guide files exist
    if (!fs.existsSync(path.join(workspacePath, 'AGENTS.md'))) {
      createAgentFiles(ASSISTANT_ID, {
        name: assistantName,
        role: 'assistant'
      });
      console.log(chalk.dim(`  已创建引导文件`));
    }

    // Ensure auth-profiles.json exists
    const authProfilesPath = path.join(agentDir, 'auth-profiles.json');
    if (!fs.existsSync(authProfilesPath)) {
      initializeAuthProfiles(ASSISTANT_ID);
      console.log(chalk.dim(`  已创建认证配置文件`));
    }
  }

  /**
   * Create preset skill packs
   */
  private createPresetSkillPacks(): void {
    const presetSkillPacks = [
      {
        id: 'vue_basic',
        name: 'Vue 基础技能包',
        description: 'Vue.js 前端开发基础技能',
        content: JSON.stringify({
          sections: [
            { title: '技术栈', content: 'Vue 3, TypeScript, Pinia, Vue Router, Vite' },
            { title: '代码规范', content: '遵循 Vue 官方风格指南，使用 Composition API' },
            { title: '常见任务', content: '组件开发、状态管理、路由配置、API对接' }
          ]
        })
      },
      {
        id: 'react_basic',
        name: 'React 基础技能包',
        description: 'React 前端开发基础技能',
        content: JSON.stringify({
          sections: [
            { title: '技术栈', content: 'React 18, TypeScript, Redux Toolkit, React Router, Vite' },
            { title: '代码规范', content: '遵循 Airbnb React 规范，使用 Hooks' },
            { title: '常见任务', content: '组件开发、状态管理、路由配置、API对接' }
          ]
        })
      },
      {
        id: 'nodejs_backend',
        name: 'Node.js 后端技能包',
        description: 'Node.js 后端开发技能',
        content: JSON.stringify({
          sections: [
            { title: '技术栈', content: 'Node.js, Express/Fastify, TypeScript, Prisma, PostgreSQL' },
            { title: '代码规范', content: 'RESTful API 设计，遵循 Node.js 最佳实践' },
            { title: '常见任务', content: 'API开发、数据库设计、中间件编写、认证授权' }
          ]
        })
      },
      {
        id: 'python_backend',
        name: 'Python 后端技能包',
        description: 'Python 后端开发技能',
        content: JSON.stringify({
          sections: [
            { title: '技术栈', content: 'Python 3.11+, FastAPI/Flask, SQLAlchemy, PostgreSQL' },
            { title: '代码规范', content: '遵循 PEP 8，使用类型注解' },
            { title: '常见任务', content: 'API开发、数据库设计、异步任务、数据处理' }
          ]
        })
      },
      {
        id: 'test_engineer',
        name: '测试工程技能包',
        description: '软件测试工程师技能',
        content: JSON.stringify({
          sections: [
            { title: '技术栈', content: 'Jest, Vitest, Playwright, Cypress, JMeter' },
            { title: '测试类型', content: '单元测试、集成测试、E2E测试、性能测试' },
            { title: '常见任务', content: '测试用例编写、自动化测试、测试报告' }
          ]
        })
      },
      {
        id: 'architecture_design',
        name: '架构设计技能包',
        description: '系统架构设计技能',
        content: JSON.stringify({
          sections: [
            { title: '设计领域', content: '系统架构、微服务、数据库设计、API设计' },
            { title: '设计原则', content: 'SOLID原则、高内聚低耦合、可扩展性' },
            { title: '常见任务', content: '架构设计、技术选型、性能优化、技术评审' }
          ]
        })
      }
    ];

    for (const pack of presetSkillPacks) {
      // Check if already exists
      const existing = skillPackService.getById(pack.id);
      if (!existing) {
        skillPackService.create(pack);
        // Record skill pack creation
        configTracker.recordSkillPackCreate(pack.id, {
          id: pack.id,
          name: pack.name,
          description: pack.description
        });
      }
    }
  }

  /**
   * Create preset jobs
   */
  private createPresetJobs(): void {
    const presetJobs = [
      {
        id: 'frontend_dev',
        name: '前端开发',
        skill_pack_ids: ['vue_basic', 'react_basic']
      },
      {
        id: 'backend_dev',
        name: '后端开发',
        skill_pack_ids: ['nodejs_backend', 'python_backend']
      },
      {
        id: 'fullstack_dev',
        name: '全栈开发',
        skill_pack_ids: ['vue_basic', 'react_basic', 'nodejs_backend', 'python_backend']
      },
      {
        id: 'test_engineer',
        name: '测试工程师',
        skill_pack_ids: ['test_engineer']
      },
      {
        id: 'architect',
        name: '架构师',
        skill_pack_ids: ['architecture_design', 'nodejs_backend', 'python_backend']
      }
    ];

    for (const job of presetJobs) {
      // Check if already exists
      const existing = jobService.getById(job.id);
      if (!existing) {
        jobService.create(job);
        // Record job creation
        configTracker.recordJobCreate(job.id, {
          id: job.id,
          name: job.name,
          skill_pack_ids: job.skill_pack_ids
        });
      }
    }
  }
}

export const setupService = new SetupService();