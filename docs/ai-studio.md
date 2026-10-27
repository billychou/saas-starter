# AI Studio（类 liblib.art 图片生成 SaaS）

> 日期：2026-10-24
> 范围：新增 AI 图片生成产品线（模型接入、积分计费、生成工作台、团队画廊、管理后台）
> 图片生成提供方：**阿里云百炼（DashScope）异步文生图 API**，支持平台内配置多个模型

## 1. 功能总览

| 功能 | 路由 | 说明 |
|---|---|---|
| Studio 生成工作台 | `/studio` | liblib 式左右布局：左侧参数面板（模型/提示词/负向提示词/尺寸/张数/积分预览），右侧生成流（4s 轮询、骨架屏、下载/删除/再次生成） |
| 团队共享画廊 | `/gallery` | 瀑布流展示团队全部成功作品，「全部 / 我的」切换，悬浮层显示作者·模型·时间，支持下载 / 再创作（带参数跳回 Studio）/ 删除（本人或团队 Owner） |
| 模型管理后台 | `/admin/models` | 仅 `ADMIN_EMAILS` 中的平台管理员可访问；模型 CRUD（名称 / provider / modelId / 专属 API Key / API 地址 / 尺寸 / 积分单价 / 最大张数 / 启用 / 默认 / 排序 / 描述） |
| 积分体系 | — | 按「积分/张 × 张数」扣费；失败自动退还；Stripe 一次性积分包购买；注册赠送积分 |
| 活动日志 | `/dashboard/activity` | 新增 `IMAGE_GENERATED` 事件类型（提交生成时记录） |

## 2. 数据模型（`lib/db/schema.ts`，迁移 `0001_smooth_phalanx.sql`）

```
teams.creditBalance        # 团队积分余额（integer，默认 0）

ai_models                  # 平台可配置的模型列表
  name / provider(默认 bailian) / modelId
  apiKey(可空=用环境变量) / apiBase(可空=用默认端点)
  sizes json[] / maxImages / creditCost / enabled / isDefault
  description / sortOrder

generations                # 一次生成任务（模型名称/ID 做了快照，删模型不丢历史）
  teamId / userId / aiModelId(可空 FK)
  modelName / modelId / prompt / negativePrompt / size / imageCount
  status: pending|running|succeeded|failed
  taskRef(DashScope task_id) / creditsUsed / error

generation_images          # 成功产物；onDelete cascade
  generationId / url(远端，~24h 过期) / localPath(OSS 完整 URL，或旧数据的 /generated/*.png)

credit_transactions        # 积分流水账本（只增不改）
  teamId / userId / amount(带符号) / generationId(可空)
  reason: generation|purchase|signup_bonus|refund|admin_adjust
  stripeSessionId(购买幂等键)
```

## 3. 服务层（`lib/ai/`）

| 文件 | 职责 |
|---|---|
| `bailian.ts` | DashScope 客户端，按模型 id 双协议分发（均为 `X-DashScope-Async: enable` → 轮询 GET `/api/v1/tasks/{id}`）：① 旧版文生图 V2（wan2.5 及以下）POST `/api/v1/services/aigc/text2image/image-synthesis`，`input.prompt` 体，结果在 `output.results[].url`；② wan2.7 系（`/^wan2\.7\b/`）POST `/api/v1/services/aigc/image-generation/generation`，`input.messages[].content[{text}]` 体（**无 negative_prompt**），结果在 `output.choices[].message.content[].image`。Token Plan 专属 Key（`sk-sp-`）必须配专属域名（如 `https://token-plan.cn-beijing.maas.aliyuncs.com`，apiBase 填**根域名**、不带 `/compatible-mode/v1`），且 size 仅接受 `width*height` 像素格式。凭据优先级：**模型专属 apiKey/apiBase → 环境变量** |
| `credits.ts` | `deductCredits`/`addCredits`：事务 + `SELECT ... FOR UPDATE` 行锁，杜绝并发超扣；余额不足抛 `InsufficientCreditsError`。含 `CREDIT_PACKS`（$9/500、$24/1500、$69/5000）、`SIGNUP_BONUS_CREDITS`（env 可覆盖，默认 100） |
| `generations.ts` | 编排层：`createGeneration`（校验→插入→扣分→提交任务；提交失败即退款+标记 failed）、`syncGeneration`（轮询任务；成功则**经 `storage.ts` 持久化图片**——远端 URL 约 24h 过期；失败则退还积分）、`listTeamGenerations`、`deleteGeneration`（删 OSS 对象或本地文件；先把流水的 generationId 置空保账本，再级联删图） |
| `storage.ts` | 图片存储适配层：`storeImage`（下载远端图 → 配置了 OSS 则上传并返回完整公共 URL，否则落盘 `public/generated/` 返回相对路径）、`deleteStoredImage`（按 `localPath` 值分支：http 开头删 OSS 对象、否则删本地文件；尽力而为不抛错）、`isOssConfigured`。详见 §8 |
| `lib/auth/admin.ts` | `isAdminUser`：邮箱 ∈ `ADMIN_EMAILS`（逗号分隔） |

## 4. API 路由

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/ai/generate` | POST | zod 校验 → `createGeneration`；402=积分不足、400=参数/校验错误、502=提供方错误（已自动退款） |
| `/api/ai/generations` | GET | `?scope=mine\|all&limit&offset`；返回前先把本团队所有 pending/running 任务同步一遍（服务端轮询，前端只需刷新列表） |
| `/api/ai/generations/[id]` | GET/DELETE | 单条同步查询；删除限本人或团队 Owner |
| `/api/ai/models` | GET | 启用中的模型（**不含 apiKey**）+ `creditBalance` + `creditPacks` |
| `/api/user` | GET | 响应新增 `isAdmin` 字段（Header 显示管理入口用） |

均通过 `getUser()`/`getTeamForUser()` 自行鉴权（middleware matcher 不覆盖 `/api/*`）；页面路由 `/studio` `/gallery` `/admin` 已加入 `middleware.ts` 的 `protectedRoutes`。

## 5. Stripe 积分包

- `lib/payments/stripe.ts` 新增：
  - `createCreditPackCheckoutSession`：`mode: 'payment'` + `price_data` 一次性商品，`metadata: { type:'credit_pack', pack_id, credits, team_id }`，成功回跳 `/studio?credits=success`
  - `handleCreditPackCheckout`：webhook 处理器，`payment_status === 'paid'` 且 `stripeSessionId` 未入账时才加积分（**幂等**）
- `lib/payments/actions.ts` 新增 `creditPackCheckoutAction`（withTeam 包装）
- `app/api/stripe/webhook/route.ts` 新增 `checkout.session.completed` 分支
- 本地联调：`stripe listen --forward-to localhost:3000/api/stripe/webhook`（README 已有）

## 6. 前端

- 新增 shadcn 组件：`select` `textarea` `dialog` `skeleton` `checkbox`（沿用仓库 `radix-ui` 统一包导入风格，未新增依赖）
- `components/ai/`：`generation-card.tsx`（Studio 生成流卡片：状态徽章/骨架屏/图片网格/下载/删除/再次生成）、`buy-credits-dialog.tsx`（积分包购买弹窗）、`types.ts`（客户端共享类型）
- Studio：服务端组件取数（模型+余额）→ `StudioClient`；SWR `refreshInterval` 仅在存在未完成任务时为 4s；支持 `/studio?prompt=&model=&size=&count=&negative=` URL 预填（画廊「再创作」入口）
- 画廊：CSS `columns-*` 瀑布流 + hover 渐变遮罩；删除权限=本人或团队 Owner
- Header：登录后导航追加 Studio / Gallery；头像菜单追加 Dashboard / Studio / Gallery，管理员额外显示 Admin（`/admin/models`）
- 全部文案走 next-intl：新增 `Studio` / `Credits` / `Gallery` / `Admin` 命名空间，`Activity.actions.IMAGE_GENERATED`，`Header.studio/gallery/admin`；样式全部使用品牌 token（`bg-brand`、`bg-card rounded-2xl border` 等）

## 7. 环境变量

```bash
DASHSCOPE_API_KEY=sk-xxx            # 必填：百炼 API Key（bailian.console.aliyun.com）
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com   # 可选，国际站用 dashscope-intl.aliyuncs.com
ADMIN_EMAILS=you@example.com,admin2@example.com     # 平台管理员邮箱（逗号分隔）
SIGNUP_BONUS_CREDITS=100            # 可选：新团队注册赠送积分（默认 100）
OSS_REGION=oss-cn-hangzhou          # 可选：OSS 图片存储（四项全配才启用，全不配回退本地）
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=LTAI***
OSS_ACCESS_KEY_SECRET=***
OSS_PUBLIC_BASE_URL=https://cdn.example.com         # 可选：自定义/CDN 域名（默认 https://{bucket}.{region}.aliyuncs.com）
```

## 8. 图片存储（`lib/ai/storage.ts`）

- 生成成功后立即把远端 URL（~24h 过期）下载为 Buffer 并持久化，前端优先使用 `localPath`，`url` 仅作兜底。两种模式：
  - **OSS 模式**（`OSS_REGION`/`OSS_BUCKET`/`OSS_ACCESS_KEY_ID`/`OSS_ACCESS_KEY_SECRET` 四项全配）：上传到 key `ai-studio/generated/{generationId}/{uuid}.{ext}`，`localPath` 存完整公共 URL（默认 `https://{bucket}.{region}.aliyuncs.com/{key}`，可用 `OSS_PUBLIC_BASE_URL` 覆盖为 CDN 域名）。bucket 需 **public-read**；UUID 文件名是不可枚举的安全边界。建议 RAM 子账号权限收窄到 `oss:PutObject`/`oss:DeleteObject` on `{bucket}/ai-studio/generated/*`
  - **本地回退**（四项全不配，适合本地开发）：写 `public/generated/gen-{id}-{i}.{ext}`，`localPath` 存 `/generated/...` 相对路径；`/public/generated` 已加入 `.gitignore`。**只配一部分会抛错**（防止生产环境静默回退导致图片 24h 后失效）
- OSS 客户端为懒加载单例（首次调用才初始化）；`ali-oss` 已加入 `next.config.ts` 的 `serverExternalPackages`
- 删除 generation 时 `deleteStoredImage` 按 `localPath` 值分支：`http` 开头 → 校验 origin 与配置域名一致后删 OSS 对象；否则删本地文件（兼容旧数据）。均尽力而为、不阻断 DB 清理
- 旧数据不迁移：历史 `/generated/...` 行与 OSS URL 行并存，客户端 `localPath ?? url` 渲染天然兼容（全站为原生 `<img>`，无 `next/image`，OSS 绝对 URL 零配置可显示）
- 注意：sync 发生在请求处理内（`GET /api/ai/generations`），OSS 上传会增加该请求耗时（与原本地写盘同量级，大头仍是下载远端图）

## 9. 验证记录

- ✅ `pnpm build` 通过，20 条路由（新增 `/studio` `/gallery` `/admin/models` + 4 条 `/api/ai/*`）
- ✅ `pnpm db:migrate` 应用迁移；开发库已注入 3 个默认百炼模型（wanx2.1-t2i-turbo/plus、flux-schnell）
- ✅ 未登录访问 `/studio` → 307 `/sign-in`（middleware 保护生效）
- ✅ `/studio` `/gallery` `/admin/models` 中英文渲染抽查通过（`NEXT_LOCALE=zh`）
- ✅ 端到端失败路径：未配置 API Key 时 POST `/api/ai/generate` → 扣 1 分 → 提交失败 → 自动退款 → 余额还原，记录标记 failed 并带错误信息
- ✅ DELETE `/api/ai/generations/[id]`：保留积分流水（generationId 置空）、删除本地图片文件、级联删 images 行
- ⚠️ 未验证真实出图（需要有效 `DASHSCOPE_API_KEY`）；配置 Key 后建议在 Studio 用 Turbo 模型（1 积分）实测一次

## 10. 后续可增强

1. 图生图 / 参数模板（liblib 的「同款」社区生态）
2. 生成队列持久化（当前轮询发生在请求内；高并发可改为后台任务 + Webhook 回调 `X-DashScope-Async` 任务完成事件）
3. 积分流水页面（当前流水只入库未展示）；`admin_adjust` 预留了管理员调账
4. 模型管理支持更多 provider（当前 `provider` 字段已预留，bailian 之外的接入需在 `lib/ai/` 增加对应 client）
5. ~~对象存储适配器~~ ✅ 已完成（阿里云 OSS，见 §8）；如需 S3/R2 可在 `lib/ai/storage.ts` 同一接缝扩展
