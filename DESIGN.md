<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

---
name: Pi Chat
description: 高效专业的多用户 AI 聊天应用
colors:
  background: "#ffffff"
  foreground: "#171717"
  primary: "#171717"
  primary-foreground: "#ffffff"
  secondary: "#f5f5f5"
  secondary-foreground: "#171717"
  muted: "#f5f5f5"
  muted-foreground: "#8f8f8f"
  accent: "#f5f5f5"
  accent-foreground: "#171717"
  border: "#ebebeb"
  input: "#ebebeb"
  ring: "#dbdbdb"
  destructive: "#d64545"
  sidebar: "#fafafa"
  sidebar-border: "#ebebeb"
typography:
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  heading:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
  full: "9999px"
spacing:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
---

# Design System: Pi Chat

## 1. Overview

**Creative North Star: "白纸上的对话"**

一张干净的白纸，上面只有正在进行的对话。没有品牌色块、没有装饰线条、没有视觉噪音。界面完全透明——用户看到的只有文字和交互。参考 LangChain agent-chat-ui 的极简克制，但为 Pi Chat 的多用户协作场景做适配。

这个系统从 agent-chat-ui 继承的核心决定：纯单色调（零色度），无品牌强调色，所有层级通过明度差异表达。AI 消息不使用气泡，直接渲染 Markdown；用户消息使用淡灰背景圆角条。

**Key Characteristics:**
- 纯中性色阶，primary 就是近黑色，没有任何饱和色
- 单一 sans 字体家族（Inter），不做 display/body 配对
- AI 消息无气泡，用户消息 muted 背景 + 大圆角
- 300px 可收起侧边栏 + 居中聊天区 + 可扩展右侧面板
- 动效仅用于布局切换（侧边栏滑入/滑出），消息无入场动画

## 2. Colors

**The Monochrome Rule.** 整个界面使用纯中性色阶，色度恒为 0。没有任何品牌强调色。交互层级通过明度差异和排版表达，不通过颜色。这是从 agent-chat-ui 继承的最核心决定。

**The Dark Mode Mirror Rule.** 暗色模式是亮色模式的精确反转：背景和前景互换，secondary/muted 取相同的相对深度位置。不引入色相。

### Neutral (light mode)

| Token | OKLCH | Hex | Role |
|-------|-------|-----|------|
| background | `oklch(1 0 0)` | `#ffffff` | 主背景 |
| foreground | `oklch(0.145 0 0)` | `#171717` | 正文文字 |
| primary | `oklch(0.205 0 0)` | `#171717` | 主按钮背景、强调交互 |
| primary-foreground | `oklch(0.985 0 0)` | `#ffffff` | 主按钮文字 |
| secondary | `oklch(0.97 0 0)` | `#f5f5f5` | 次要表面、用户消息气泡 |
| secondary-foreground | `oklch(0.205 0 0)` | `#171717` | 次要表面上的文字 |
| muted | `oklch(0.97 0 0)` | `#f5f5f5` | 淡化背景、用户消息气泡 |
| muted-foreground | `oklch(0.556 0 0)` | `#8f8f8f` | 次要文字：时间戳、占位符 |
| border | `oklch(0.922 0 0)` | `#ebebeb` | 分隔线、输入框边框 |
| sidebar | `oklch(0.985 0 0)` | `#fafafa` | 侧边栏背景 |

### Semantic

- **destructive** (`#d64545`): 仅用于错误状态、删除操作。这是唯一允许饱和色的 token。

### Named Rules

**The Zero Chroma Rule.** 除 destructive 外，所有颜色的色度为 0。不使用 OKLCH 的 C 通道。层级靠 L（明度）表达。

## 3. Typography

**Font:** Inter（Google Fonts），单一家族贯穿全部 UI。

**Character:** 干净、中性的无衬线字体。不追求个性——在一个零品牌色的界面里，字体就是品牌。Inter 的 x-height 高、可读性好，适合信息密集的聊天界面。

**The Single Family Rule.** 一个家族覆盖所有层级：标题、正文、按钮、标签、代码注释。等宽字体仅在代码块中使用。

### Hierarchy
- **Page Title** (600, 1.5rem / 24px, lh 1.3): 品牌名、页面标题
- **Section Title** (600, 1.125rem / 18px, lh 1.4): 侧边栏标题、设置分区
- **Item Title** (500, 1rem / 16px, lh 1.5): 会话列表项、设置项
- **Body** (400, 0.875rem / 14px, lh 1.6): 消息正文、描述文字。默认字号
- **Caption** (400, 0.8125rem / 13px, lh 1.5): 时间戳、辅助文字
- **Label** (500, 0.75rem / 12px, lh 1): 按钮、tab 标签

### Scale Ratio
1.125x，固定 rem。产品 UI 不做流体 clamp。

## 4. Elevation

**The Flat Rule.** 默认扁平。层级通过背景明度差异（background vs sidebar vs muted）和 1px border 表达。不使用 box-shadow。

唯一例外：
- **输入区域** (`shadow-xs`): 底部输入框使用极淡阴影，确保与消息流分离。
- **浮层** (`shadow-sm`): dropdown、tooltip 使用轻阴影确保从页面脱离。

## 5. Components

`[待实现后通过 $impeccable document 提取。以下为基于 agent-chat-ui 参考的组件方向指引：]`

### 布局结构
- **左侧边栏** (300px, 可收起): `sidebar` 背景，`sidebar-border` 右边框。Framer Motion 弹簧动画 (stiffness 300, damping 30) 滑入/滑出。移动端使用 Sheet（从左侧滑入的全屏面板）。
- **聊天主区**: 居中，`max-w-3xl` (48rem)，`background` 背景。消息列表上 padding 下 padding 大，滚动到底部自动跟随。
- **右侧面板** (可选): `grid-cols-[1fr_0fr]` → `grid-cols-[3fr_2fr]`，500ms transition 展开/收起。用于 artifact 或详情展示。

### 消息渲染
- **AI 消息**: 左对齐，无气泡，无背景色。直接渲染 Markdown（支持 GFM、代码高亮、数学公式）。`py-1` 间距。Hover 时显示操作栏（复制、重新生成），`opacity-0 group-hover:opacity-100`。
- **用户消息**: 右对齐，`muted` 背景，`rounded-3xl`，`px-4 py-2`。支持编辑（hover 显示编辑按钮，点击展开 textarea）。
- **加载状态**: 三个脉动圆点，`muted` 背景，`rounded-2xl`。

### 输入区域
- 底部固定，`muted` 背景，`rounded-2xl`，`shadow-xs`。
- Textarea：无边框，`bg-transparent`，`field-sizing-content` 自适应高度。
- Enter 发送，Shift+Enter 换行。
- Send 按钮：`primary` 背景即近黑色，白色文字，`shadow-md`，右对齐。加载中显示 Cancel 按钮（旋转图标）。
- 附加操作（文件上传等）在输入框底部，`text-gray-600` 小文字 + 图标。

### 按钮
- **Primary**: `primary` 背景 + `primary-foreground` 文字，`shadow-xs`，`rounded-md` (8px)。Hover 时 `primary/90`。
- **Ghost**: 透明背景，hover 时 `accent` 背景。
- **Outline**: `border-input` 边框，`bg-background`，hover 时 `accent` 背景。
- 尺寸：default `h-9 px-4`，sm `h-8 px-3`，lg `h-10 px-6`，icon `size-9`。

### 侧边栏会话列表
- 每项一个 Ghost 按钮，`w-[280px]`，文字 `truncate`。
- 选中态：当前依赖 URL query state，不使用视觉高亮（可后续加）。
- 加载状态：Skeleton 占位条。

### 滚动条
- 全局自定义：`w-1.5` (6px)，`rounded-full`，`bg-gray-300` thumb，`bg-transparent` track。

## 6. Do's and Don'ts

### Do:
- **Do** 使用纯中性色阶。所有非 destructive 的颜色色度为 0。
- **Do** 让 AI 消息无气泡、无背景，直接渲染 Markdown。
- **Do** 让用户消息使用 `muted` 背景 + 大圆角，右对齐。
- **Do** 用明度差异表达层级（background > sidebar > muted > border）。
- **Do** 保持输入区域底部固定，`rounded-2xl` + 淡阴影。
- **Do** 使用 Framer Motion 弹簧动画处理侧边栏滑入/滑出。
- **Do** 使用 Inter 字体，不混合其他字体家族。
- **Do** 消息操作栏使用 `opacity-0 group-hover:opacity-100` 渐显。

### Don't:
- **Don't** 引入品牌强调色。这个界面的品牌就是克制本身。
- **Don't** 给 AI 消息添加气泡或背景色。
- **Don't** 使用入场动画、滚动驱动动效或消息出现动画。
- **Don't** 在侧边栏使用彩色条纹、彩色圆点或其他色彩标记。
- **Don't** 使用渐变、毛玻璃效果或彩色阴影。
- **Don't** 重新发明标准控件（自定义滚动条样式除外）。
- **Don't** 在非代码 UI 文字中使用等宽字体。
- **Don't** 使用 `border-left` / `border-right` > 1px 作为彩色装饰。
