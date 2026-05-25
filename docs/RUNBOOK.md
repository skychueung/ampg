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

## 11. 如何备份当前项目

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
