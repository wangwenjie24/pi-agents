import React, { useState } from "react";
import { useConfigStore } from "../config-store.js";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const provider = useConfigStore((s) => s.provider);
  const model = useConfigStore((s) => s.model);
  const baseUrl = useConfigStore((s) => s.baseUrl);
  const apiKey = useConfigStore((s) => s.apiKey);
  const updateConfig = useConfigStore((s) => s.updateConfig);

  const [form, setForm] = useState({ provider, model, baseUrl, apiKey });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const hasChanges =
    form.provider !== provider ||
    form.model !== model ||
    form.baseUrl !== baseUrl ||
    form.apiKey !== apiKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20">
      <div className="w-full max-w-md rounded-xl bg-background border border-border shadow-sm">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">模型配置</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* 表单 */}
        <div className="px-5 py-4 space-y-4">
          <Field
            label="Provider"
            value={form.provider}
            placeholder="openai"
            onChange={(v) => setForm({ ...form, provider: v })}
          />
          <Field
            label="Model ID"
            value={form.model}
            placeholder="gpt-4o"
            onChange={(v) => setForm({ ...form, model: v })}
          />
          <Field
            label="Base URL"
            value={form.baseUrl}
            placeholder="https://api.openai.com/v1"
            onChange={(v) => setForm({ ...form, baseUrl: v })}
          />
          <Field
            label="API Key"
            type="password"
            value={form.apiKey}
            placeholder="sk-..."
            onChange={(v) => setForm({ ...form, apiKey: v })}
          />
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {saved ? "✓ 已保存" : hasChanges ? "有未保存的更改" : "配置已同步"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
