# AMPGen Agent Platform — 5-Minute Demo Guide

## 前置条件

```powershell
# 一键启动后端 + 前端
.\scripts\start_all.ps1
```

等待 3–5 秒，然后打开浏览器访问 `http://localhost:3000`。

---

## 演示流程（约 5–8 分钟）

### 1. Dashboard（30 秒）

打开首页 Dashboard，展示：
- 平台概览卡片（候选肽数量、任务数量等）
- 生成模式选择
- 快速统计信息

### 2. LOCAL_DEMO 快速生成（2 分钟）

1. 点击左侧菜单 **Generation**。
2. 选择 **Generation Mode**: `Sequence-based`。
3. 选择 **Backend**: `LOCAL_DEMO`。
4. 设置 **Count**: `2`。
5. 点击 **Generate**。

**预期结果**：
- POST 立即返回，状态变为 `PENDING` → `RUNNING` → `SUCCEEDED`（约 2–3 秒）。
- 进度条显示 `100%`。
- 输出预览区显示 2 条生成序列。
- 点击 **查看候选肽库** 跳转。

### 3. Candidate Library（1 分钟）

1. 在 Generation 成功页面点击 **查看候选肽库**，或从左侧菜单进入 **Candidates**。
2. 展示刚生成的 2 条肽序列。
3. 注意：
   - `AMP Score` 显示为计算值（demo 启发式公式）。
   - `MIC` 显示为计算值。
4. 点击刷新按钮验证数据来自真实 API。

### 4. Task Center（1 分钟）

1. 从左侧菜单进入 **Tasks**。
2. 找到刚完成的 LOCAL_DEMO 任务，状态为 `SUCCEEDED`。
3. 点击任务卡片，打开详情抽屉。
4. 点击 **Logs** 按钮：
   - 如果 log_text 为空，显示 "No logs available"。
   - 展示真实任务信息（message, backend, count）。

### 5. LOCAL_REAL_SMOKE 真实生成（3–4 分钟）

1. 回到 **Generation** 页面。
2. 选择 **Backend**: `LOCAL_REAL_SMOKE`。
3. 设置 **Count**: `1`。
4. 点击 **Generate**。

**预期结果**：
- POST 立即返回 `PENDING`（< 200ms）。
- 状态变为 `RUNNING`，显示黄色警告横幅：
  > 本机正在真实调用 AMPGen，预计 45–60 秒，请勿重复点击。
- 进度条显示 `0%`，计时器开始计数。
- 实时日志面板显示后台进程输出（可能为空直到有输出）。
- 约 40 秒后，状态变为 `SUCCEEDED`。
- 输出预览区显示 1 条真实生成的肽序列。

### 6. 验证科学边界（1 分钟）

1. 点击 **查看候选肽库**。
2. 找到刚生成的 LOCAL_REAL_SMOKE 肽（source = `local_real_smoke`）。
3. **关键展示点**：
   - `AMP Score` 显示为 **"Not computed"**（`amp_score=null`）。
   - `MIC E.coli` 和 `MIC S.aureus` 显示为 **"Not computed"**。
4. 向观众解释：
   > "这是真实模型生成的序列，但 AMP score 和 MIC 值没有接真实模型，所以我们不伪造数据。"

### 7. Task Center 查看真实日志（1 分钟）

1. 进入 **Tasks**，找到 LOCAL_REAL_SMOKE 任务。
2. 打开详情，点击 **Logs**。
3. 向下滚动查看 **artifact_logs**：
   - `stdout.log`: 显示 CSV 保存路径。
   - `stderr.log`: 显示 evodiff 的 tqdm 进度条输出。
4. 展示 `artifact_dir` 路径，说明日志文件保存在本地磁盘。

### 8. BLOCKED 演示（30 秒）

1. 回到 **Generation**。
2. 选择 `LOCAL_REAL_SMOKE`，设置 Count = `3`（超过限制 2）。
3. 点击 **Generate**。
4. **预期结果**：立即显示红色 BLOCKED 状态，提示 "Count exceeds LOCAL_REAL_SMOKE max limit of 2"。

---

## 演示结束

关闭浏览器，执行：

```powershell
.\scripts\stop_backend.ps1
.\scripts\stop_frontend.ps1
```

或直接在 PowerShell 窗口中按 `Ctrl+C`。

---

## 演示要点总结

| 要点 | 话术 |
|------|------|
| 异步非阻塞 | "POST 立即返回，不卡页面，后台线程慢慢跑。" |
| 实时反馈 | "每 3 秒轮询一次，进度条、计时、日志实时更新。" |
| 科学边界 | "真实模型生成序列，但不伪造 score 和 MIC。" |
| 三层架构 | "Demo 模式快速验证，Real Smoke 真实调用，Production 还没接。" |
| 日志可追溯 | "stdout/stderr 全部落盘，artifact_dir 可以查看。" |
