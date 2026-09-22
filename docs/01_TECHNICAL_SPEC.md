# sonecheck - 技术规格

> **文档流向纪律**：本文档继承引用 upstream `00_PRODUCT_REQUIREMENTS.md`，并被 `02`、`03`、`05`、`06` 引用；**不反向引用下游**。
> **占位符约定**：`{{FIELD}}` = 结构化命名字段；`<!-- TODO: [dm-init-docs] <说明> -->` = 待补充内容。
> **权威引用**：测试职责分层见 `dev-meta/docs/06-contract-based-dev.md` §10（唯一权威），本文只做项目落地，不重定义。

---

## 1. 技术选型

| 层面 | 选型 | 版本 | 选型理由 / 决策记录 |
|------|------|------|---------------------|
| 语言 / 运行时 | TypeScript + Node.js | Node 22.x（VS Code 内置运行时） | 与 VS Code Extension API 同源，零额外分发成本 |
| 框架 | VS Code Extension API（无 Webview 框架） | VS Code 稳定版 | 原生 QuickPick / 状态栏足以覆盖 v0.1.0 交互，避免 Webview 调试开销 |
| 存储 | VS Code `SecretStorage`（Key）+ `workspace.getConfiguration`（阈值、开关） | — | Key 不落盘明文；配置跟随用户设置同步 |
| 第三方服务 | Jev Decision API（TypeSafe AI） | <!-- TODO: [dm-init-docs] API 版本与 endpoint --> | System-1 结构化判定，输出免费、延迟量级为亚秒级；是本产品的成本与速度前提，实际延迟须经 M1 实测回填 |
| 构建 / 打包 | `@vscode/vsce` → `.vsix` | <!-- TODO --> | 官方打包链，支持 GitHub Release 与 Marketplace 双通道 |
| 测试框架 | <!-- TODO: [dm-init-docs] vitest / mocha + @vscode/test-electron --> | <!-- TODO --> | 需同时覆盖纯逻辑单测与扩展宿主集成测试 |

> 架构级技术选型须经 `dm-adr` 记录决策（ADR），本文只登记结论与指向。

---

## 2. 边界约束

| 约束类型 | 内容 | 来源 |
|----------|------|------|
| 平台 / 环境 | 目标平台 VS Code 稳定版（最低版本待定）；宿主为扩展宿主进程（Extension Host）；必须在 macOS / Windows / Linux 三端可用 | 00 §3 兼容性 |
| 资源上限 | 单次检查端到端 p95 ≤ 1s；单块判定 ≤ 500ms；上传 payload 单块 ≤ 2KB；检查期间不得阻塞 UI 线程 | 00 §3 性能 |
| 依赖限制 | 禁止上传全量源文件；禁止在日志 / 遥测中出现 API Key 与源码明文；禁止以任何形式修改用户工作区文件（只读） | 00 §3 安全、契约 INV-02 / INV-03 / INV-05 |
| 网络 | 无网络 / Jev 不可用时必须降级放行，不阻断提交 | 00 §3 可用性 |
| 隐私 | v0.1.0 采用 BYOK（用户自备 Jev API Key），不引入服务端中转 | 00 §5 非目标 |

---

## 3. 测试策略

> **只做项目落地，不重定义分层**：测试职责分层的唯一权威是 `dev-meta/docs/06-contract-based-dev.md` §10（design=场景 / build=行为契约 / dm-dev-step=落地，互不重定义）。

| 测试层 | 覆盖范围 | 运行方式 | 门禁要求 |
|--------|----------|----------|----------|
| 单元 / 断言（T1） | diff 切块、上下文组装、阈值过滤、Top-K 排序、错误码映射 | <!-- TODO: 命令，如 npm run test:unit --> | 全绿方可交付 |
| 契约 / 集成（T2） | Jev 请求 / 响应 schema、降级路径、SecretStorage 读写 | <!-- TODO: 命令，如 npm run test:integration（含 mock server） --> | 全绿方可交付 |
| 端到端 / 真机（T3） | 「触发命令 → 清单弹出 → 点击跳转」完整链路；断网降级 | 手动安装 `.vsix` 真机验证 | 核心路径零走查 |

> ⚠️ **编号约定**：`L1 / L2 / L3` 专属于**契约层级**（接口 / Feature / 行为，见 `dev-meta/docs/06`）。
> 测试层级此处用 `T1 / T2 / T3`，避免同号不同义。

- **AI 生成测试的硬约束**：须断言具体边界值（空输入 / 极值 / 越界），禁止无断言的假 Green（见 `dev-meta/docs/06` §5 失败面契约）。
- **不写 TDD 的范围**：QuickPick / 状态栏等原生 UI 呈现层（VS Code 原生控件、无逻辑分支），以 T3 真机验证替代；原因：组件无法在纯 Node 环境复现。

---

## 4. 部署基线

| 项 | 内容 |
|----|------|
| 目标环境 | 开发者本机 VS Code（开发态：Extension Development Host） |
| 构建命令 | `npm run compile`（tsc）+ `npx @vscode/vsce package` |
| 发布方式 | 双通道：① GitHub Release 附带 `.vsix`；② VS Code Marketplace 发布（Publisher ID 待注册） |
| 回滚方式 | Marketplace 侧发布新版本覆盖；GitHub 侧删除 Release 资产或回退 tag |
| 配置与密钥 | Jev API Key 经 VS Code SecretStorage 存储；阈值 / 开关经 `workspace.getConfiguration("sonecheck")`；仓库内**禁止**出现任何真实 Key |
| npm 占位包 | `sonecheck` 占位包已发布（`publishConfig.access: public`）；**与扩展共用同一 `package.json`**，故版本号与扩展同源，拆包前不得为扩展单独发版（详见 `05` §2） |

---

## 5. 引用声明

| 引用对象 | 方向 | 用途 |
|----------|------|------|
| `00_PRODUCT_REQUIREMENTS.md` | upstream | 业务意图来源 |
| `dev-meta/docs/06-contract-based-dev.md` §10 | 外部权威 | 测试职责分层（只引用） |
| `02_SYSTEM_DESIGN.md` | downstream | 架构落地 |
| `03_CONTRACTS_AND_API.md` | downstream | 契约定义 |
| `06_OBSERVABILITY.md` | downstream | 可观测性实例化 |
