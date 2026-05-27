# AMPGen Agent Platform — Runbook

## 1. 如何启动

### 一键启动（推荐）

```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建
.\scripts\start_all.ps1
```

打开两个 PowerShell 窗口：
- 后端：`http://127.0.0.1:8001`
- 前端：`http://localhost:3000`

### 手动启动

**后端：**
```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

**前端：**
```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建\app
npm run dev
```

---

## 2. 如何停止

### 一键停止

```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建
.\scripts\stop_backend.ps1
.\scripts\stop_frontend.ps1
```

### 手动停止

在对应的 PowerShell 窗口中按 `Ctrl+C`。

---

## 3. 后端端口占用怎么办

**症状：** `uvicorn` 启动时报错 "Address already in use"。

**解决：**
```powershell
# 查找占用 8001 的进程
Get-NetTCPConnection -LocalPort 8001

# 停止进程
.\scripts\stop_backend.ps1

# 或手动
Stop-Process -Id <PID> -Force
```

---

## 4. 前端打不开怎么办

**检查清单：**

1. **后端是否已启动？**
   ```powershell
   .\scripts\healthcheck.ps1
   ```

2. **前端 dev server 是否运行？**
   ```powershell
   Get-Process -Name "node"
   ```

3. **浏览器地址是否正确？**
   - 前端地址：`http://localhost:3000`
   - 后端地址：`http://127.0.0.1:8001`

4. **防火墙是否阻止？**
   - localhost/127.0.0.1 通常不受防火墙影响。
   - 如有问题，尝试用 IP 访问。

---

## 5. LOCAL_REAL_SMOKE 运行很慢是否正常

**正常。** LOCAL_REAL_SMOKE 通过 subprocess 真实调用 evodiff 模型：

- count=1 通常需要 **40–60 秒**（CPU 模式）。
- count=2 通常需要 **80–120 秒**。

**前端表现：**
- POST 立即返回 `PENDING`（< 200ms）。
- 状态变为 `RUNNING`，计时器开始。
- 请勿重复点击 Generate。

**如果超过 2 分钟仍未完成：**
1. 检查 Task Center 中的任务状态。
2. 查看 `artifact_dir` 中的 `stderr.log` 是否有错误。
3. 确认 AMPGen 目录存在且 `generate_unconditional.py` 可执行。

---

## 6. 如何查看日志

### 通过 Task Center

1. 打开前端 → Tasks。
2. 点击任务卡片打开详情。
3. 点击 **Logs** 按钮查看 `log_text`。
4. 向下滚动查看 `artifact_logs`（stdout/stderr）。

### 通过文件系统

日志文件保存在：
```
backend/data/artifacts/run_{run_id}_{timestamp}/
├── generated_sequences.csv
├── generated.fasta
├── stdout.log
└── stderr.log
```

---

## 7. 如何查看数据库

SQLite 数据库文件：
```
backend/data/ampgen_platform.db
backend/test.db   # 测试数据库
```

**使用 DBeaver / DB Browser for SQLite：**
- 文件类型：SQLite
- 路径：选择上述 `.db` 文件

**使用命令行：**
```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建\backend
sqlite3 data\ampgen_platform.db
sqlite> SELECT * FROM peptide_candidates ORDER BY id DESC LIMIT 5;
sqlite> .quit
```

---

## 8. 如何判断任务是否成功

**成功标志：**
- Task status = `SUCCEEDED`
- GenerationRun status = `SUCCEEDED`
- `completed_at` 字段有值
- `GET /generation-runs/{id}/peptides` 返回 peptides 数组

**失败标志：**
- Task status = `FAILED`
- `error_message` 有值
- `log_text` 或 `stderr.log` 包含 Traceback

---

## 9. 如何处理 BLOCKED

**原因：**
- `LOCAL_REAL_SMOKE` count > 2
- `LOCAL_DEMO` count > 5
- `SERVER_PRODUCTION` 任何请求

**解决：**
1. 减少 count 到允许范围内。
2. 如需更多，考虑分批提交（当前无队列，需手动分批）。
3. `SERVER_PRODUCTION` 尚未接入，只能使用 LOCAL 模式。

---

## 10. 如何取消运行中任务

### 通过前端

1. **Generation 页面**：任务处于 `PENDING` 或 `RUNNING` 时，状态卡片下方会出现 **Cancel Task** 按钮。点击后发送取消请求，继续轮询直到状态变为 `CANCELLED`。
2. **Task Center**：在任务列表或详情抽屉中，点击 `PENDING`/`RUNNING` 任务旁边的 **Cancel** 按钮。

### 通过 API

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/tasks/{task_id}/cancel" -Method POST -UseBasicParsing
```

### 取消机制说明

- **不会强杀 Python thread** — 线程继续运行，但在 `subprocess.Popen` 轮询循环中检查 `cancel_requested` 标志。
- **会先 terminate subprocess** — 发送 SIGTERM，等待 5 秒。
- **超时后 kill** — 如果 5 秒内未退出，发送 SIGKILL。
- **保留 artifact_dir** — 已生成的 stdout/stderr 和文件不删除。
- **最终状态为 CANCELLED** — 不是 FAILED，不是 SUCCEEDED。

### CANCELLED vs FAILED

| | CANCELLED | FAILED |
|---|-----------|--------|
| 原因 | 用户主动取消 | 程序出错 |
| `error_message` | 无 | 有错误详情 |
| `cancel_requested` | `true` | `false` |
| artifact_dir | 保留 | 保留 |

---

## 11. 如何导出报告

### 通过前端 ReportExport 页面

1. 打开 **ReportExport** 页面。
2. 选择 **Generation Run**（下拉菜单显示所有历史 run）。
3. 点击以下按钮导出：
   - **Export All Candidates CSV** — 导出所有肽序列为 CSV（utf-8-sig，兼容 Excel）
   - **Export All Candidates FASTA** — 导出 FASTA 格式
   - **Export Tasks JSON** — 导出任务记录 JSON
   - **Export Run JSON** — 导出所选 run 的完整 JSON 报告
   - **Export Selected Run Markdown Report** — 导出 Markdown 报告

### 通过 API

```powershell
# CSV
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/reports/candidates.csv" -OutFile "candidates.csv"

# FASTA
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/reports/candidates.fasta" -OutFile "candidates.fasta"

# Tasks JSON
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/reports/tasks.json" -OutFile "tasks.json"

# Run JSON (replace {run_id})
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/reports/generation-runs/{run_id}.json" -OutFile "run.json"

# Run Markdown
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/v1/reports/generation-runs/{run_id}.md" -OutFile "run.md"
```

### 导出内容说明

- **CSV**：空分数（`amp_score`, `mic_ecoli`, `mic_saureus`）显示为空单元格，不是 0。
- **FASTA**：跳过空序列，header 包含 id/status/source/length/charge。
- **JSON 报告**：包含 `scientific_boundary` 字段，明确标注计算预测未经验证。
- **Markdown 报告**：包含完整的运行摘要、肽表格、科学边界声明、后续实验验证建议。

---

## 12. 如何备份当前项目

### Git 备份（推荐）

```powershell
cd D:\Desktop\ampg\Kimi_Agent_AMPGen平台搭建
# 已初始化 Git，直接查看当前状态
git status
git log --oneline -n 5
git tag -l
```

### 文件备份

```powershell
# 排除不需要的文件
$exclude = @('.git', 'node_modules', '__pycache__', '.pytest_cache', 'data\artifacts', '*.db', '*.log')
Compress-Archive -Path . -DestinationPath "ampgen_backup_$(Get-Date -Format yyyyMMdd_HHmmss).zip" -Exclude $exclude
```

### 数据库备份

```powershell
Copy-Item backend\data\ampgen_platform.db "ampgen_db_backup_$(Get-Date -Format yyyyMMdd_HHmmss).db"
```

---

## 快速参考卡

| 操作 | 命令 |
|------|------|
| 启动全部 | `.\scripts\start_all.ps1` |
| 停止全部 | `.\scripts\stop_backend.ps1` + `.\scripts\stop_frontend.ps1` |
| 健康检查 | `.\scripts\healthcheck.ps1` |
| Demo 冒烟 | `.\scripts\smoke_local_demo.ps1` |
| Real 冒烟 | `.\scripts\smoke_local_real.ps1` |
| 后端测试 | `cd backend; pytest tests/ -q` |
| 前端构建 | `cd app; npm run build` |
| 查看版本 | `git log --oneline -n 1; git tag -l` |


## v0.5.1-hotfix 数据库修复

如果历史 LOCAL_DEMO 数据包含假分数，运行一次性修复脚本：

`powershell
cd backend
python scripts/fix_demo_fake_scores.py
``n
该脚本会：
1. 自动备份数据库到 ackups/db/。
2. 清空所有 source='local_demo' 的 mp_score、mic_ecoli、mic_saureus、	oxicity_risk、hemolysis_risk。
3. 保留 source='local_real_smoke' 的记录不变。



## Dashboard API 检查

`powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/dashboard/summary' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/dashboard/recent-runs?limit=5' -Method GET
``n
## Peptide Detail API 检查

`powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/peptides/1' -Method GET
``n


## 前端代码分割

v0.5.3 起，所有页面使用 React.lazy 懒加载。

如果页面加载出现白屏，检查网络面板中对应 chunk 是否成功加载。

`powershell
# 生产构建
cd app
npm run build
# 检查 dist/assets/ 下的 chunk 分布
Get-ChildItem dist/assets -Filter *.js | Select-Object Name, @{N='SizeKB';E={[math]::Round(.Length/1KB,1)}}
``n

## Artifacts API 检查 (v0.5.4)

```powershell
# 获取 artifacts
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/generation-runs/1/artifacts' -Method GET

# 预期 LOCAL_DEMO：
# { artifact_dir: null, files: [], message: "No artifacts directory configured..." }

# 预期 LOCAL_REAL_SMOKE（成功后）：
# { artifact_dir: "...", files: [{name:"stdout.log",...}, ...], message: "Found N files." }
```

## Workflow 页面检查 (v0.5.4)

```powershell
# 打开前端后访问
Start-Process "http://localhost:3000/#/ampgen-workflow"

# 确认显示：
# - 三档运行模式卡片
# - 9 步工作流流程
# - 系统状态区（backend online, AMPGen components, DB stats）
```

## Run Detail 页面检查 (v0.5.4)

```powershell
# 从前端 Generation 页面创建 run 后点击 "View Run Detail"
# 或直接访问
Start-Process "http://localhost:3000/#/generation-runs/1"

# 确认显示：
# - Run Summary 卡片
# - Visual Timeline
# - Task Status 卡片
# - Logs 区域（可折叠）
# - Artifacts 区域
# - Generated Peptides 表格
# - 快捷按钮（Back to Generation, Candidate Library, Task Center, Copy FASTA）
```

## Cross-page 导航检查 (v0.5.4)

| 起始页面 | 操作 | 目标页面 |
|---------|------|---------|
| Generation | "View Run Detail" | `/generation-runs/:id` |
| TaskCenter | 外部链接图标 (AMP Generation 任务) | `/generation-runs/:id` |
| CandidateLibrary | "View Source Run" | `/generation-runs/:id` |

## Peptide Analytics 检查 (v0.5.5)

```powershell
# 访问 Peptide Analytics 页面
Start-Process "http://localhost:3000/#/peptide-analytics"

# 检查 analytics API
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/peptides-summary' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/property-distributions' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/amino-acid-composition' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/status-source-breakdown' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/filter-rule-pass-rate' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/analytics/top-candidates?limit=5' -Method GET

# Smoke test
.\scripts\smoke_peptide_analytics.ps1
```

## Analytics 页面验收点

1. Summary cards 显示真实数据
2. 三个分布图（length, charge, hydrophobic）有 recharts bar chart
3. 氨基酸组成有 20 个柱状条
4. Status / Source 有 pie chart
5. Filter rule pass rate 有四条进度条
6. Top candidates 表格有 rule_based_rank
7. 点击 candidate 弹出 drawer
8. 所有 score 列显示 Not computed
9. 页面顶部有 "Rule-based ranking only. Not a model prediction." 说明


## Sequence Explorer 检查 (v0.5.7)

```powershell
# 访问 Sequence Explorer 页面
Start-Process "http://localhost:3000/#/sequence-explorer"

# 检查 sequence-explorer API
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/sequence-explorer/overview' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/sequence-explorer/duplicates' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/sequence-explorer/similarity?threshold=0.8&limit=20' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/sequence-explorer/motif-enrichment' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/sequence-explorer/representatives?limit=5' -Method GET

# Smoke test
.\scripts\smoke_sequence_explorer.ps1
```

## Sequence Explorer 页面验收点

1. Overview cards 显示 total/unique sequences, duplicate groups, avg/min/max length
2. Duplicate Groups 表格显示完全重复的序列、count、peptide IDs、sources、statuses
3. Similarity Explorer 可调整 threshold 和 limit，显示相似序列对和 similarity 值
4. Motif Statistics 显示 N-terminal / C-terminal 频率、top dipeptides、top amino acids
5. Representatives 表格显示 rule-based rank、sequence、reason
6. 所有区域均有科学边界提示
7. 页面底部有快捷跳转到 CandidateLibrary / PeptideAnalytics / RunComparison


## Candidate Review Workbench 检查 (v0.5.8)

```powershell
# 访问 Candidate Review Workbench 页面
Start-Process "http://localhost:3000/#/candidate-review"

# 检查 candidate-review API
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/candidate-review/summary' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/candidate-review/candidates?limit=5' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/candidate-review/shortlist' -Method GET

# Smoke test
.\scripts\smoke_candidate_review.ps1
```

## Candidate Review 页面验收点

1. Summary cards 显示 total / unreviewed / shortlisted / selected / high priority / rejected
2. Filter panel 支持 status / source / review_status / priority / length / charge / hydrophobic 筛选
3. Evidence cards 显示 length / charge / hydrophobic / valid-AA pass-fail badges
4. Recommendation badge 显示 SHORTLIST_CANDIDATE / REVIEW / LOW_PRIORITY
5. Single actions: Shortlist, Reject, High Priority, Select for Synthesis
6. Batch actions: multi-select + batch review
7. Shortlist panel 显示已 shortlist 的肽，支持 CSV / FASTA / Synthesis Order 导出
8. 所有 score 列显示 Not computed
9. 科学边界横幅和标签完整


## Local Maintenance 检查 (v0.5.9)

```powershell
# 访问 Local Maintenance 页面
Start-Process "http://localhost:3000/#/maintenance"

# 检查 maintenance API
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/maintenance/storage-summary' -Method GET
Invoke-RestMethod -Uri 'http://127.0.0.1:8001/api/v1/maintenance/backups' -Method GET

# Smoke test
.\scripts\smoke_maintenance.ps1

# 创建项目快照
.\scripts\backup_project_snapshot.ps1
```

## Local Maintenance 页面验收点

1. Storage Summary 显示真实的 database size / artifacts size / backup count
2. Backup Database 生成 timestamped `.db` 文件
3. Backup Artifacts 生成 zip 文件
4. Create Project Snapshot 生成包含 manifest 的 zip
5. Backup List 可刷新并显示所有备份
6. Restore Database 必须输入 RESTORE 才能执行
7. Cleanup Artifacts 默认 Dry Run，不删除文件
8. Reset Demo Data 必须输入 RESET DEMO，默认不删除 LOCAL_REAL_SMOKE 和 review 数据
9. 后端不可用时显示明确提示
