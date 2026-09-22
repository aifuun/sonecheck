# sonecheck - 路线图与合规

> **文档流向纪律**：本文档**汇总引用** upstream `00`~`04`（及 `06`），是规划层文档；**不反向引用任何版本文档**（版本文档引用本文）。
> **占位符约定**：`{{FIELD}}` = 结构化命名字段；`<!-- TODO: [dm-init-docs] <说明> -->` = 待补充内容。
> **权威引用**：版本体系（四层结构 / 版本粒度 / Step 施工流）见 `dev-meta/docs/02-version-rules.md`；分支 / commit / PR 规则见 `dev-meta/docs/03-git-flow-rules.md`。本文只做项目级规划，不重定义。

---

## 1. Milestone 阶段规划

| 阶段 | 目标 | 范围 | 完成判据 | 状态 |
|------|------|------|----------|------|
| M0 名称阵地 | 抢占免费标识，避免后期改名 | npm `sonecheck` 占位包（见 `01` §4）；GitHub 仓库 `sonecheck`（已 Public） | `npm view sonecheck` 可查到占位包 | ✅ |
| M1 本地 MVP | 单机跑通「抓 diff → 判定 → 跳转」 | `02` §3 主链路（步骤 1–9），BYOK，无 UI 美化 | 真机一次 ≥10 块改动 1s 内出清单并成功跳转 | ⬜ |
| M2 可分发 | 让外部用户能装上 | `vsce package` → `.vsix`；GitHub Release；README 安装说明；必要时 Marketplace | 干净 VS Code 上 `Install from VSIX` 跑通（US-01–US-04） | ⬜ |
| M3 可信度 | 降低误报，提升判定质量 | 上下文增强（作用域行数 / LSP 元数据）、阈值可调、误报反馈收集 | 抽样 50 次提交，误报率 ≤ <!-- TODO: [dm-init-docs] 目标值 --> | ⬜ |
| M4 团队化 | 支撑收费模式 | 托管 Proxy（免配 Key）、团队规则中心、审计日志（US-05） | 团队规则可下发且留痕 | ⬜ |

---

## 2. 版本切分 (Epoch Plan)

> 版本群（Epoch）划分与编号规则；每个版本启动走 `dm-plan-ver` 生成四件套（`200-spec` / `300-design` / `400-build` / `500-schedule`）。
> 规划动作由 `dm-plan-roadmap` 执行。

| Epoch | 版本 | 目标 | 依赖 | 粒度校验 | 状态 |
|-------|------|------|------|----------|------|
| A（单点验证） | `v0.1.0` | MVP 主线：抓暂存区 diff → 切块 → Jev 判定 → Top-K 清单 → 跳转 | M0 完成 + 拆包 | 预估 S4/S5 各一次；一句话可描述「提交前挑出最该看的几块」 | ⬜ |
| A（单点验证） | `v0.2.0` | 判定质量：上下文增强 + LSP 元数据 + 阈值配置 | `v0.1.0` 真机可用 | 预估 S4/S5 各一次；一句话「让判定更准、可调」 | ⬜ |
| B（团队化） | `v1.0.0` | 托管服务 + 团队规则 + 审计 | Epoch A 实测结论 | <!-- TODO: [dm-init-docs] 待 M3 实测后切分 --> | ⬜ |

- **版本编号规则**（唯一权威）：`dev-meta/docs/02-version-rules.md` §3.3 —— `v` 轴（feature）/ `r` 轴（refactor）双轨；Epoch 分配号段、群内连续、**群间留白 10 号**。
- **版本粒度红线**（唯一权威）：同上 §3.2 —— 一个版本只承载**单一核心业务场景**；判据与「实证失败须退回重切」见该节。
- **粒度校验分两次**：切版本时为**预估**（人工确认，填入上表「粒度校验」列）；`400-build` 完成后由 `dm-plan-ver` **实证**（S4 / S5 计数），失败须退回本文重切。
- **与 dm-plan-ver 的衔接**：本文定义「有哪些版本、先后顺序」；**每个版本的具体范围、验收、执行步骤由 `dm-plan-ver` 生成的四件套承载**，不在本文重复。
- **npm 包与扩展共用 `package.json`**：两者只有一个 `version` 与一个 `main` 字段，**拆包前版本强制同源**。因此 npm 占位包**停在 `0.0.x` 系列并就此冻结**，不再随扩展演进；M1 动工前须先拆包（npm 包下沉至 `packages/sonecheck/`），扩展版本自 `v0.1.0` 起编。

---

## 3. 合规与安全

| 项 | 要求 | 落点 | 状态 |
|----|------|------|------|
| 数据隐私 | 仅上传 diff hunk + 限长上下文（单块 ≤ 2KB），**不上传完整源文件**；README 与插件描述须明示该边界 | `03` §1 `INV-02`、`README.md` | ⬜ |
| 数据存储与传输 | API Key 仅存 OS 级 SecretStorage；所有出站请求走 HTTPS；不落地明文 | `03` §3 | ⬜ |
| 第三方 SDK / 服务 | Jev Decision API（TypeSafe AI）为唯一第三方依赖；须在 README 声明其数据处理边界 | `01` §1、`README.md` | ⬜ |
| 开源许可 | MIT（仓库根 `LICENSE`）；不得引入与 MIT 不兼容的依赖 | 仓库根 `LICENSE` | ⬜ |
| 商标与命名 | 产品名不绑定 Jev 官方商标（避免混淆风险）；`sonecheck` 为独立词 | 本文 §4 | ⬜ |
| 审计与日志 | 检查动作、降级原因、判定耗时须留痕；日志禁含 Key 与源码明文 | `06_OBSERVABILITY.md` | ⬜ |
| 强制拦截合规 | v0.1.0 不做强制拦截，避免误报导致用户绕过工具（`--no-verify` 式排斥） | `00` §5 | ⬜ |

---

## 4. 风险与依赖

| 风险 / 依赖 | 影响 | 应对 | 责任方 |
|-------------|------|------|--------|
| Jev 误报率过高 | 用户直接卸载（最高风险） | 默认 Top-K + 静默低风险；阈值可调；不强制拦截；提供「误报反馈」入口 | 项目作者 |
| 决策服务接入参数（endpoint / 鉴权方式）待确认 | M1 无法开工 | 先用 mock 判定器（本地规则）跑通链路，接口层隔离；接入参数确定后只替换 `infra/jevClient` 的实现 | 项目作者 |
| VS Code Marketplace Publisher 审核延迟 | 无法当天上架 | 降级为 GitHub Release + `.vsix` 手动安装（`01` §4） | 项目作者 |
| 上传代码片段的隐私质疑 | 企业用户拒用 | 明确 payload 边界与本地只读保证（`INV-02` / `INV-05`）；开源可审计 | 项目作者 |
| 命名与他人类似番号前缀的联想 | 品牌观感（无法律风险） | 以「System-1 + Check」技术含义为唯一对外解释 | 项目作者 |
| 依赖 VS Code API 版本演进 | 兼容性断裂 | 在 `package.json` 声明 `engines.vscode` 最低版本；CI 广度测试 | 项目作者 |

---

## 5. 引用声明

| 引用对象 | 方向 | 用途 |
|----------|------|------|
| `00_PRODUCT_REQUIREMENTS.md` | upstream | 用户故事与验收 |
| `01_TECHNICAL_SPEC.md` | upstream | 部署与测试约束 |
| `02_SYSTEM_DESIGN.md` | upstream | 架构边界 |
| `03_CONTRACTS_AND_API.md` | upstream | 契约范围 |
| `04_UI_UX_DESIGN.md`（如有） | upstream | 界面范围 |
| `06_OBSERVABILITY.md` | upstream | 审计留痕要求 |
| `dev-meta/docs/02-version-rules.md` | 外部权威 | 版本规则（只引用） |
| `dev-meta/docs/03-git-flow-rules.md` | 外部权威 | Git 流程（只引用） |
