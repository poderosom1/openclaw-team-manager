# Team Manager

[中文文档](README.md)

A CLI management tool for multi-agent collaboration framework based on OpenClaw and Feishu (Lark).

**Lightweight design, package size ~150KB. Runs independently from OpenClaw - OpenClaw version upgrades do not affect this tool. No network access, data stored locally for better security.**

## Overview

Team Manager provides a simple TUI (Terminal User Interface) that allows you to create, configure, and integrate OpenClaw Agents with Feishu through keyboard operations.

If you use both Feishu and OpenClaw, Team Manager can help you:
- Manage and use Agents more conveniently
- Bind Feishu groups to teams for message routing without manually configuring complex openclaw.json
- View and manage all Agent statuses with one command

**Current Features:**
- TUI interactive interface
- Agent creation and configuration
- Team creation and management
- Feishu Bot binding
- Feishu group binding
- System reset and backup/restore

**Development Roadmap:**
- Job and skill pack management
- Task creation and assignment
- Task status workflow
- Multi-channel support (Discord, Telegram, etc.)
- Inter-agent communication
- Timeout monitoring and alerts

## Requirements

- **OS**: Windows / macOS / Linux
- **Node.js**: ≥ 18
- **OpenClaw**: Must be installed and configured first
- **macOS users**: Xcode Command Line Tools required (`xcode-select --install`)

## Installation

```bash
npm install -g openclaw-team-manager
```

Or build from source:

```bash
git clone https://github.com/poderosom1/openclaw-team-manager.git
cd team-manager
npm install && npm run build
```

## Uninstall

```bash
openclaw-team-uninstall
```

This command removes Team Manager's workspace history. The database and Agent workspaces are preserved in the OpenClaw directory.

## Quick Start

```bash
# Start TUI interface (recommended)
openclaw-team-manager tui

# Or use command line
openclaw-team-manager setup init                    # Initialize
openclaw-team-manager create-dept --name "Dev Team" # Create team
openclaw-team-manager create-agent --name "Manager" --role manager --dept <dept_id>
openclaw-team-manager status                        # View status
```

## Feishu Integration

```bash
openclaw-team-manager config-feishu --app-id cli_xxx --app-secret xxx
openclaw-team-manager bind-feishu-group --department-id <id> --group-id oc_xxx
openclaw-team-manager bind-feishu-bot --agent-id <id> --bot-id cli_xxx
```

## Commands

| Command | Description |
|---------|-------------|
| `tui` | Start interactive interface |
| `setup init` | Initialize system |
| `status` | View system status |
| `create-dept` | Create team |
| `list-depts` | List teams |
| `delete-dept --id <id>` | Delete team |
| `create-agent` | Create Agent |
| `list-agents` | List Agents |
| `delete-agent --id <id>` | Delete Agent |
| `create-job` | Create job |
| `list-jobs` | List jobs |
| `delete-job --id <id>` | Delete job |
| `create-skill-pack` | Create skill pack |
| `list-skill-packs` | List skill packs |
| `delete-skill-pack --id <id>` | Delete skill pack |
| `config-feishu` | Configure Feishu app |
| `bind-feishu-bot` | Bind Feishu Bot |

**Note:** After installation, use `openclaw-team-manager` as the command, e.g. `openclaw-team-manager tui`.

## Data Storage

```
~/.openclaw/
├── openclaw.json           # Main config
├── team/                   # Business data
│   └── team.db            # SQLite database
├── agents/{id}/            # Agent config
└── workspace-{id}/         # Agent workspace
```

## Detailed Usage

### 1. Initialize System

First-time use requires system initialization by specifying the OpenClaw workspace directory:

```bash
openclaw-team-manager tui
```

After startup, select or enter the `.openclaw` directory path. The system will automatically create:
- Database file (`team/team.db`)
- Assistant Agent
- Basic directory structure

### 2. Create Team

A team is the organizational unit for Agents. Each team can have:
- 1 Manager
- 1 Reviewer
- Multiple Executors

**Via TUI:**
1. Select "Team Management" → "Create Team"
2. Enter team name

**Via command line:**
```bash
openclaw-team-manager create-dept --name "Product Team" --id product
```

### 3. Create Agent

**Role Description:**
| Role | Description | Limit |
|------|-------------|-------|
| Assistant | Global coordinator | 1 globally |
| Manager | Team contact | 1 per team |
| Reviewer | Quality control | 1 per team |
| Executor | Task execution | Unlimited |

**Via TUI:**
1. Select "Agent Management" → "Create Agent"
2. Select role type
3. Select team
4. Enter Agent name

**Via command line:**
```bash
# Create manager
openclaw-team-manager create-agent --name "Product Manager" --role manager --dept product

# Create executor
openclaw-team-manager create-agent --name "Frontend Dev" --role executor --dept product
```

### 4. Feishu Integration

#### 4.1 Create Feishu App

1. Visit [Feishu Open Platform](https://open.feishu.cn/)
2. Create an enterprise self-built app
3. Get App ID and App Secret
4. Configure event subscription and permissions

#### 4.2 Configure Feishu App

```bash
openclaw-team-manager config-feishu --app-id cli_xxx --app-secret xxx
```

#### 4.3 Bind Feishu Group to Team

```bash
openclaw-team-manager bind-feishu-group --department-id product --group-id oc_xxx
```

After binding, chat content from this group will be automatically routed to the team's Manager Agent.

#### 4.4 Bind Feishu Bot to Agent

```bash
openclaw-team-manager bind-feishu-bot --agent-id agent_xxx --bot-id cli_xxx
```

After binding, the Agent can receive and send Feishu messages through this Bot.

### 5. View System Status

```bash
openclaw-team-manager status
```

Displays:
- Working directory
- Agent count and list
- Team count
- Feishu configuration status

### 6. System Reset

If you need to reinitialize, you can reset the system via TUI:

1. Select "System Management" → "Reset System"
2. Confirm the reset operation

Reset will:
- Automatically backup current data
- Clear all Agent and team data
- Preserve OpenClaw base configuration

## Feedback

Douyin: `39797966817`

## License

MIT