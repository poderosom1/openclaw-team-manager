# Team Manager

[English](README_EN.md)

基于 OpenClaw 和飞书应用的多 Agent 协作框架 CLI 管理工具。

**轻量级设计，安装包仅 ~150KB。独立于 OpenClaw 运行，OpenClaw 版本升级不影响本工具使用。无网络访问，数据本地存储更安全。**

## 简介

Team Manager 提供简洁的 TUI 交互界面，让你通过键盘操作即可完成 OpenClaw Agent 的创建、配置和飞书集成。

如果你同时使用飞书和 OpenClaw，Team Manager 可以帮你：
- 更加便捷地管理和使用 Agent
- 将飞书群绑定到团队，实现群消息路由，无需手动配置繁琐的 openclaw.json
- 一键查看和管理所有 Agent 状态

**当前功能 (v0.0.3)：**
- TUI 交互式管理界面
- Agent 创建与配置
- 团队创建与管理
- 飞书 Bot 绑定
- 飞书群绑定
- 系统重置与备份恢复

**计划功能：**
- 职业与技能包管理
- 任务创建与分配
- 任务状态流转
- 多渠道支持（Discord、Telegram 等）
- Agent 间协作通信
- 超时监控与告警

## 环境要求

- **操作系统**：Windows / macOS / Linux
- **Node.js**：≥ 18
- **OpenClaw**：需先安装并配置好 OpenClaw
- **macOS 用户**：需先安装 Xcode Command Line Tools（`xcode-select --install`）

## 安装

```bash
npm install -g openclaw-team-manager
```

或从源码构建：

```bash
git clone https://github.com/poderosom1/openclaw-team-manager.git
cd team-manager
npm install && npm run build
```

## 卸载

```bash
openclaw-team-uninstall
```

此命令会删除 Team Manager 的工作目录历史记录，数据库和 Agent 工作空间会保留在 OpenClaw 目录中。

## 快速开始

```bash
# 启动 TUI 交互界面（推荐）
openclaw-team-manager tui

# 或使用命令行
openclaw-team-manager setup init                    # 初始化
openclaw-team-manager create-dept --name "研发部"   # 创建团队
openclaw-team-manager create-agent --name "主管" --role manager --dept <dept_id>
openclaw-team-manager status                        # 查看状态
```

## 飞书集成

```bash
openclaw-team-manager config-feishu --app-id cli_xxx --app-secret xxx
openclaw-team-manager bind-feishu-group --department-id <id> --group-id oc_xxx
openclaw-team-manager bind-feishu-bot --agent-id <id> --bot-id cli_xxx
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `tui` | 启动交互式界面 |
| `setup init` | 初始化系统 |
| `status` | 查看系统状态 |
| `create-dept` | 创建团队 |
| `list-depts` | 列出团队 |
| `delete-dept --id <id>` | 删除团队 |
| `create-agent` | 创建 Agent |
| `list-agents` | 列出 Agent |
| `delete-agent --id <id>` | 删除 Agent |
| `create-job` | 创建职业 |
| `list-jobs` | 列出职业 |
| `delete-job --id <id>` | 删除职业 |
| `create-skill-pack` | 创建技能包 |
| `list-skill-packs` | 列出技能包 |
| `delete-skill-pack --id <id>` | 删除技能包 |
| `config-feishu` | 配置飞书应用 |
| `bind-feishu-bot` | 绑定飞书 Bot |

**注意：** 安装后命令为 `openclaw-team-manager`，例如 `openclaw-team-manager tui`。

## 数据存储

```
~/.openclaw/
├── openclaw.json           # 主配置
├── team/                   # 业务数据
│   └── team.db            # SQLite 数据库
├── agents/{id}/            # Agent 配置
└── workspace-{id}/         # Agent 工作空间
```

## 详细使用说明

### 1. 初始化系统

首次使用需要初始化系统，指定 OpenClaw 工作目录：

```bash
openclaw-team-manager tui
```

启动后选择或输入 `.openclaw` 目录路径，系统会自动创建：
- 数据库文件 (`team/team.db`)
- 总助理 Agent
- 基础目录结构

### 2. 创建团队

团队是 Agent 的组织单元，每个团队可以有：
- 1 个管理者
- 1 个审核者
- 多个执行者

**通过 TUI：**
1. 选择"团队管理" → "创建团队"
2. 输入团队名称

**通过命令行：**
```bash
openclaw-team-manager create-dept --name "产品部" --id product
```

### 3. 创建 Agent

**角色说明：**
| 角色 | 说明 | 数量限制 |
|------|------|----------|
| 总助理 | 全局协调者 | 全局唯一 |
| 管理者 | 团队对接人 | 每团队 1 个 |
| 审核者 | 质量把控 | 每团队 1 个 |
| 执行者 | 具体执行任务 | 无限制 |

**通过 TUI：**
1. 选择"Agent 管理" → "创建 Agent"
2. 选择角色类型
3. 选择所属团队
4. 输入 Agent 名称

**通过命令行：**
```bash
# 创建管理者
openclaw-team-manager create-agent --name "产品主管" --role manager --dept product

# 创建执行者
openclaw-team-manager create-agent --name "前端开发" --role executor --dept product
```

### 4. 飞书集成

#### 4.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置事件订阅和权限

#### 4.2 配置飞书应用

```bash
openclaw-team-manager config-feishu --app-id cli_xxx --app-secret xxx
```

#### 4.3 绑定飞书群到团队

```bash
openclaw-team-manager bind-feishu-group --department-id product --group-id oc_xxx
```

绑定后，该群的聊天内容会自动路由到团队的管理者 Agent。

#### 4.4 绑定飞书 Bot 到 Agent

```bash
openclaw-team-manager bind-feishu-bot --agent-id agent_xxx --bot-id cli_xxx
```

绑定后，Agent 可以通过该 Bot 接收和发送飞书消息。

### 5. 查看系统状态

```bash
openclaw-team-manager status
```

显示：
- 工作目录
- Agent 数量和列表
- 团队数量
- 飞书配置状态

### 6. 系统重置

如果需要重新初始化，可以通过 TUI 进行系统重置：

1. 选择"系统管理" → "重置系统"
2. 确认重置操作

重置会：
- 自动备份当前数据
- 清除所有 Agent 和团队数据
- 保留 OpenClaw 基础配置

## 反馈

抖音 `39797966817`

## 许可证

MIT