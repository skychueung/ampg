# AMPGen Agent Platform — Local Agent Integration Plan

## 1. 当前阶段定位

当前 AMPGen 可视化平台已经完成：

- 本地 MVP 封版；
- 服务器部署；
- SERVER_PRODUCTION 小规模生成；
- Server Batch Queue MVP；
- 端口隔离：AMPGen 使用 18601/18600，STAMP 使用 8001/8080；
- 科学边界：生成序列不等于实验验证，amp_score/MIC 未接入前必须保持 null。

后续如进入 Agent 协作阶段，应先以"外部协作流程"为主，不要一开始直接把多个 Agent 嵌入平台后端。

## 2. Agent 分工

### KimiCode：主施工 Agent

负责：

- 修改 FastAPI 后端；
- 新增 adversarial validation / ARIS-Lite 相关 endpoint；
- 修改 React 前端页面；
- 新增 pytest；
- 新增 smoke 脚本；
- 更新文档；
- 生成阶段报告。

### DeepSeek-TUI：执行验证 Agent

负责：

- 运行 pytest；
- 运行 npm build；
- 检查 FastAPI 是否能启动；
- 检查接口返回；
- 检查服务器日志；
- 检查 smoke 脚本；
- 检查是否破坏 Local Demo、LOCAL_REAL_SMOKE、SERVER_PRODUCTION、Batch Queue、Candidate Review、Sequence Explorer 等已有功能；
- 检查是否影响 STAMP 8001/8080。

### DeepSeek-Reasonix：推理审查与挑错 Agent

负责：

- 审查 ARIS-Lite 工作流是否逻辑闭环；
- 检查 Rule Validator、Biology Critic、Engineering Critic、Evidence Auditor、Arbiter 五个角色是否职责清楚；
- 检查 claim ledger 中每条科研结论是否有证据支持；
- 检查是否存在把规则筛选、序列相似性、motif 统计、shortlist、batch 结果夸大成真实 MIC、毒性、溶血或实验验证结果的问题；
- 检查 PASS / REVISE / BLOCKED / NEEDS_SERVER 的判定是否合理；
- 输出 Reasonix 审查意见。

### Hermes：总控汇总 Agent

负责：

- 汇总 KimiCode 施工结果；
- 汇总 DeepSeek-TUI 测试结果；
- 汇总 DeepSeek-Reasonix 审查意见；
- 生成最终验收报告；
- 判断是否允许进入下一阶段。

## 3. 服务器职责

服务器 `stamp218` 作为真实计算执行环境，负责：

- 运行 SERVER_PRODUCTION；
- 运行批量 AMPGen 生成；
- 后续接入 XGBoost AMP discriminator；
- 后续接入 MIC scorer；
- 后续接入 ESM embedding；
- 保存 server-artifacts；
- 执行真实 GPU 计算。

固定路径：

- AMPGen 可视化平台：`/home/xh/kxc/ampg可视化`
- AMPGen 原始模型目录：`/home/xh/kxc/ampgenkxc/AMPGen`

服务器端口：

- AMPGen backend: `18601`
- AMPGen frontend: `18600`
- STAMP backend: `8001`
- STAMP frontend: `8080`

## 4. 计算边界规则

后续所有任务必须遵守：

- 本地电脑只负责代码开发、轻量 mock 测试、npm build、文档和报告；
- 本地不运行真实 AMPGen 生成；
- 本地不运行 SERVER_PRODUCTION；
- 本地不做 GPU 计算；
- 真实生成任务必须在服务器 stamp218 执行；
- AMPGen 服务器端口固定为 18601/18600；
- 不得占用 STAMP 的 8001/8080；
- 不得修改 AMPGen 原始模型目录；
- 不得伪造 amp_score、MIC、毒性、溶血或实验验证结果。

## 5. 后续接入顺序

建议顺序：

1. **P6D-1.5**：Batch Queue 全量回归；
2. **P6D-2**：30/50 条批量生成稳定性验证；
3. **P6E**：XGBoost AMP discriminator 接入；
4. **P6F**：MIC scorer 接入；
5. **P7**：ARIS-Lite / adversarial validation 后端结构；
6. **P7.5**：外部 Agent 协作审查流程；
7. **P8**：完整多 Agent 审查与报告汇总。

## 6. 禁止事项

当前不要直接做：

- 不要把 DeepSeek / Hermes / Reasonix 直接嵌入生产后端；
- 不要让外部 Agent 直接修改服务器生产文件；
- 不要让 Agent 自动跑大规模 GPU 任务；
- 不要绕过人工确认执行批量生成；
- 不要把 Agent 审查结论写成实验验证结果。

## 7. 与科学边界的关系

本计划中的"计算边界规则"与平台已有的"科学边界"是一体两面：

- **科学边界**：`amp_score`、`mic_ecoli`、`mic_saureus`、`hemolysis`、`toxicity` 等字段在未经真实实验或经认证的预测模型计算前，必须保持 `null`，不得用规则筛选、序列相似性、motif 统计等间接结果冒充。source 标签必须真实反映数据来源（`server_production`、`server_batch`、`local_demo`、`local_mock` 等）。
- **计算边界**：本地开发环境不承担真实计算职责，所有 GPU 密集型任务、大规模序列生成、SERVER_PRODUCTION 执行必须在 `stamp218` 完成。

Agent 协作流程的设计必须同时遵守科学边界和计算边界，任何 Agent（包括 Reasonix 审查）若发现越界行为，应立即标记为 BLOCKED 并上报 Hermes。
