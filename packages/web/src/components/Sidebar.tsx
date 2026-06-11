import React, { useEffect, useRef, useState } from "react";
import { useChatStore, type Session } from "../chat-store.js";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../hooks/use-is-mobile.js";
import { useThemeStore } from "../theme-store.js";
import { Sun, Moon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

const SIDEBAR_WIDTH = 300;
const SPRING_CONFIG = { stiffness: 300, damping: 30 };

export function Sidebar() {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const fetchSessions = useChatStore((s) => s.fetchSessions);
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const switchSession = useChatStore((s) => s.switchSession);
  const connect = useChatStore((s) => s.connect);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSessions().then(() => {
      setLoading(false);
      const currentSessions = useChatStore.getState().sessions;
      const savedId = localStorage.getItem("pi-chat:activeSessionId");

      if (savedId && currentSessions.some((s) => s.id === savedId)) {
        useChatStore.setState({ activeSessionId: savedId });
        connect("ws://localhost:8080", savedId);
        return;
      }

      if (currentSessions.length > 0) {
        const latest = currentSessions[0];
        useChatStore.setState({ activeSessionId: latest.id });
        connect("ws://localhost:8080", latest.id);
        return;
      }

      createSession().then((s) => {
        useChatStore.setState({ activeSessionId: s.id });
        connect("ws://localhost:8080", s.id);
      });
    });
  }, []);

  const handleNewSession = async () => {
    const session = await createSession();
    switchSession(session.id);
    if (isMobile) setSheetOpen(false);
  };

  const handleSwitchSession = (id: string) => {
    switchSession(id);
    if (isMobile) setSheetOpen(false);
  };

  const sidebarContent = (
    <>
      {/* 品牌 Logo 区域 */}
      <div
        className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleNewSession}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-sm font-semibold">P</span>
        </div>
        <span className="text-sm font-semibold text-foreground">Pi Chat</span>
      </div>

      {/* 顶栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-foreground">会话</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewSession}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="新建对话"
            aria-label="新建对话"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </button>
          {!isMobile && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="收起侧边栏"
              aria-label="收起侧边栏"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="14" height="14" rx="2" />
                <line x1="5.5" y1="1" x2="5.5" y2="15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="px-3 py-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 bg-accent/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSwitch={() => handleSwitchSession(session.id)}
              onDelete={() => deleteSession(session.id)}
              onRename={(name) => renameSession(session.id, name)}
            />
          ))
        )}
      </div>

      {/* 底部：主题切换 */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={theme === "light" ? "切换暗色模式" : "切换亮色模式"}
        >
          {theme === "light" ? (
            <Moon size={16} />
          ) : (
            <Sun size={16} />
          )}
          <span>{theme === "light" ? "暗色模式" : "亮色模式"}</span>
        </button>
      </div>
    </>
  );

  // ── 移动端：Sheet 模式 ──
  if (isMobile) {
    return (
      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* 移动端汉堡按钮 */}
        <button
          onClick={() => setSheetOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="打开侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="4" x2="14" y2="4" />
            <line x1="2" y1="8" x2="14" y2="8" />
            <line x1="2" y1="12" x2="14" y2="12" />
          </svg>
        </button>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-0 top-0 bottom-0 w-[300px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            <Dialog.Title className="sr-only">会话列表</Dialog.Title>
            <Dialog.Description className="sr-only">管理你的会话</Dialog.Description>
            {sidebarContent}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // ── 桌面端：固定侧边栏 + 收起/展开动画 ──
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.aside
          initial={{ width: SIDEBAR_WIDTH }}
          animate={{ width: SIDEBAR_WIDTH }}
          exit={{ width: 0 }}
          transition={{ type: "spring", ...SPRING_CONFIG }}
          className="flex flex-col bg-sidebar border-r border-sidebar-border h-full overflow-hidden"
          data-testid="sidebar"
        >
          {sidebarContent}
        </motion.aside>
      )}

      {/* 收起状态的展开按钮 */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors self-start mt-3 ml-2"
          title="展开侧边栏"
          aria-label="收起侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="14" height="14" rx="2" />
            <line x1="5.5" y1="1" x2="5.5" y2="15" />
          </svg>
        </button>
      )}
    </AnimatePresence>
  );
}

function SessionItem({
  session,
  isActive,
  onSwitch,
  onDelete,
  onRename,
}: {
  session: Session;
  isActive: boolean;
  onSwitch: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(trimmed);
    } else {
      setEditName(session.name);
    }
    setEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => !editing && onSwitch()}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSubmitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitRename();
            if (e.key === "Escape") {
              setEditName(session.name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-background rounded px-2 py-0.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{session.name}</span>
          {showActions && (
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                  setEditName(session.name);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="重命名"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 1.5a2.121 2.121 0 013 3L5 14l-3.5.5L2 11l9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                title="删除"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
