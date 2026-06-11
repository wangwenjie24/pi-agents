import { describe, it, expect, afterAll } from "vitest";
import { initDb } from "./db.js";
import { join } from "path";
import type Database from "better-sqlite3";

describe("数据库初始化", () => {
  let db: Database.Database;

  it("initDb 返回数据库实例并创建 sessions 表", () => {
    // vitest 从项目根运行，process.cwd() 即项目根
    const migrationsDir = join(process.cwd(), "migrations");
    db = initDb(":memory:", migrationsDir);
    expect(db).toBeDefined();

    // 验证 sessions 表存在
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
      )
      .all();
    expect(tables).toHaveLength(1);
  });

  it("sessions 表包含正确的列", () => {
    const columns = db.pragma("table_info(sessions)") as {
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }[];

    const colNames = columns.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("name");
    expect(colNames).toContain("createdAt");
    expect(colNames).toContain("updatedAt");
    expect(colNames).toContain("sessionFilePath");

    // id 是主键
    const idCol = columns.find((c) => c.name === "id")!;
    expect(idCol.pk).toBe(1);
  });

  afterAll(() => {
    db?.close();
  });
});
