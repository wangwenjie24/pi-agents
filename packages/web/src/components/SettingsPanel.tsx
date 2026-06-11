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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100">模型配置</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
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
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">
            {saved ? "✓ 已保存" : hasChanges ? "有未保存的更改" : "配置已同步"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
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
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
