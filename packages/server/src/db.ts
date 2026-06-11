import Database, { type Database as DatabaseType } from "better-sqlite3";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  sessionFilePath: text("sessionFilePath").notNull().unique(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * 初始化数据库：读取 migrations 目录下的 .sql 文件，按文件名字典序执行。
 * @param dbPath 数据库路径，默认 :memory:
 * @param migrationsDir 迁移文件目录，为空则跳过迁移（兼容无迁移目录的场景）
 */
export function initDb(
  dbPath: string = ":memory:",
  migrationsDir?: string
): DatabaseType {
  const sqlite = new Database(dbPath);

  if (migrationsDir) {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      sqlite.exec(sql);
    }
  }

  return sqlite;
}
