# Team Manager (Basic Version)

Multi-Agent Collaboration Framework - CLI Management Tool (Basic Version)

## 简介

Team Manager 基础版提供 Agent 创建和飞书绑定功能，支持：

- **四种角色创建**：总助理、管理者、执行者、审核者
- **团队管理**：创建和管理团队
- **Agent 工作空间**：自动创建 OpenClaw 标准目录结构
- **飞书集成**：绑定飞书群和 Bot

## 安装

```bash
# 安装依赖
npm install

# 编译
npm run build

# 全局安装（可选）
npm link
```

## 快速开始

### 方式一：交互式界面（推荐）

```bash
# 启动交互式终端界面
npm run dev -- tui
```

TUI 提供友好的交互式界面，支持：
- **团队创建向导**：一步步引导创建团队和 Agent
- **Agent 管理**：创建、查看、删除 Agent
- **团队管理**：创建和管理团队
- **职业和技能包管理**
- **飞书配置**

### 方式二：命令行操作

#### 1. 初始化系统

```bash
# 使用交互式初始化
npm run dev -- setup init
```

#### 2. 创建团队

```bash
npm run dev -- create-dept --name "研发团队" --id dev_team
```

#### 3. 创建Agent

```bash
# 创建管理者
npm run dev -- create-agent --name "管理者_001" --role manager --dept dev_team

# 创建审核者
npm run dev -- create-agent --name "审核者_001" --role reviewer --dept dev_team

# 创建执行者（需要指定职业）
npm run dev -- create-agent --name "前端_001" --role executor --dept dev_team --job frontend_dev
```

#### 4. 查看系统状态

```bash
npm run dev -- status
```

## 命令列表

### 初始化

| 命令 | 说明 |
|------|------|
| `team-setup init` | 初始化系统 |

### 团队管理

| 命令 | 说明 |
|------|------|
| `create-dept --name <name> [--id <id>]` | 创建团队 |
| `list-depts` | 列出所有团队 |
| `update-dept --id <id> [--name <name>]` | 更新团队 |
| `delete-dept --id <id>` | 删除团队 |

### Agent管理

| 命令 | 说明 |
|------|------|
| `create-agent --name <name> --role <role> [--dept <deptId>] [--job <jobId>]` | 创建Agent |
| `get-agent --id <id> 或 --department-id <id> --role <role>` | 查询Agent |
| `list-agents [--department-id <id>]` | 列出Agent |
| `delete-agent --id <id>` | 删除Agent |

### 职业管理

| 命令 | 说明 |
|------|------|
| `create-job --name <name> [--id <id>] [--skill-pack-ids <json>]` | 创建职业 |
| `get-job --id <id>` | 获取职业详情 |
| `list-jobs` | 列出所有职业 |
| `update-job --id <id> [--name <name>]` | 更新职业 |
| `delete-job --id <id>` | 删除职业 |

### 技能包管理

| 命令 | 说明 |
|------|------|
| `create-skill-pack --name <name> --description <desc> --content <content>` | 创建技能包 |
| `get-skill-pack --id <id>` | 获取技能包详情 |
| `list-skill-packs` | 列出所有技能包 |
| `update-skill-pack --id <id>` | 更新技能包 |
| `delete-skill-pack --id <id>` | 删除技能包 |

### 飞书配置

| 命令 | 说明 |
|------|------|
| `show-feishu-config` | 显示飞书配置 |
| `config-feishu --app-id <id> --app-secret <secret>` | 配置飞书 |
| `bind-feishu-group --department-id <id> --group-id <id>` | 绑定飞书群 |
| `bind-feishu-bot --agent-id <id> --bot-id <id>` | 绑定飞书Bot |

### 状态查询

| 命令 | 说明 |
|------|------|
| `status` | 查看系统状态 |

## 数据存储

遵循 OpenClaw 官方目录标准：

- **配置文件**: `~/.openclaw/openclaw.json`
- **数据库**: `~/.openclaw/company/company.db` (SQLite)
- **Agent工作空间**: `~/.openclaw/workspace-{agent_id}/`
- **Agent目录**: `~/.openclaw/agents/{agent_id}/`

## 项目结构

```
team-manager/
├── src/
│   ├── bin/                    # CLI入口
│   ├── cli/                    # CLI命令
│   │   ├── commands/           # 命令实现
│   │   └── tui/                # 交互式界面
│   ├── core/                   # 核心业务
│   │   ├── models/             # 数据模型
│   │   ├── services/           # 业务服务
│   │   └── utils/              # 工具函数
│   └── db/                     # 数据库层
│       ├── repositories/       # 数据访问
│       └── schema.sql          # 表结构
├── package.json
└── tsconfig.json
```

## 开发

```bash
# 开发模式运行
npm run dev -- <command>

# 编译
npm run build
```

## 许可证

MIT