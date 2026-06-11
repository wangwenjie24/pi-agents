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
