# Agent configuration

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default triage label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.


# 工具偏好

- 包管理：uv (Python)
- Git：提交信息遵循 Conventional Commits（`feat:`, `fix:`, `chore:`, `refactor:`）

# 数据库迁移规范

涉及数据库结构或数据变更时，必须在 `migrations/` 目录下生成迁移文件，供后续生产环境按顺序执行。

- **文件命名**：`YYYYMMDDHHmmss_变更描述.sql`（如 `20260611103000_add_user_phone_column.sql`）
- **原则**：每个迁移文件应是幂等的，可在新环境初始化和生产增量更新两种场景下安全执行
- **顺序**：按文件名字典序即执行顺序，禁止修改已合入的迁移文件

# Subagent 使用策略

## 何时使用

| 场景 | 方案 |
|---|---|
| 不熟悉的代码区域 | `scout` 先侦察 |
| 大改动 / 多模块 | `scout` → `planner` → `worker` |
| 查外部文档 / API | `researcher` |
| 实现方案 | `worker` + `worktree: true` |
| 实现完成后审查 | `reviewer`（fresh context） |
| 方向决策拿不准 | `oracle` |
| 多维度并行审查 | `parallel reviewer` |
| 多 agent 并行改代码 | `parallel worker` + `worktree: true` |

**不用**：简单单文件修改、已熟悉的代码、快速问答。

## Worker 执行规则

- 所有 `worker` 任务统一使用 async 后台模式（`--bg`），完成后 Pi 自动通知
- 涉及 `worker` 改代码时，统一加 `worktree: true`

## 提示词原则

- 子 agent 看不到主对话，给完整背景
- 明确任务：需要找什么就说找什么，需要改什么就写明文件和行号
- 禁止委派理解：不要说"根据你的发现修复"，应直接指出改什么
- 禁止精简传入内容：传递 issue、PRD 等外部文档时，保留完整原文或原文链接，不得摘要或截断
