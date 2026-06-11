// ── Client → Server messages ──

export interface PromptMessage {
  type: "prompt";
  text: string;
}

export interface AbortMessage {
  type: "abort";
}

export interface ConfigMessage {
  type: "config";
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

/** All messages the client can send to the server */
export type ClientMessage = PromptMessage | AbortMessage | ConfigMessage;

// ── Server → Client messages ──

export interface ConnectedMessage {
  type: "connected";
  sessionId: string;
}

export interface ChatDeltaMessage {
  type: "chat_delta";
  delta: string;
}

export interface ChatDoneMessage {
  type: "chat_done";
}

export interface ChatErrorMessage {
  type: "chat_error";
  error: string;
}

export interface SessionErrorMessage {
  type: "session_error";
  error: string;
}

export interface AgentStartMessage {
  type: "agent_start";
}

export interface AgentEndMessage {
  type: "agent_end";
}

export interface ToolStartMessage {
  type: "tool_start";
  toolName: string;
}

export interface ToolUpdateMessage {
  type: "tool_update";
  output: string;
}

export interface ToolEndMessage {
  type: "tool_end";
  result: string;
}

/** All messages the server can send to the client */
export type ServerMessage =
  | ConnectedMessage
  | ChatDeltaMessage
  | ChatDoneMessage
  | ChatErrorMessage
  | SessionErrorMessage
  | AgentStartMessage
  | AgentEndMessage
  | ToolStartMessage
  | ToolUpdateMessage
  | ToolEndMessage;
