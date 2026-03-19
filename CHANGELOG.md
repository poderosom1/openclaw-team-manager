# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2026-03-19

### Changed
- Version bump for npm release (0.1.3 was already published)

## [0.1.3] - 2026-03-19

### Added
- **Agent 间通信配置**
  - 全局配置 `tools.sessions.visibility = 'all'` - 允许 Agent 看到所有会话
  - 全局配置 `session.agentToAgent.maxPingPongTurns = 3` - 限制 pingPong 循环次数
  - 每个 Agent 添加 `subagents.allowAgents` 配置

- **团队隔离机制**
  - 不同团队的 Agent 之间不能互相调用
  - 同一团队内的所有 Agent 可以互相通信
  - 全局助理（assistant_main）可以调用所有 Agent (`allowAgents = ['*']`）
  - 团队成员的 allowAgents 包含 assistant_main

- **动态更新**
  - 创建/删除 Agent 时自动更新相关 allowAgents 列表

- **Main Agent 保护**
  - Main agent 不可删除
  - 重置流程保留 main agent

### Fixed
- 修复 allowAgents 未包含 assistant_main 的问题
- 移除团队成员 allowAgents 中的 'main'（改用 role 判断）
- 使用 `role === 'assistant'` 替代 `id === 'main'` 判断

## [0.1.2] - 2026-03-18

### Fixed
- 重置功能 Bug 修复
  - 只删除 team-manager 创建的 agent 目录，保留默认 agent（main）
  - 重置后重启 Gateway 断开飞书长连接

## [0.1.0] - 2026-03-17

### Added
- TUI 交互式管理界面
- Agent 创建与配置
- 团队创建与管理
- 飞书 Bot 绑定
- 飞书群绑定
- 系统重置与备份恢复
- 职业管理
- 技能包管理