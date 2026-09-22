# v0.1.0 特性规格 — local-mvp

> 结构唯一权威：`dev-meta/docs/02-version-rules.md` §4。
> ⚠️ 本文件不得出现 `Transaction Flow` / `TF` / `Step` 章节（施工拆分属 `400-build.md`）。

把「提交前挑出最该人工复核的 1–3 块改动」这条链路在本地跑通：抓取暂存区 diff → 切块 → 判定打分 → 按阈值筛出高风险项 → QuickPick 列出 → 点击跳转到对应代码行。

**本版本不包含**：真实判定服务的 HTTP 接入与鉴权、网络失败降级路径、运行期结构化日志、`setApiKey` 命令、`local_metadata` 三字段、`CONFIG_CHANGE` 与 `HIGH_FANOUT` 两项 `reason_code`——以上均归 `v0.1.1`。

---

## 1. 架构锚点（本版本触及的架构面）

| 维度 | 本版本触及 | 硬约束 / 红线 |
|---|---|---|
| 分层 | 三层全部落地：`src/ui` / `src/core` / `src/infra`，新增 `src/extension.ts` 作为装配入口 | 严格单向 `UI → Core → Infra`；下层不得反向 import 上层；跨层只经 Facade |
| 模块 | 新建跨层常量 `src/constants.ts`（判定阈值、payload 上限、构建期日志开关的唯一集中处）与 `infra/`（`git`、`diffParser`、`jevClient`、`configSource`）与 `core/`（`riskEngine`、`threshold`、`config`、`contextBuilder`）与 `ui/`（`commands`、`riskList`、`status`）；`infra/secrets` 与 `infra/logger` 留待 `v0.1.1` | 每模块仅经 Facade 暴露；`core` 不得引用 `vscode` 做 IO——配置读取一律归 `infra/configSource`；判定阈值 / payload 上限等字面量一律取自 `constants.ts`（`INV-07`） |
| 门面 | `src/core/index.ts`、`src/infra/index.ts` 两个 Facade 入口 | 层间调用只经 Facade，内部实现全部私有 |
| 契约 | `INV-01` / `INV-02` / `INV-05` / `INV-06` / `INV-07` → `[CURRENT]`；`API-01`（mock 实现，**只兑现签名与本地派生字段**，失败面 `ERR-01`~`ERR-05` 归 `v0.1.1`）与 `API-02` → `[CURRENT]`；`CFG-01` 部分兑现（`riskThreshold` / `maxItems` / `enabled` / `sensitivePathPatterns`）；`ERR-06` / `ERR-07` / `ERR-09` 落地。**是否阻塞编码：否**（本版不改契约语义，只推进状态） | 契约 ID 与 `03_CONTRACTS_AND_API.md` 完全一致；翻牌集合与 `05` §2.1 交付成果 #13 一致；不新增未登记的命令或配置项 |
| API | 新增 VS Code 命令 `sonecheck.inspectDiff`（`API-02`）；`API-01` Response 的 `reason_code` 只兑现 5 项枚举 | 命令 ID 与契约逐字一致；`sonecheck.showStatus` 占位命令移除 |

### 1.1 明确不做（技术 / 范围）

| 项 | 类型 | 理由 / 归属 |
|---|---|---|
| 真实 HTTP 客户端（超时 / 重试 / 鉴权） | 范围 | `v0.1.1`——本版按 ADR-002 用与真实客户端**同签名**的本地 mock 跑通链路（不发网络、不涉及 API Key） |
| 降级路径（网络失败 / 超时 / 配额 / schema 不合规） | 范围 | `v0.1.1`——mock 判定器是本地纯函数，不产生网络失败 |
| 运行期结构化日志（`observe` / `inspectionId` / 7 个埋点） | 范围 | `v0.1.1` |
| `API-03 sonecheck.setApiKey` 命令 | 范围 | `v0.1.1`——本版无真实 Key 需求 |
| `local_metadata` 三字段 | 范围 | `v0.1.1`——本版 `touches_sensitive_path` 改由文件路径直接判定 |
| `CONFIG_CHANGE` / `HIGH_FANOUT` 两项 `reason_code` | 范围 | `v0.1.1`——需配置解析与引用计数能力 |
| Webview 侧边栏 | 技术 | `00` §5 明确不做；原生 QuickPick 足够 |
| 完整 AST 语义分析 | 技术 | `00` §5——本版用「diff hunk + 简单上下文」验证价值 |
| Git Hook 强制拦截 | 技术 | `00` §5——本版仅手动触发命令 |
| 服务端 Proxy / 托管 Key | 范围 | `00` §5——本版 BYOK |
| 自动改写代码 | 技术 | `00` §5——判定器只打分、不生成 |
| 多语言 AST / 多模型路由 | 范围 | `00` §5——单点价值验证后再扩展 |

---

## 2. 功能验收标准

| 验收项 | 验证方法 | 通过标准 |
|---|---|---|
| 命令可触发 | 命令面板执行 `SoneCheck: Inspect Staged Diff` | 命令注册成功且无报错 |
| 抓取与切块 | 在含 ≥10 块改动的仓库执行 | 解析出 hunk 数组（文件、起始行、变更类型、内容）；`diff_hunk` 超限的 hunk 按 `300-design` §4.3 切分，改动行零丢失 |
| 无改动提示 | 暂存区为空时执行 | 提示一次「无暂存改动」，不弹清单 |
| 高风险清单 | 暂存区含敏感路径改动 | 弹出 QuickPick，条目格式 `[score] 文件:行 · reason` |
| 零打扰 | 全部为低风险改动 | 状态栏短暂提示后恢复，不弹清单（US-03） |
| 跳转定位 | 点击清单条目 | 打开对应文件且光标落在 hunk 起始行，无死链 |
| 端到端耗时 | 真机多轮（每轮 ≥10 块改动） | 端到端 `p95 ≤ 1s`（`00` §3 的**自设验收线**；S3 实测回填的是 `riskThreshold` / 上下文窗口 / payload 上限，不改变本验收线） |
| 工作区只读 | 检查前后对比 `git status` | 工作区无任何变化 |

---

## 3. 架构验收标准

| 验收项 | 通过标准 |
|---|---|
| 单向分层 | `core` / `infra` 无反向 import；`core` 内不出现 `require('vscode')` |
| 配置读取位置唯一 | 所有 `workspace.getConfiguration` 调用只出现在 `infra/configSource.ts` |
| Facade 极简暴露 | 层间调用只经 `src/core/index.ts` / `src/infra/index.ts` |
| 契约状态一致 | `03` 中本版兑现的契约已由 `[PLANNED]` 翻为 `[CURRENT]`，其余保持 `[PLANNED]` |
| 无硬编码判定参数 | 阈值、Top-K 条数、上下文上限均来自命名常量或配置项（`INV-07`） |
| TypeScript 编译零错误 | `npm run compile` 通过，`main` 指向编译产物 |

---

## 4. DoD (Definition of Done)

- [ ] 核心业务场景已确认（单一场景，一句话可述）
- [ ] 架构锚点已确认（§1 分层 / 模块 / 门面 / 契约 / API 均已登记）
- [ ] 受影响契约已回写至契约 SSOT（`[PLANNED]` → `[CURRENT]`）
- [ ] 验收标准已确认
- [ ] 相关设计文档已评审通过（`300-design.md`）
- [ ] 测试策略已定义（见 `300-design.md` §7）
- [ ] 关键测试场景已通过（本版范围的 T1 单测全绿）
- [ ] `.vsix` 打包成功并可在干净 VS Code 上安装
