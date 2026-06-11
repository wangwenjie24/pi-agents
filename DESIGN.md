<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

---
name: Pi Chat
description: 高效专业的多用户 AI 聊天应用
---

# Design System: Pi Chat

## 1. Overview

**Creative North Star: "安静的工位"**

一个光线充足、桌面整洁的工位。没有多余的装饰，每样东西都在它该在的位置。你坐下来就能开始工作，不需要整理桌面，不需要调整台灯。界面就是这个工位——对话是桌上的文件，工具栏是抽屉里触手可及的文具。

参考 ChatGPT 的对话流和 Claude 的排版克制感，但不模仿任何一方。Pi Chat 比两者更安静：更少的视觉层次，更少的装饰元素，更少的色彩。专业感来自精确的间距和一致的节奏，不来自精心设计的品牌感。

这个系统明确拒绝：聊天室式的视觉噪音、企业 IM 的功能堆砌、任何让用户注意到"界面"而不是"对话"的设计选择。

**Key Characteristics:**
- 单一 sans 字体家族，不做 display/body 配对
- 纯白背景 + 一个深靛蓝强调色，强调色只出现在交互元素上
- 无装饰动效，过渡仅服务于状态切换
- 信息密度够但不拥挤——用户不需要反复滚动

## 2. Colors

**The Restrained Rule.** 强调色只出现在需要用户注意的交互元素上：主按钮、当前选中项、焦点环、活跃状态指示器。屏幕上强调色占比 ≤10%。其余全是中性色。

**The Pure Surface Rule.** 背景是纯白，不加任何色相偏移。温暖感或专业感由强调色和排版传递，不由背景承载。

### Primary
- **Deep Indigo** (`oklch(0.478 0.136 252)` / 近似 `#3a4fcf`): 唯一的强调色。用于主按钮背景、选中态、焦点环、发送按钮活跃态。在这个色值上始终使用白色文字。

### Accent
- **Warm Amber** (`oklch(0.72 0.15 75)` / 近似 `#c48b2a`): 次要强调，仅用于状态指示——未读消息标记、成功/警告提示。与 primary 保持 ≥1.7 对比度。

### Neutral
- **Canvas** (`oklch(1.000 0.000 0)` / `#ffffff`): 主背景。纯白，零色相。
- **Surface** (`oklch(0.965 0.003 252)` / 近似 `#f4f5f9`): 侧边栏、卡片、面板的背景。canvas 向 ink 方向拉 10%，带极微量的品牌蓝色调。
- **Ink** (`oklch(0.180 0.020 252)` / 近似 `#1e2030`): 正文文字。带微量靛蓝色调的近黑色，对纯白背景对比度 ≥7:1。
- **Muted** (`oklch(0.550 0.015 252)` / 近似 `#737898`): 次要文字——时间戳、占位文字、辅助标签。ink 向 canvas 方向拉 40%，对比度 ≥3.5:1。
- **Border** (`oklch(0.900 0.005 252)` / 近似 `#dfe1ea`): 分隔线、输入框边框、卡片边框。极淡的靛蓝灰。

## 3. Typography

**Body Font:** `[单个 sans 字体家族，具体选择待实现时确定。方向：偏人文感的无衬线——像 Source Sans 3 或 DM Sans 的气质，但避免 DM Sans（训练数据默认字体）。在 Google Fonts 上浏览：Outfit 之外的人文/几何交叉家族。]`

**Character:** 一个干净、不带表演欲的字体。不追求个性，追求在任何字号和粗细下都清晰可读。标题靠字重和大小制造层次，不靠字体切换。

**The Single Family Rule.** 一个家族贯穿全应用：标题、正文、按钮、标签、代码注释。等宽字体仅在代码块中使用，不属于 UI 字体层。

### Hierarchy
- **Section Title** (600 weight, 1.125rem / 18px, line-height 1.4): 侧边栏区域标题、设置页分区标题
- **Item Title** (500 weight, 1rem / 16px, line-height 1.5): 会话列表项标题、设置项名称
- **Body** (400 weight, 1rem / 16px, line-height 1.6): 对话消息正文、描述文字。行宽限制 65–75ch
- **Caption** (400 weight, 0.8125rem / 13px, line-height 1.5): 时间戳、会话预览文字、辅助说明
- **Label** (500 weight, 0.75rem / 12px, letter-spacing 0.02em): 按钮、tab 标签、状态标记

### Scale Ratio
1.125x 递进，固定 rem 值，不做流体 clamp。产品 UI 在固定 DPI 下使用，fluid heading 在侧边栏里只会看起来奇怪。

## 4. Elevation

**The Flat-By-Default Rule.** 默认扁平。不使用 box-shadow 制造层级。深度通过背景色差异（canvas vs surface）和边框传达。

唯一例外：弹出层（dropdown、tooltip、modal）使用一个极淡的阴影确保从页面内容中分离。

- **Popup** (`box-shadow: 0 4px 16px oklch(0.180 0.020 252 / 0.08)`): 仅用于浮层——下拉菜单、tooltip、对话框。

## 5. Components

`[待实现后通过 $impeccable document 提取。以下为种子阶段的组件方向指引：]`

### 方向指引
- **按钮**: 圆角 6px，primary 用 Deep Indigo 填充 + 白色文字，ghost 用透明背景 + border。hover 态加深 5% lightness。focus-visible 使用 2px Deep Indigo 外环。
- **输入框**: 圆角 6px，1px Border 色边框，focus 时边框切换为 Deep Indigo。placeholder 用 Muted 色。
- **会话列表项**: 选中态使用 Surface 背景色，左侧无彩色条纹。hover 态使用更浅一级的 Surface。
- **消息气泡**: 无气泡。AI 和用户消息通过排版（对齐、间距、微妙的头像/名称标签）区分，不用彩色背景块。
- **侧边栏**: Surface 背景，与主内容区通过 Border 色分隔。可收起。

## 6. Do's and Don'ts

### Do:
- **Do** 使用纯白背景。`#ffffff`，不加色相偏移。
- **Do** 让 Deep Indigo 只出现在用户需要点击或注意的元素上。一个屏幕上强调色占比不超过 10%。
- **Do** 用间距和字重制造层次，不用颜色。
- **Do** 保持过渡在 150–250ms，仅用于状态切换。
- **Do** 使用 skeleton 占位而非居中 spinner。

### Don't:
- **Don't** 使用彩色气泡背景区分 AI 和用户消息。参考 ChatGPT 的克制做法。
- **Don't** 添加装饰性动画、入场编排或滚动驱动动效。
- **Don't** 在侧边栏卡片上使用 `border-left` 彩色条纹。
- **Don't** 使用渐变、毛玻璃效果或彩色阴影。
- **Don't** 让界面元素比对话内容更吸引注意力。
- **Don't** 重新发明标准控件——自定义滚动条、非标准模态框、怪异表单控件。
- **Don't** 在非代码的 UI 文字中使用等宽字体。
