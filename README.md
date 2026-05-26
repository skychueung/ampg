# AMPGen Agent Platform

AMPGen Agent Platform 是一个 AMPGen 可视化 Agent 工作流平台，用于抗菌肽（AMP）的 AI 生成、筛选、评估与管理。

## 当前版本能力

| 能力 | 状态 |
|------|------|
| React + Vite + TypeScript 前端 | ✅ |
| FastAPI + SQLAlchemy + SQLite 后端 | ✅ |
| Candidate Library 真实 API 联动 | ✅ |
| Task Center 真实 API 联动 | ✅ |
| Generation 真实 API 联动 | ✅ |
| LOCAL_DEMO（≤5，内存快速生成） | ✅ |
| LOCAL_REAL_SMOKE（≤2，真实 AMPGen 调用） | ✅ |
| SERVER_PRODUCTION（BLOCKED） | ✅ |
| 异步任务（threading.Thread 后台执行） | ✅ |
| 前端轮询（3s 间隔，实时状态更新） | ✅ |
| 进度条 + 计时器 + 实时日志 | ✅ |
| stdout/stderr 日志捕获与展示 | ✅ |
| 安全任务取消（cancel_requested + PID 管理） | ✅ |
| 报告导出中心（CSV / FASTA / JSON / Markdown） | ✅ |
| Generation Run JSON/Markdown 报告 | ✅ |
| ARIS-Lite 四角色审查协议 | ✅（设计参考） |

## 技术栈

- **前端**：React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **后端**：FastAPI, SQLAlchemy, SQLite, Uvicorn
- **生成引擎**：AMPGen（本地 evodiff，CPU 模式）
- **测试**：pytest, TestClient

## 启动方式

### 方式一：一键启动（推荐）

```powershell
# 在项目根目录
.\scripts\start_all.ps1
```

这将打开两个 PowerShell 窗口：
- 后端：`http://127.0.0.1:8001`
- 前端：`http://localhost:3000`

### 方式二：手动启动

```powershell
# 终端 1：启动后端
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# 终端 2：启动前端
cd app
npm run dev
```

### 方式三：健康检查

```powershell
.\scripts\healthcheck.ps1
```

## 当前限制

| 限制 | 说明 |
|------|------|
| LOCAL_REAL_SMOKE count ≤ 2 | 本机资源限制，超过即 BLOCKED |
| 未接远程服务器 | SERVER_PRODUCTION 始终 BLOCKED |
| 未接 XGBoost AMP discriminator | `amp_score` 在 LOCAL_REAL_SMOKE 中为空 |
| 未接 MIC scorer | `mic_ecoli`, `mic_saureus` 为空 |
| 未做完整 ARIS 多 Agent 后端系统 | 四角色审查目前为设计参考 |
| 不伪造模型分数 | Demo 模式仅使用启发式公式，不冒充模型输出 |
| 取消非即时 | 取消请求发送后，runner 在下一个检查点终止，不是瞬间停止 |

## 项目结构

```
.
├── app/                    # React 前端
│   ├── src/
│   │   ├── api/           # API 客户端
│   │   ├── pages/         # 页面组件
│   │   └── ...
│   └── package.json
├── backend/               # FastAPI 后端
│   ├── app/
│   │   ├── routers/       # API 路由
│   │   ├── runners/       # 后台任务执行器
│   │   ├── models/        # SQLAlchemy 模型
│   │   └── services/      # 业务服务
│   ├── tests/             # pytest 测试
│   └── requirements.txt
├── scripts/               # 启动/停止/检查脚本
├── docs/                  # 技术文档
├── README.md              # 本文件
├── VERSION.md             # 版本说明
├── CHANGELOG.md           # 变更日志
└── DEMO_GUIDE.md          # 演示指南
```

## 版本

当前版本：**v0.3-local-real-async**

详见 [VERSION.md](./VERSION.md) 和 [CHANGELOG.md](./CHANGELOG.md)。

## 科学边界声明

本平台所有计算预测结果均未经实验验证。生成的候选肽序列需要后续体外实验（MIC、溶血性、细胞毒性等）验证才能得出抗菌活性结论。

详见 [docs/SCIENTIFIC_BOUNDARY.md](./docs/SCIENTIFIC_BOUNDARY.md)。

## 许可证

内部使用。实验数据不得作为临床或商业决策依据。


## v0.5.1-hotfix (2026-05-26)

- LOCAL_DEMO no longer writes fake mp_score, mic_ecoli, mic_saureus, 	oxicity_risk, or hemolysis_risk.
- Historical fake demo scores have been cleared from the SQLite database.
- All null scores display as **Not computed** in the UI and remain empty in CSV exports.
- See docs/SCIENTIFIC_BOUNDARY.md for details.

