# dev-meta 项目规范

<!--
  dev-meta 版本绑定。通用规范（DoD、AI 协作约定、编码约定、工作日志指引）由 ~/.codebuddy/CODEBUDDY.md 全局加载。
  本文件只写「采用版本 + 例外项」：不复制规范正文，也不重复 dev-meta 仓库地址
  （仓库地址由全局层 ~/.codebuddy/CODEBUDDY.md 统一提供，项目层再写一份只会漂移）。
-->

## 规范来源

| 项 | 值 |
|---|---|
| 来源仓库 | `dev-meta` |
| 采用版本 | 137d24a |

## 本项目例外

- **私有规划目录**：内部规划笔记存放于 `docs/private/`，该目录被 `.gitignore` 排除、不进版本控制。`docs/00~06` 工程文档（含契约 SSOT `03`）仍按通用规范正常跟踪，不得迁入 `docs/private/`。
- **npm 包与 VS Code 扩展共用一个 `package.json`**：在拆包前，禁止直接 `npm publish` 根目录的 `package.json`（`version` 同源会让扩展版本污染 npm 包；`main` 字段两者互斥）。详见 `docs/01_TECHNICAL_SPEC.md` §4 与 `docs/05_ROADMAP_AND_COMPLIANCE.md` §2。
