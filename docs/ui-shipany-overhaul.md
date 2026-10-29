# ShipAny 风格 UI 改造记录

> 日期：2026-10-23
> 范围：全站 UI/主题系统（不涉及任何业务逻辑、数据库、支付流程的变更）

## 1. 背景与目标

将本项目（Next.js SaaS Starter）的前端界面按照 [ShipAny](https://shipany.ai) SaaS 模板的设计语言进行"像素级"改造：

- ShipAny 的分区结构（依据其官方文档 shipany-two-docs）：
  `header → hero → logos → features → stats → testimonials → faq → cta → footer`
- 技术栈对齐：ShipAny 默认主题基于 **shadcn/ui + Tailark 区块 + tweakcn 生成的 oklch 主题 token**，本项目同为 Next.js + Tailwind v4 + shadcn/ui，可直接对齐
- 视觉基调：中性 zinc 基底、violet/indigo→fuchsia 品牌渐变、Inter 字体、暗色模式优先

> ⚠️ 说明：shipany.ai 站点在改造时的网络环境中无法直接抓取，精确色值/字号未能逐像素比对；
> 实际还原依据为 ShipAny 官方文档中的分区结构、主题机制（tweakcn/oklch）与 shadcn 默认规范。

## 2. 主题系统

### 2.1 `app/globals.css`（完全重写）

**改造前的问题**：文件中存在两套重复且互相覆盖的 token 块（一套 HSL 三元组 + 旧 `@theme`，一套完整 hsl() + `@theme inline`），`--radius` 定义冲突（0.5rem vs 0.6rem），且定义了 `.dark` 变量但全站无任何地方切换 `dark` class。

**改造后**：

- 单一 token 体系，采用 **oklch 色彩空间**（shadcn 最新规范 / tweakcn 输出格式）
- 基底色：shadcn **zinc** 主题（light + dark 两套完整变量）
- 新增品牌色 token：
  - `--brand`：light 下为 violet-600（`oklch(0.541 0.281 293.009)`），dark 下为 violet-400
  - `--brand-foreground`：品牌色上的文字色
  - 通过 `@theme inline` 映射为 `--color-brand`，可直接使用 `text-brand`、`bg-brand/10`、`border-brand/40` 等工具类
- 新增三个渐变工具类（Tailwind v4 `@utility` 语法）：
  - `.text-gradient` — indigo→violet→fuchsia 文字渐变（hero 标题、stats 数字）
  - `.bg-brand-gradient` — 同色系背景渐变（Logo、CTA 徽章、主按钮）
  - `.border-brand-gradient` — 渐变边框（border-image）
- 移除了 v3 兼容的 `border-color: gray-200` 全局覆盖，统一为 shadcn 的 `* { @apply border-border }`（否则暗色模式边框过亮）
- 暗色模式下 `--border` / `--input` 使用半透明白（`oklch(1 0 0 / 12%)`），贴近 ShipAny 暗色观感

### 2.2 暗色模式机制

- `app/layout.tsx`：`<head>` 内联防闪烁脚本 —— 读取 `localStorage.theme`，无值时跟随 `prefers-color-scheme`，在 hydration 前给 `<html>` 加 `dark` class；`<html>` 加 `suppressHydrationWarning`
- 新增 `components/theme-toggle.tsx`（客户端组件）：Sun/Moon 图标切换，写入 `localStorage('theme')`；初始图标在 `useEffect` 中确定，避免 hydration mismatch
- 与根 `proxy.ts` 的 session 刷新逻辑无冲突（主题纯客户端）

### 2.3 字体

- `app/layout.tsx`：**Manrope → Inter**（next/font/google），对齐 shadcn/ShipAny 默认

## 3. 新增文件

| 文件 | 说明 |
|---|---|
| `components/theme-toggle.tsx` | 明/暗主题切换按钮（见 2.2） |
| `components/ui/accordion.tsx` | shadcn Accordion（FAQ 用），使用仓库现有的 `radix-ui` 统一包导入风格 |
| `components/ui/badge.tsx` | shadcn Badge（hero/pricing 胶囊徽章用） |
| `app/(dashboard)/header.tsx` | 新 Header（从 layout.tsx 抽出，含 UserMenu、MobileMenu、Logo） |
| `app/(dashboard)/footer.tsx` | 新 Footer（服务端组件） |
| `docs/ui-shipany-overhaul.md` | 本文档 |

## 4. 页面级改动

### 4.1 Header（`app/(dashboard)/header.tsx` + `layout.tsx`）

- **改造前**：白底 `border-gray-200`，左侧橙色 `CircleIcon` + "ACME"，右侧仅 Pricing 链接 + Sign Up 按钮；无移动端菜单
- **改造后**：
  - `sticky top-0` + `bg-background/80` + `backdrop-blur-md`（ShipAny 式毛玻璃吸顶）
  - Logo：`bg-brand-gradient` 圆角方块 + 白色 Zap 图标
  - 桌面导航：Features / Pricing / FAQ，每项带 lucide 小图标（ShipAny header nav 特征），锚点指向 `/#features`、`/#faq`
  - 右侧：ThemeToggle + 未登录时 `Sign in`（ghost）+ `Get Started`（品牌色 rounded-full）；登录后保留原头像 DropdownMenu（逻辑未动，fallback 换成 `bg-brand/10 text-brand`）
  - 移动端：全屏 Menu/X 抽屉
- `app/(dashboard)/layout.tsx` 精简为 `Header + main + Footer` 组合

### 4.2 Footer（`app/(dashboard)/footer.tsx`）

- 改造前**无 footer**；新增 ShipAny 式多列布局：
  - 品牌列（Logo + 简介 + GitHub/X 社交图标按钮）
  - Product / Resources / Legal 三个链接列
  - 底部版权栏 + "Built with Next.js, Stripe & Drizzle"（品牌色高亮）

### 4.3 落地页（`app/(dashboard)/page.tsx`，完全重建）

- **改造前**：左文右 Terminal 的 hero + 3 列技术栈卡片 + 灰底 CTA 条，共 3 个分区
- **改造后**：按 ShipAny 分区顺序共 8 个分区（均为静态数据、服务端组件，Accordion 为客户端子组件）：
  1. **Hero**：顶部品牌色光晕（blur-3xl 渐变）、居中 Badge 胶囊（"Ship Your SaaS in One Hour"）、`text-gradient` 渐变大标题、双 CTA（Get Started Free → `/sign-up`；View on GitHub）、下方保留 **Terminal 组件**作为产品视觉
  2. **Logo 墙**：技术栈名称 + 图标（Next.js/Stripe/Postgres/Drizzle/Tailwind/shadcn），muted 色 hover 变亮
  3. **Features**（`id="features"`）：6 张编号卡片（01–06），内容对应本项目真实能力（Auth/Stripe/Teams/Drizzle/Activity Logging/UI），图标块 hover 反色为品牌色
  4. **Stats**：4 个渐变数字（10x / 100% / 6+ / 0），`bg-muted/40` 分隔带
  5. **Testimonials**：3 张引言卡 + 首字母头像（虚构文案，上线前需替换）
  6. **FAQ**（`id="faq"`）：Accordion 手风琴，5 个问答（内容基于本仓库 README 真实信息）
  7. **CTA**：渐变背景圆角横幅 + 顶部品牌色光斑 + 双按钮
  8. Footer（见 4.2）

### 4.4 Terminal（`app/(dashboard)/terminal.tsx`，仅样式）

- `bg-gray-900 rounded-lg shadow-lg` → `bg-zinc-950 rounded-xl border-white/10 shadow-2xl shadow-brand/10`
- 复制按钮 `text-gray-400` → `text-zinc-500`；动画/剪贴板逻辑未动
- 终端在明暗两种模式下均保持深色（符合 ShipAny hero 视觉习惯）

### 4.5 Pricing（`app/(dashboard)/pricing/page.tsx` + `submit-button.tsx`）

- **改造前**：无标题的两列裸卡片，橙色 Check，outline 圆角按钮
- **改造后**：
  - 新增居中标题区：Badge 胶囊 + "Simple, transparent **pricing**"（渐变词）+ 副文案（自动读取 trial 天数）
  - 卡片：`bg-card rounded-2xl border p-8`；**Plus 套餐高亮** —— `border-brand/60` + `shadow-brand/10` + 顶部 "Most Popular" 渐变徽章
  - 价格放大为 `text-5xl font-extrabold`，Check 图标改为品牌色圆形底
  - `SubmitButton` 新增 `highlighted` prop：高亮卡用品牌色实心按钮，普通卡保持 outline
  - **业务逻辑零改动**：仍从 Stripe 实时拉取 `getStripePrices()/getStripeProducts()`，Base/Plus 匹配与 fallback 价格、`checkoutAction` 表单、`revalidate = 3600` 全部保留
  - 底部新增一行说明文案

### 4.6 登录/注册（`app/(login)/login.tsx`，仅样式重构）

- **改造前**：`bg-gray-50` 全屏 + 橙色 CircleIcon + 硬编码 orange 按钮/输入框样式
- **改造后**：顶部品牌光晕 + 渐变 Logo + 标题副文案 + **`bg-card rounded-2xl border` 卡片**包裹表单；输入框/按钮全部走 token（`text-destructive` 错误提示、品牌色 rounded-full 主按钮、outline 切换链接改用 `<Button asChild>`）
- **逻辑零改动**：`useActionState`、`redirect/priceId/inviteId` 隐藏域、signIn/signUp action、模式切换链接的 query 拼接全部保留
- `sign-in/page.tsx`、`sign-up/page.tsx` 薄包装未动

### 4.7 Dashboard（token 化批量替换）

涉及文件：`dashboard/layout.tsx`、`dashboard/page.tsx`、`general/page.tsx`、`security/page.tsx`、`activity/page.tsx`、`activity/loading.tsx`

机械替换映射（逻辑未动）：

| 旧类 | 新类 |
|---|---|
| `text-gray-900` | `text-foreground` |
| `text-gray-500` / `text-gray-700` | `text-muted-foreground` |
| `bg-gray-200`（骨架屏） | `bg-muted` |
| `bg-gray-50` / `bg-white`（侧边栏、移动头部） | `bg-muted/40` / `bg-card` |
| `border-gray-200` | `border-border` |
| `bg-orange-500 hover:bg-orange-600 text-white` | `bg-brand hover:bg-brand/90 text-white` |
| `bg-orange-100` / `text-orange-600`（活动图标） | `bg-brand/10` / `text-brand` |
| `text-red-500` | `text-destructive` |

- 侧边栏激活态 `bg-gray-100` → `bg-secondary`

### 4.8 404（`app/not-found.tsx`）

- 橙色 CircleIcon → 渐变 Logo 方块；文案 token 化；返回按钮改用 `<Button asChild variant="outline">` + ArrowLeft 图标

### 4.9 根布局（`app/layout.tsx`）

- metadata 升级：`title.template`（子页标题后缀 " | ACME"）+ ShipAny 式 description
- `<html>` 移除硬编码 `bg-white dark:bg-gray-950` 等类，交给 body 的 `bg-background text-foreground` token

## 5. 未改动（明确声明）

- 所有 Server Actions、鉴权（`lib/auth/*`）、Stripe（`lib/payments/*`）、数据库层（`lib/db/*`）、API 路由、`proxy.ts`
- SWR 数据流（`/api/user`、`/api/team` fallback 机制）
- 未新增任何 npm 依赖（Accordion/Badge 复用已有的 `radix-ui` 统一包与 `class-variance-authority`）

## 6. 验证结果

- ✅ `pnpm build` 通过，15 个路由全部正常生成（PPR 模式）
- ✅ dev server 下 `/`、`/pricing`、`/sign-in`、`/sign-up` 均返回 200
- ✅ 渲染 HTML 中确认包含新分区关键元素（`text-gradient`、hero badge、FAQ 标题、CTA、"Most Popular" 徽章、`bg-brand-gradient`）
- ✅ `grep` 确认 `app/`、`components/` 下已无残留 `gray-*` / `orange-*` 硬编码色
- ⚠️ 已知无害警告：turbopack workspace root 推断警告（由 home 目录残留 lockfile 引起；后续已在 `next.config.ts` 中通过 `turbopack.root` 固定，警告消除）

## 7. 后续可微调项

1. **精确像素比对**：待可访问 shipany.ai 后，比对品牌色 hue（当前 violet 293°）、圆角（当前 `--radius: 0.625rem`）、区块间距（当前 `py-24`）
2. **Testimonials 文案为虚构占位**，上线前需替换或删除
3. 可选增强（ShipAny 有而本项目暂无）：落地页内容 JSON 配置化（`landing.json` 模式）、月付/年付切换、framer-motion 滚动入场动画
   - ~~多语言切换（locale switcher）~~ ✅ 已实现，见 [docs/i18n.md](i18n.md)
4. `text-green-500` 成功提示未 token 化（暗色模式下可读性尚可），如需统一可引入 `--success` token
