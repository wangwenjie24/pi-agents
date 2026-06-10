# Pi Chat

一个基于 PI Agent SDK 的多用户 AI 聊天应用，提供流式对话、会话管理、联网搜索和可配置 Agent 能力。

## Language

**Session**:
用户的一次完整对话会话，由 PI Agent SDK 的 SessionManager 持久化为 JSONL 文件。
_Avoid_: conversation, chat, dialog

**Session 元信息**:
Session 的列表级信息（名称、创建时间等），由 SQLite 管理，与 JSONL 存储的对话内容互补。
_Avoid_: session metadata, session header

**Agent**:
PI Agent SDK 创建的对话智能体，拥有可配置的角色人设和工具集。
_Avoid_: bot, assistant, model

**工具集**:
Agent 可调用的能力集合。当前为受限工具集（read、grep、find、ls + Tavily 搜索），不含高风险工具（bash、edit、write）。
_Avoid_: tools, capabilities

**用户配置**:
浏览器端维护的模型连接信息（provider、model id、base URL、API key），存储在 localStorage，每次连接时发送给后端运行时注入。
_Avoid_: user settings, user preferences

**消息协议**:
后端定义的自定义消息格式，在 PI SDK 原生事件之上做抽象，隔离前端对 SDK 的直接依赖。
_Avoid_: event protocol, wire format

## 架构决策

- 集成方式：PI Agent SDK 进程内直接调用（非 RPC 子进程）
- 流式通信：WebSocket（ws 库），双向实时
- REST 接口：Express，用于会话 CRUD 管理
- 前端：React + Zustand + assistant-ui（Custom Runtime 对接 WebSocket）
- 后端抽象：自定义消息协议，前端不直接接触 PI SDK 事件类型
- 并发模型：多用户，每个用户独立 Agent Session
- 用户认证：暂不实现，后续扩展
- Session 存储：PI SDK SessionManager（JSONL 文件）+ SQLite（Drizzle ORM + better-sqlite3）
- Agent 工具：受限工具集，不含 bash/edit/write，联网搜索通过 Tavily 自定义工具实现
- Agent 角色：可配置，由系统或管理员设定
- 用户配置存储：浏览器 localStorage（API key 不经手服务端）
- UI 组件：assistant-ui（AI 聊天专用组件库，Custom Runtime 对接自有 WebSocket 协议）+ Tailwind CSS
- 项目结构：pnpm Monorepo（packages/server、packages/web、packages/shared）
