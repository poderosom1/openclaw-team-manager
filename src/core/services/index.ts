/**
 * Service Exports
 * 
 * Company Manager 0.0.3 - Basic Version
 */

export { SetupService, setupService } from './setup.service';
export { DeptService, deptService } from './dept.service';
export { AgentService, agentService } from './agent.service';
export { JobService, jobService } from './job.service';
export { SkillPackService, skillPackService } from './skill-pack.service';
export { feishuService } from './feishu.service';

// OpenClaw config related services
export { OpenClawConfigManager, openClawConfigManager } from './openclaw-config.service';
export type { AgentConfig, BindingConfig, OpenClawConfig } from './openclaw-config.service';

// Auth Profiles related services
export * from './auth-profiles.service';