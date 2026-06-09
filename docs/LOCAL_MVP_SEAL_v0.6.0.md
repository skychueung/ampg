# AMPGen Agent Platform v0.6.0 Local MVP Seal

**Version**: v0.6.0-local-mvp-seal  
**Date**: 2026-05-28  
**Commit**: cdb29fb  
**Previous Tag**: v0.5.9-local-maintenance  
**Seal Type**: Local MVP validation + version freeze

---

## 1. 当前版本能力矩阵

| 模块 | 能力 | 状态 |
|------|------|------|
| Dashboard | 汇总统计、近期运行、肽段列表 | 已验收 |
| Generation | 本地 demo / real smoke 生成 | 已验收 |
| Task Center | 异步任务、轮询、取消 | 已验收 |
| Candidate Library | 肽段库、筛选、详情 | 已验收 |
| Peptide Detail | 物理化学属性、真实 API | 已验收 |
| Report Export | CSV/FASTA/JSON/XLSX/PDF | 已验收 |
| AMPGen Workflow | 工作流可视化、运行详情、产物 | 已验收 |
| Peptide Analytics | 分布图、AA 组成、过滤规则、排序 | 已验收 |
| Run Comparison | 运行对比、图表 | 已验收 |
| Sequence Explorer | 重复、相似性、motif、代表肽 | 已验收 |
| Candidate Review | 证据卡、短名单、批量评审、合成订单 | 已验收 |
| Local Maintenance | 备份、恢复、快照、清理、重置 | 已验收 |
| Admin | 基础管理页 | 已验收 |

## 2. 前端页面清单

| 页面 | 路由 | 是否存在 | 是否懒加载 | 是否调用真实 API | 结论 |
|------|------|----------|------------|------------------|------|
| Dashboard | /dashboard | 是 | 是 | 是 | 通过 |
| Generation | /generation | 是 | 是 | 是 | 通过 |
| AMP Filter | /amp-filter | 是 | 是 | 是 | 通过 |
| Candidate Library | /candidate-library | 是 | 是 | 是 | 通过 |
| Peptide Detail | /peptide/:id | 是 | 是 | 是 | 通过 |
| Task Center | /task-center | 是 | 是 | 是 | 通过 |
| Server Mode | /server-mode | 是 | 是 | 是 | 占位 |
| Admin | /admin | 是 | 是 | 是 | 占位 |
| Report Export | /reports | 是 | 是 | 是 | 通过 |
| AMPGen Workflow | /ampgen-workflow | 是 | 是 | 是 | 通过 |
| Generation Run Detail | /generation-runs/:runId | 是 | 是 | 是 | 通过 |
| Peptide Analytics | /peptide-analytics | 是 | 是 | 是 | 通过 |
| Run Comparison | /run-comparison | 是 | 是 | 是 | 通过 |
| Sequence Explorer | /sequence-explorer | 是 | 是 | 是 | 通过 |
| Candidate Review | /candidate-review | 是 | 是 | 是 | 通过 |
| Local Maintenance | /maintenance | 是 | 是 | 是 | 通过 |

## 3. 后端 API 清单

| API 分组 | endpoint 数量 | 状态 |
|----------|--------------:|------|
| health | 1 | 通过 |
| system / ampgen-probe | 1 | 通过 |
| generation-runs | 5 | 通过 |
| tasks | 4 | 通过 |
| peptides | 4 | 通过 |
| filters | 1 | 通过 |
| reports | 5 | 通过 |
| dashboard | 2 | 通过 |
| analytics | 9 | 通过 |
| sequence-explorer | 5 | 通过 |
| candidate-review | 9 | 通过 |
| maintenance | 8 | 通过 |
| **合计** | **54** | **全部通过** |

## 4. 数据库核心表说明

| 表名 | 记录数 | 说明 |
|------|--------|------|
| peptide_candidates | 75 | 生成的候选肽段 |
| tasks | 50 | 异步任务 |
| generation_runs | 50 | 生成运行 |

关键约束：
- mp_score、mic_ecoli、mic_saureus 全部为 NULL
- eview_status: 73 None, 2 SHORTLISTED
- selected_for_synthesis: 2

## 5. 脚本清单

| 脚本 | 用途 | 状态 |
|------|------|------|
| healthcheck.ps1 | 健康检查 | PASS |
| smoke_dashboard_real_api.ps1 | Dashboard API 验收 | PASS |
| smoke_scientific_boundary_hotfix.ps1 | 科学边界验收 | PASS |
| smoke_ampgen_visualizer.ps1 | AMPGen 可视化验收 | PASS |
| smoke_peptide_analytics.ps1 | 肽段分析验收 | PASS |
| smoke_run_comparison.ps1 | 运行对比验收 | PASS |
| smoke_sequence_explorer.ps1 | 序列探索验收 | PASS |
| smoke_local_demo.ps1 | LOCAL_DEMO 生成 | PASS |
| smoke_local_real.ps1 | LOCAL_REAL_SMOKE 生成 | PASS |
| smoke_cancel_local_real.ps1 | 任务取消 | PASS |
| smoke_export_reports.ps1 | 报告导出 | PASS |
| smoke_candidate_review.ps1 | 候选评审 | PASS |
| smoke_maintenance.ps1 | 维护功能 | PASS |
| backup_project_snapshot.ps1 | 项目快照 | PASS |
| start_backend.ps1 | 启动后端 | 可用 |
| start_frontend.ps1 | 启动前端 | 可用 |
| start_all.ps1 | 启动全部 | 可用 |

## 6. 全量 smoke 验收结果

全部 14 项 smoke 测试通过，总耗时约 59 秒。

## 7. 科学边界说明

- LOCAL_DEMO / LOCAL_REAL_SMOKE 不生成 fake amp_score / MIC
- Candidate Review 不修改 amp_score / MIC
- Synthesis Order CSV 包含 "Computational candidate; not experimentally validated."
- Sequence Explorer 明确声明相似性不代表功能等效
- Run Comparison 明确声明为流程分析，非活性比较
- Peptide Analytics 明确声明 rule-based ranking 非模型预测
- ReportExport 将空值输出为 "N/A"，非 0
- 所有相关页面保留 "Computational prediction only / Not experimentally validated" 声明

## 8. 当前限制

| 限制项 | 说明 |
|--------|------|
| 未接服务器 | Server Mode 为占位页，未连接远程生产环境 |
| 未接 XGBoost | amp_score 未通过 XGBoost 判别器计算 |
| 未接 MIC scorer | mic_ecoli / mic_saureus 未通过 MIC 预测模型计算 |
| 未接 WebSocket | 前端仍使用 3s 轮询，未接入实时推送 |
| 未做完整 ARIS 后端 | 多 Agent 协作后端未完整实现 |

## 9. 下一阶段建议

1. **P6A Server Environment Audit**: 审计服务器环境、依赖、模型权重
2. **P6B Server Production Runner**: 实现远程生产运行器
3. **P6C Server Batch Generation**: 实现服务器端批量生成与队列管理

---

*Sealed by automated validation pipeline.*
