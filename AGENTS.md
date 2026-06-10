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


# Subagent 使用策略

## 何时使用

| 场景 | 方案 |
|---|---|
| 不熟悉的代码区域 | `scout` 先侦察 |
| 大改动 / 多模块 | `scout` → `planner` → `worker` |
| 查外部文档 / API | `researcher` |
| 实现已批准的方案 | `worker` |
| 实现完成后审查 | `reviewer`（fresh context） |
| 方向决策拿不准 | `oracle` |
| 多维度并行审查 | `parallel reviewer` |
| 多 agent 并行改代码 | 加 `worktree: true` 防冲突 |

**不要用**：简单单文件修改、已熟悉的代码、快速问答——子 agent 有启动开销。

## 提示词原则

- 子 agent 看不到主对话，给完整背景
- 查证类给精确指令，调查类给问题不给步骤
- 说明已尝试过的，需要简短回复就明说