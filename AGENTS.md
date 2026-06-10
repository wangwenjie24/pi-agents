# Agent configuration

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default triage label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.


## 工具偏好

- 包管理：uv (Python)
- Git：提交信息遵循 Conventional Commits（`feat:`, `fix:`, `chore:`, `refactor:`）
