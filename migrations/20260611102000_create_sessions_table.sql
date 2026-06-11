-- 创建 sessions 表：存储会话元信息
-- 配合 PI SDK SessionManager 的 JSONL 文件实现会话持久化

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  sessionFilePath TEXT NOT NULL UNIQUE
);
