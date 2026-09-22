# v0.1.0 设计 — local-mvp

> 结构唯一权威：`dev-meta/docs/02-version-rules.md` §5。
> ⚠️ 本文件不得出现 `Transaction Flow` / `TF` / `Step` 章节（施工拆分属 `400-build.md`）。
> 需求侧范围与验收见 `200-spec.md`；施工拆分见 `400-build.md`。

---

## 1. 架构背景与目标

- **架构目标**：把 `extension/` 从纯 JavaScript 占位升级为 TypeScript 三层工程，使 `02` §1 的分层纪律与 `02` §2 的模块划分首次落到真实代码上。
- **上一版本基线**：`extension/package.json`（`0.0.1`，`publisher: rolligen`，`main: ./extension.js`）+ `extension/extension.js`（仅注册 `sonecheck.showStatus`）。根目录 npm 占位包已冻结于 `0.0.x`，本版不触碰。
- **影响范围**：仅 `extension/` 目录。`docs/00~06` 只在契约状态上回写（`[PLANNED]` → `[CURRENT]`），不改语义。

---

## 2. 架构与分层

- **全局架构**：沿用 `02` §1 的三层单向分层，不新增层。
- **分层落位**：

| 层 | 文件 | 职责 | 禁止 |
|---|---|---|---|
| 装配 | `src/extension.ts` | `activate()` 注册命令与组装依赖、`deactivate()` 清理 | 承载业务逻辑 |
| 跨层常量 | `src/constants.ts` | 命名常量唯一集中处（判定阈值、payload 上限、构建期日志开关） | 纯数据模块：不属于任何层、不 import 任何层，三层只读引用；不得写逻辑 / IO |
| UI | `src/ui/commands.ts` | 命令编排：读配置 → 调 core → 分发结果 | 直接调 git / HTTP |
| UI | `src/ui/riskList.ts` | QuickPick 清单与跳转定位 | 计算风险分 |
| UI | `src/ui/status.ts` | 状态栏双态与一次性提示 | 直连 core 内部 |
| Core | `src/core/riskEngine.ts` | 主流程编排：切块 → 组装 → 判定 → 过滤 | 引用 `vscode` 做 IO |
| Core | `src/core/contextBuilder.ts` | 上下文截取（作用域识别 + 兜底） | 引用 `vscode` |
| Core | `src/core/threshold.ts` | 阈值判定与 Top-K 排序 | 硬编码阈值 |
| Core | `src/core/config.ts` | 配置模型与校验、默认值归一 | 读取 `workspace` |
| Infra | `src/infra/configSource.ts` | 唯一读取 `workspace.getConfiguration` 的出口 | 承载业务判断 |
| Infra | `src/infra/git.ts` | 取工作区根、执行 `git diff --staged`，并把本机失败分类为 `ERR-06` / `ERR-09` | 修改工作区 |
| Infra | `src/infra/sourceReader.ts` | 只读读取源文件行（缺失返回空数组），供上下文截断与可定位判定 | 写入 / 修改文件 |
| Infra | `src/infra/diffParser.ts` | diff 文本 → hunk 数组 | 依赖 `vscode` |
| Infra | `src/infra/jevClient.ts` | 判定请求（本版为本地 mock 实现） | 依赖 `vscode` |

- **Facade**：`src/core/index.ts`、`src/infra/index.ts` 各只 re-export 公开符号，内部实现全部私有。
- **本版不建的模块**：`src/infra/secrets.ts` / `src/infra/logger.ts` 按 `200-spec` §1.1 归 `v0.1.1`（本版无 API Key、无运行期日志）；`src/constants.ts` 虽为跨层模块，但由 S0 随工程骨架一并建立。

### 2.1 防腐设计

| 关注点 | 设计约束 |
|---|---|
| 类型边界 | 层间只交换项目自有类型（`Hunk` / `RiskItem` / `DecisionResult` / `SoneCheckConfig`）；`vscode` 类型**只允许**出现在 `src/ui/**`、`src/extension.ts`（装配入口，须接收 `ExtensionContext`）与 `src/infra/configSource.ts`（唯一配置出口） |
| 错误域边界 | 本地失败只落 `ERR-06`（非 git 仓库）/ `ERR-07`（无暂存改动）/ `ERR-09`（git 缺失）；`core` 不做 `try-catch`，异常沿调用链上抛至 `ui/commands` 统一提示一次后终止；**不静默吞错** |
| 模块物理路径 | `src/{ui,core,infra}` → tsc 编译 → `out/{ui,core,infra}`；入口 `src/extension.ts` → `out/extension.js` |
| 工程登记 | `package.json` 的 `main` 改为 `./out/extension.js`；`.vscodeignore` 排除 `src/`、`test/`、`tsconfig.json`、`**/*.map` |
| **依赖版本基线（硬约束）** | `@types/node` 固定 **`^22.0.0`**——必须与扩展宿主内置的 Node 22.x 运行时**大版本一致**；用更高大版本会允许调用宿主不存在的 API（如新版 `fs` / `util` 静态方法），导致「编译通过、运行期 `TypeError`」。`typescript` 锁定 **`~5.7.0`**——5.x 稳定代际，避免 TS 7.x 与 `@types/vscode` 及官方构建链的兼容性风险 |

---

## 3. 数据流与状态机

**关键数据流**（对应 `02` §3 主链路）

| 步骤 | 发起方 | 接收方 | 数据 |
|---|---|---|---|
| 1 | 用户 | `ui/commands` | 触发命令 `sonecheck.inspectDiff` |
| 2 | `ui/commands` | `infra/configSource` | 读取原始配置 |
| 3 | `ui/commands` | `core/config` | 归一为 `SoneCheckConfig` |
| 4 | `ui/commands` | `core/riskEngine` | 传入已归一配置 |
| 5 | `core/riskEngine` | `infra/git` | 工作区根 |
| 6 | `infra/git` | `core/riskEngine` | 暂存区 diff 原始文本 |
| 7 | `core/riskEngine` | `infra/diffParser` | diff 文本 → `Hunk[]` |
| 8 | `core/riskEngine` | `core/contextBuilder` | 每个 `Hunk` 补上下文 → payload（源文件行由 `infra/sourceReader` 只读提供） |
| 9 | `core/riskEngine` | `infra/jevClient` | payload 数组（本版本地顺序调用） |
| 10 | `core/riskEngine` | `core/threshold` | `DecisionResult[]` → `RiskItem[]` |
| 11 | `ui/commands` | `ui/riskList` / `ui/status` | 清单或空集 |
| 12 | `ui/riskList` | VS Code 编辑器 | 打开文件 + 定位行列 |

**状态跃迁**（对应 `02` §4）

| 状态 | 说明 | 跃迁条件 |
|---|---|---|
| `Idle` | 空闲 | 命令触发 → `Collecting` |
| `Collecting` | 读取 diff 与切块 | 成功 → `Deciding`；无改动 → 终止（`ERR-07`） |
| `Deciding` | 逐块判定与过滤 | 完成 → `Reporting` |
| `Reporting` | 展示清单或状态提示 | 用户关闭 → `Idle` |

> 本版**不实现 `Degraded`**：判定器为本地纯函数，不存在网络失败分支。该状态留待 `v0.1.1` 引入真实客户端时补入。

---

## 4. 核心算法方案

本版核心算法有两处：**上下文截取**与**多维加权判定**。

### 4.1 上下文截取（作用域识别）

- **方案**：对 hunk 起始行做**括号配对回溯**——自改动行向上扫描，找到第一个使括号深度归零的 `{`，即为所在作用域起点；再向下扫描至深度归零，取该区间行文本作为 `context_code`。
- **兜底**：无法定位时（非 C 系语法、单行文件、括号不平衡），退化为「hunk 前后各 10 行」的固定窗口。
- **硬上限**：受 `INV-02` 的「**payload 序列化总长 ≤ 2048 字节**」约束——上下文截断预算 = `MAX_PAYLOAD_BYTES` − 序列化后其余字段（`file_path` / `change_type` / `diff_hunk`）的字节数；截断时从尾部长截以保留改动行所在片段。
- **选型理由**：比固定窗口更贴合「评审者需要看整个函数」的实际需求，而实现成本显著低于引入 AST 解析器。

### 4.2 多维加权判定（mock 判定器）

| 维度 | 取值 | 初始权重 | 判定方式 |
|---|---|---|---|
| 敏感路径 | 0 / 1 | **0.40** | 文件路径匹配 `CFG-01` 的 `sensitivePathPatterns` |
| 关键词模式 | 0 – 1 | 0.20 | diff 命中 `auth` / `token` / `password` / `session` / `delete` / `catch` / `transaction` 等模式的比例 |
| 改动规模 | 0 – 1 | 0.20 | 增删行数映射（超阈值封顶） |
| 导出符号 | 0 / 1 | 0.20 | 改动行是否触及 `export` / `public` 声明 |

- **合成分**：`score = Σ(维度值 × 权重)`，截断到 `[0, 1]`。
- **判定**：`score ≥ riskThreshold` → `decision = AUDIT`，否则 `PASS`。
- **`reason_code`**：取**权重最高的命中维度**对应的枚举。本版落地 `AUTH_BOUNDARY` / `DATA_WRITE` / `CONTRACT_BREAK` / `ERROR_HANDLING` / `STYLE_ONLY` 五项；未命中任何维度时返回 `STYLE_ONLY`。
- **选型理由**：权重可调、维度可解释，四个维度的原始值都能在 Harness 中统计分布，满足 `dev-meta/docs/02-version-rules.md` §6.3「数据驱动阈值（强制）」的要求。
- **实现归属**：`scoreHunk(input): DecisionResult` 属 `infra/jevClient` 的**内部实现**（与 `decide()` 同文件），不单独成模块；`v0.1.1` 换真实客户端时只替换该文件实现，签名与 `DecisionResult` 字段不变（ADR-002）。
- **归因规则**：`reason_code` 由**三维语义维度**中权重最高者决定——敏感路径 → `AUTH_BOUNDARY`；导出符号 → `CONTRACT_BREAK`；关键词组 → `AUTH_BOUNDARY` / `DATA_WRITE` / `ERROR_HANDLING`（同组内按词表顺序取先命中者）。**改动规模只参与打分、不决定归因**（它不说明「改了什么」）。无改动行或三维全未命中时返回 `STYLE_ONLY`。

### 4.3 hunk 切分（超限保护）

- **问题**：git 的 hunk 不是 wire 单位——单个 hunk 的 `diff_hunk` 可能超过 `INV-02` 的 payload 上限（S2 Harness 实测：本项目 40 个提交的原始 hunk 中约 14% 超限）。
- **方案**：`parseDiff` 解析后按 `MAX_DIFF_WIRE_BYTES = MAX_PAYLOAD_BYTES − HUNK_METADATA_RESERVE_BYTES` 顺序切分；每个子 hunk 保留 `@@` 头、**真实起始行**与全部改动行，**不重排、不丢行**。
- **兜底**：单行自身超限（压缩产物）时截断该行——`INV-02` 的优先级高于「diff 原文完整性」。
- **代价**：解析结果不再逐字等于 `git diff --staged` 的 hunk 划分（`INV-02` 的必然结果）；`200-spec` §2 的「抓取与切块」验收据此表述。
- **实测**：S2 Harness 436 个 hunk，payload 越界数 = 0。
- **与 Jev 真实原语的对应**：本版 mock 的「多维加权合成」即官方推荐的 **composite scoring** 模式——真实接入时每个维度改为一个独立的 `noul` question（同一 `state`、单次调用内并行评估），权重仍在本地代码组合。因此 `scoreHunk` 的签名与权重结构在 `v0.1.1` **不变**，只替换 `infra/jevClient` 的实现（`03` §2.1）。

---

## 5. 关键决策（ADR）

| 决策 | ADR | 备选方案 | 选择理由 | 影响 |
|---|---|---|---|---|
| 扩展迁移 TypeScript，布局 `src/` → `out/` | [ADR-001](../../adrs/adr-001.md) | 保持 JS；`src/` → `dist/` | 与 `01` §1 选型一致；`src` + `out` 是 VS Code 官方模板惯例，后续查文档与抄示例零摩擦 | `main` 改为 `./out/extension.js`；`.vscodeignore` 排除 `src/` |
| 判定服务先用 mock 实现，与真实客户端**同签名** | [ADR-002](../../adrs/adr-002.md) | 等 endpoint 确认再开工 | `05` §4 的既定风险预案；接口层隔离后，`v0.1.1` 只替换 `infra/jevClient` 实现 | `infra/jevClient` 的公开签名即为契约，`v0.1.1` 不得变更 |
| 上下文截取用轻量作用域识别 + 固定窗口兜底 | —（算法选型，不涉及技术栈，不单独落 ADR） | 纯固定窗口；引入 AST 解析器 | 更贴合评审需求，实现成本显著低于 AST | `contextBuilder` 须处理括号不平衡等边界 |
| `reason_code` 本版只兑现 5 项 | —（范围决策，同上） | 全部 7 项；只返回 `UNKNOWN` | `CONFIG_CHANGE` / `HIGH_FANOUT` 需配置解析与引用计数能力，本版不具备；返回 `UNKNOWN` 会让清单缺少可读原因 | `03` §2.4 的枚举表须标注哪几项在 `v0.1.0` 生效 |

**本版技术栈决策（`dm-adr` 已落盘）**

| 决策 | ADR |
|---|---|
| 测试框架选型：Vitest + MSW | [ADR-003](../../adrs/adr-003.md) |
| Jev 客户端手写 `fetch`，不引入官方 SDK | [ADR-004](../../adrs/adr-004.md) |
| 风险分采用 `noul` 原语，不使用 `score` 原语 | [ADR-005](../../adrs/adr-005.md) |

> 技术选型类决策须触发 `dm-adr` 落盘（由 S1 完成）；已落盘项在上表回填编号。**ADR 原文为唯一权威**，本表只登记指向与版本级取舍。

---

## 6. 与现有版本的继承关系

| 现有能力 / 模块 | 本版本变更 |
|---|---|
| `extension/extension.js`（占位） | **删除**，由 `src/extension.ts` 的编译产物取代 |
| 命令 `sonecheck.showStatus` | **移除**，由 `sonecheck.inspectDiff` 取代 |
| `extension/package.json` 的 `main` | `./extension.js` → `./out/extension.js` |
| `extension/package.json` 的 `contributes.commands` | 替换为 `sonecheck.inspectDiff` |
| 根目录 npm 占位包（`0.0.x`） | **不变**，本版不触碰 |
| `docs/03` 的契约状态 | 本版兑现项由 `[PLANNED]` 翻为 `[CURRENT]` |

---

## 7. 测试策略

| 关注点 | 测试级别 | 关键场景 | 环境依赖 |
|---|---|---|---|
| diff 解析 | T1 单元 | 多文件 / 新增 / 删除 / 重命名 / 空 diff / 二进制文件跳过 | 纯 Node，无 `vscode` |
| 上下文截取 | T1 单元 | 括号平衡 / 不平衡走兜底 / 超 2KB 截断且保留改动行 | 纯 Node |
| 判定打分 | T1 单元 | 四维各自命中 / 全不命中 / 合成边界（0 与 1） | 纯 Node |
| 阈值过滤与 Top-K | T1 单元 | 全低风险 / 全高风险 / 恰好等于阈值 / 条数超上限 | 纯 Node |
| 配置归一 | T1 单元 | 越界值回退默认 / 缺省字段补齐 | 纯 Node |
| 命令编排 | T3 端到端 | 触发命令 → 清单弹出 → 选中跳转 | Extension Host（人工验证） |
| 无改动路径 | T3 端到端 | 暂存区为空时的提示与终止 | Extension Host（人工验证） |

> **层级口径**：沿用 `01` §3 的 `T1 / T2 / T3`。本版**无 T2**——mock 判定器是本地纯函数，不存在跨进程契约边界；T2 随 `v0.1.1` 的真实客户端引入。

**测试基线（棘轮，只升不降）**：`v0.1.0` 收口时 T1 = **51 例 / 8 文件**（diff 解析 11 · 上下文截取 6 · 判定打分 9 · 阈值与 Top-K 6 · 配置归一 6 · git 与源文件读取 5 · 端到端管线 5 · 清单文案 3），T3 = 2 个真机场景（命令编排 / 无改动路径）。删除或跳过用例须在 `400-build` §2 对应 Step 标注理由。

- **单元覆盖对象**：本版核心逻辑（解析 / 截取 / 打分 / 过滤 / 归一）全部可纯 Node 测试，构成 T1 的主要覆盖面。
- **不写单测的部分**：`ui/**` 的原生控件交互无法在纯 Node 复现，以真机验证替代——依据见 `01` §3。
- **测试目录**：`test/`（与 `src/` 平级，**不在 `src/` 内**）。该位置使 `GUARD-03` 的 `grep src/` 天然不扫测试用例中出现的 `0.4` / `2048` 字面量；`.vscodeignore` 需排除 `test/`。
- **判定服务的 Mock 方式**：本版判定器是本地纯函数（无网络），单测直接调用即可。`core` 依赖 `IJevClient` 抽象，测试注入内存 stub——**不在 T1 中 mock 网络层**；网络层拦截（MSW / `nock`）与 `429` / `529` 退避验证留待 `v0.1.1` 引入真实客户端时启用（见 `01` §3）。
