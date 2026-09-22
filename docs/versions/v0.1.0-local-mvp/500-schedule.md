# v0.1.0 版本排程

> 模板用途：快速起草版本工作包排程、执行记录与一人团队防沉迷红线。
> 结构唯一权威：`skills/dm-schedule.md` 的「模板结构」节（排程单一权威）。
> ⚠️ 本文件是**进度状态**（⬜ / 🔄 / ✅）与**执行记录**的唯一承载处；`400-build.md` 只记「执行态」，二者不重复。

> **关联 Roadmap 版本：** `v0.1.0-local-mvp`
> **上线卡点：** 待定
> **首期目标：** 主链路真机跑通，并发布 Marketplace `rolligen.sonecheck@0.1.0`

## 1. 一人团队防沉迷红线

1. **市场任务不完成，严禁写新代码**：本版的市场/验证任务是「先写清要证明的假设与判据」，未完成前不进入编码。
2. **2 小时停损原则**：作用域识别、权重调参等非核心优化若超过 2 小时无果，立刻降级为固定窗口兜底或等权起步，不恋战。
3. **闭环高于完美**：优先保证主路径通畅（触发 → 清单 → 跳转），边缘异常留待 `v0.1.1`。
4. **每周日强制对账**：对照本表打勾，超时的工作包通过砍掉后续非核心项补偿时间。Step 内部步骤可重排优先级，但 **Step 本身不可分割**。

## 2. 工作包列表（按执行顺序排列）

| # | ID | 类别 | 环节 | 工作内容 | 难度 | 预估工时 | 验收标准 | 状态 |
|---|-----|------|------|---------|------|---------|---------|------|
| 1 | v0.1.0-research-01 | research | 调研 | 写明本版要证明的假设（「Top-K 清单能让 review 聚焦」）与判据；在 2 个真实仓库记录人工 review 用的时间基线 | ★★☆☆☆ | 0.5h | 假设、判据、基线记录三者已写明 | ⬜ |
| 2 | v0.1.0-dev-01 | dev | 开发 | **S0 Scaffold & Clean**：TS 工程化、`src/`→`out/` 布局、三层目录与 Facade 骨架、`src/constants.ts` 常量骨架、移除占位命令。详见 `400-build` §3.1 | ★★☆☆☆ | 1.5h | `npm run compile` 零错误，Extension Development Host 能加载扩展 | ✅ |
| 3 | v0.1.0-dev-02 | dev | 设计 | **S1 Contract & ADR**：ADR-001（TS 迁移）/ ADR-002（mock 判定器）落盘，冻结 `jevClient` 签名，回写 `03` 契约状态。详见 `400-build` §3.2 | ★★☆☆☆ | 1h | ADR 已落盘；`03` 状态标注完成；契约检查通过 | ✅ |
| 4 | v0.1.0-dev-03 | dev | 开发 | **S2 Core & Prototype**：`parseDiff` / `buildContext` / `scoreHunk` 三个纯函数 + Harness 实测数据（双数据源）。详见 `400-build` §3.3 | ★★★★☆ | 3h | Harness 产出 score 分布与字节数分布；三个纯函数单测通过 | ⬜ |
| 5 | v0.1.0-dev-04 | dev | 开发 | **S3 Standard Finalization**：用实测数据回填 `riskThreshold` / 窗口参数 / payload 上限；契约 `[PLANNED]` → `[CURRENT]`。详见 `400-build` §3.4 | ★★★☆☆ | 1h | `03` 中不再存在无实测依据的阈值 | ⬜ |
| 6 | v0.1.0-dev-05 | dev | 开发 | **S4 Ingress Migration**：`git` / `configSource` / `config` / `riskEngine` / `commands` 接线与装配。详见 `400-build` §3.5 | ★★★☆☆ | 2h | 命令可触发，能解析出 hunk 数组，`GUARD-01/02` 全绿 | ⬜ |
| 7 | v0.1.0-dev-06 | dev | 开发 | **S5 Egress Migration**：`threshold` 过滤与 Top-K、QuickPick 清单、跳转定位、状态栏双态。详见 `400-build` §3.6 | ★★★☆☆ | 2h | 真机点击条目可精准跳转；`GUARD-05` 全绿 | ⬜ |
| 8 | v0.1.0-dev-07 | dev | 测试 | **S6 Guards & Tests**：5 条防腐守卫 + T1 全量单测 + 契约结构 lint（无条件必跑）。详见 `400-build` §3.7 | ★★★☆☆ | 2h | 守卫全绿、单测全绿、lint 通过 | ⬜ |
| 9 | v0.1.0-dev-08 | dev | 发布 | **S7 Verification & Close**：真机逐项验收、`.vsix` 打包、Marketplace `0.1.0` 发布、tag 与 Issue 收口。详见 `400-build` §3.8 | ★★☆☆☆ | 1h | `200-spec` §2 八项验收全过；`0.1.0` 已上架 | ⬜ |

> 状态：⬜ 待开始 / 🔄 进行中 / ✅ 已完成 / ❌ 已取消

> - dev 工作包以 **Step**（S0–S7）为原子单位组织，不可再拆分为步骤级。每个 Step 引用 `400-build.md` §3 对应小节获取内部步骤。
> - 仅**执行态为「执行」**的 Step 生成工作包；本版全部 Step 执行态均为「执行」，无 `⏭️ SKIPPED`，故 8 个 dev 工作包全部排程。
> - dev 工作包完成定义 = 代码 + 部署 + 联调。部署/联调归 dev，不归 qa；qa 只验收已部署 + 已联调的功能。
> - 环节取值：调研 / 定位 / 设计 / 规格 / 开发 / 构建 / 部署 / 联调 / 测试 / 发布。市场验证环节（营销 / 调研）排最前，dev / qa 工作包排在其后。
> - **合计预估工时：14h**（research 0.5h + dev 13.5h）。

## 3. 执行记录（Step 完成即追加，append-only）

> 精简规则：每条 ≤ 8 行 · 每段一行 · 无内容写「无」 · 不抄 200 验收与 400 步骤 ·
> 无偏差且改动 ≤1 文件的 Step 压成一行 · 跳过（`⏭️ SKIPPED`）的 Step 不记录。
> 日常流水进 worklog（时间轴），本节只记 Step 轴的偏差 / 发现 / 失误 / 遗留。
> 条目随 Step 完成动态追加，**不编号**（Step 可能跳过，编号会失真）。

#### S0 Scaffold & Clean（5faf30a）

- **概要**：`extension/` 由纯 JS 占位升级为可编译的 TypeScript 三层工程（`src/`→`out/`、两个 Facade、`constants.ts` 常量骨架），为版本提供可施工的工程底座
- **偏差**：`package-lock.json` 随 `npm install` 一并纳入版本控制（文档未提，属工程基线补全）
- **发现**：`vsce ls` 确认打包内容仅 `LICENSE` / `README.md` / `package.json` / `out/**`，`src`、测试与 sourcemap 均被正确排除
- **失误**：无
- **遗留**：Extension Development Host 加载待真机确认（需用户操作）；`registerCommands()` 待 S4 接入

#### S1 Contract & ADR（c77e80e）

- **概要**：冻结判定服务契约（类型 + `IJevClient` 抽象）并经 infra Facade 导出，使 `core` 只依赖抽象、`v0.1.1` 换真身不动调用方，为整版提供接口边界
- **偏差**：无
- **发现**：ADR-001~005 均已落盘且为「已接受」，本步无需新建 ADR；契约结构 lint 全绿、编号集合与状态标记零漂移
- **失误**：无
- **遗留**：`decide` 的 mock 实现归 S2（`scoreHunk` 四维加权）
