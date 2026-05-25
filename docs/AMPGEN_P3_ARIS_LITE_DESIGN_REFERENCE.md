结论：**你的 AMPG 最适合做一个“ARIS-Lite 多 Agent 验证挑错后端”**。
先不要追求完全复刻 ARIS，而是在 AMPGen-Web 后端加一个 **“生成 → 规则验证 → 对抗审查 → 仲裁 → 证据留痕”** 工作流。

ARIS 的核心不是多个模型聊天，而是：**执行模型负责推进，另一个不同模型/角色负责挑错，并且所有结论必须回到证据链验证**。ARIS 论文明确强调，长期研究任务最大的风险不是明显失败，而是“看起来成功但证据不支持”的结果；它采用跨模型 executor/reviewer 配置，并用实验完整性审计、结果到结论映射、论文/声明审计构成保证层。([arXiv][1]) GitHub 版 ARIS 也强调轻量化：用 Markdown skill、跨模型 review loop，不绑定某个框架，可适配 Claude Code、Codex、Kimi、DeepSeek 等。([GitHub][2])

---

## 一、放到你的 AMPG 里，应该怎么实现？

你现在的 AMPG 项目路径是：

```powershell
D:\Desktop\ampg\ampgen-web
```

WSL 对应路径：

```bash
/mnt/d/Desktop/ampg/ampgen-web
```

你现在本机只能真实运行 1、2 条 EvoDiff 生成，所以这个系统不要设计成“全自动大规模生产平台”，而是先做：

> **AMPGen 多 Agent 质控与证据审计系统**

也就是每次生成候选 AMP 后，不直接说“这是有效抗菌肽”，而是自动进入多轮验证：

```text
AMPGen 生成候选序列
        ↓
规则验证 Agent：长度、电荷、疏水性、非法氨基酸、重复序列
        ↓
生物学挑错 Agent：是否像 AMP？是否可能溶血？是否过度疏水？
        ↓
工程挑错 Agent：模型是否真跑？是否 mock？路径是否正确？日志是否完整？
        ↓
证据审计 Agent：哪些结论有证据？哪些只是推测？
        ↓
仲裁 Agent：PASS / REVISE / BLOCKED / NEEDS_SERVER
        ↓
前端展示：候选序列 + 质控意见 + 证据链 + 科学边界
```

---

## 二、AMPG 里建议设置 5 个 Agent 角色

| Agent              | 作用                       | 对应你现有工具                       |
| ------------------ | ------------------------ | ----------------------------- |
| Generator Agent    | 调用 AMPGen/EvoDiff 生成候选序列 | 本机 Flask 后端 / KimiCode        |
| Rule Validator     | 程序化验证长度、电荷、疏水性、非法 AA     | 后端 Python 函数，必须 deterministic |
| Biology Critic     | 从 AMP 生物学角度挑错            | Claude Code / Kimi / GPT      |
| Engineering Critic | 检查运行日志、路径、是否 mock、是否真的执行 | DeepSeek-TUI / KimiCode       |
| Evidence Arbiter   | 汇总证据，决定是否通过              | Hermes / 后端仲裁函数               |

你要注意：**真正可靠的部分必须是规则验证和证据仲裁，不要把所有判断都交给 LLM。**

LLM 可以挑错，但最终状态必须由后端规则决定。

---

## 三、AMPG 的“对抗式验证”最小可落地版本

### 1. 新增后端数据结构

建议在 AMPG 后端新增这些 JSON/SQLite 表：

```text
agent_runs
- run_id
- mode: local_demo / server_production
- generator: evodiff_msa / evodiff_seq / csv_import
- created_at
- status

candidate_sequences
- candidate_id
- run_id
- sequence
- length
- charge
- hydrophobicity
- invalid_aa
- source
- status

validation_reports
- report_id
- candidate_id
- validator_type: rule / biology_critic / engineering_critic / evidence_audit / arbiter
- verdict: PASS / WARN / FAIL / BLOCKED
- findings
- evidence_files
- created_at

claim_ledger
- claim_id
- candidate_id
- claim_text
- claim_type: generation / amp_likeness / mic_prediction / toxicity / synthesis_priority
- support_level: DIRECT_EVIDENCE / INDIRECT_EVIDENCE / UNSUPPORTED / MOCK_ONLY
- evidence_path
```

这个 `claim_ledger` 很关键。
它对应 ARIS 的核心思想：**每一句科研结论都必须能追溯到证据。**

---

### 2. 给候选肽加四级状态

```text
PASS
规则合格，有真实生成记录，有基础证据，可以进入候选库。

REVISE
序列存在风险，比如疏水性偏高、电荷不足、长度边界异常，需要重新筛选。

BLOCKED
缺少真实模型、日志、证据文件，不能继续声称结果可靠。

NEEDS_SERVER
本机只能 demo，真实大规模生成、XGBoost、LSTM MIC、ESM embedding 需要服务器运行。
```

这很适合你现在的情况：**本机跑 1–5 条真实生成，100 条以上拒绝或标记 NEEDS_SERVER。**

---

## 四、在 AMPG 前端怎么展示？

建议在你现有 AMPGen-Web 页面里新增一个模块：

```text
Adversarial Validation / 对抗式多 Agent 质控
```

每条候选肽展示：

| 字段                 | 示例                                                      |
| ------------------ | ------------------------------------------------------- |
| Sequence           | KWKLFKKIGAVLKVL                                         |
| Rule Check         | PASS                                                    |
| Biology Critic     | WARN: 疏水比例偏高，需关注溶血风险                                    |
| Engineering Critic | PASS: EvoDiff local demo log found                      |
| Evidence Audit     | DIRECT_EVIDENCE: 来自 local run log + computed properties |
| Final Verdict      | REVISE                                                  |
| Next Action        | 加入候选库 / 重新生成 / 等服务器生产模式                                 |

前端展示重点不是“AI 很厉害”，而是：

> **这个候选肽为什么通过、哪里有风险、哪些结论有证据、哪些不能夸大。**

这对后面软著、论文方法图、平台展示都很有价值。

---

## 五、你 AMPG 的最佳落地路线

| 阶段   | 目标                                                   | 是否现在做    |
| ---- | ---------------------------------------------------- | -------- |
| P4-1 | 后端加入 Rule Validator                                  | 必须做      |
| P4-2 | 后端加入 Evidence Ledger                                 | 必须做      |
| P4-3 | 前端展示多 Agent 质控结果                                     | 必须做      |
| P4-4 | LLM Biology Critic / Engineering Critic 先用 prompt 模拟 | 可以做      |
| P4-5 | 接 Hermes/Kimi/Claude 真正多 Agent 调度                    | 后面做      |
| P4-6 | 服务器生产模式跑 1000–10000 条真实生成                            | 等服务器连接后做 |

我建议你把这个版本命名为：

```text
AMPGen-Web P4: ARIS-Lite Adversarial Validation Workflow
```

中文名：

```text
AMPGen-Web P4：对抗式多 Agent 候选肽验证与证据审计系统
```

---

# 直接发给 KimiCode 的任务单

下面这段可以直接复制给 KimiCode。

```text
先不要直接修改，先做当前仓库状态对账。

正式仓库路径：
Windows: D:\Desktop\ampg\ampgen-web
WSL: /mnt/d/Desktop/ampg/ampgen-web

任务名称：
AMPGen-Web P4：ARIS-Lite 对抗式多 Agent 候选肽验证与证据审计系统

一、任务目标

在现有 AMPGen-Web Local Demo Mode + Candidate Library 基础上，新增一个轻量版 ARIS-Lite 多 Agent 验证挑错工作流。

核心目标不是接入真正的大模型多 Agent，而是先在后端实现：
1. AMP 候选序列规则验证；
2. 对抗式审查结果结构；
3. 证据链 claim ledger；
4. 仲裁 verdict；
5. 前端展示每条候选肽的多 Agent 验证结果。

要求保持科学边界：
- 本机 Local Demo 只能真实小规模 EvoDiff 生成 1/3/5 条；
- 不得伪造 XGBoost、LSTM MIC、ESM embedding、服务器生产结果；
- 缺少证据的结论必须标记为 UNSUPPORTED / MOCK_ONLY / NEEDS_SERVER；
- 不允许把 demo 结果包装成真实生产筛选结果。

二、当前背景

当前项目路径：
Windows: D:\Desktop\ampg\ampgen-web
WSL: /mnt/d/Desktop/ampg/ampgen-web

当前已完成：
1. Local Demo Mode MVP；
2. 1/3/5 条 CPU-only 真实 EvoDiff 生成；
3. 100 条任务 HTTP 403 拒绝；
4. Pretrained 10K CSV 读取；
5. AMP Filter；
6. Candidate Library；
7. CSV/FASTA/合成订单模板/JSON 导入导出；
8. P3 release seal，tag 为 v0.2-local-candidate-library。

本次 P4 目标：
在不破坏现有功能的前提下，新增 ARIS-Lite 对抗式多 Agent 验证模块。

三、开始前必须先输出对账信息

请先在项目根目录执行并输出：

PowerShell:
cd "D:\Desktop\ampg\ampgen-web"
git status
git log --oneline -5
Get-ChildItem
Get-ChildItem .\templates
Get-ChildItem .\static\js
Get-ChildItem .\static\css
Get-Content .\app.py -TotalCount 80

同时检查：
1. 当前 Flask 启动入口是不是 app.py；
2. 当前前端主页面是不是 templates/index.html；
3. 当前主 JS 文件是不是 static/js/app.js；
4. 当前候选库 localStorage key 是什么；
5. 当前 1/3/5 条生成接口 endpoint 是什么；
6. 当前 100 条拒绝逻辑在哪里；
7. 当前 P2/P3 acceptance tests 是否存在。

对账完成后再修改。

四、执行范围

允许修改：
- app.py
- templates/index.html
- static/js/app.js
- static/css/style.css
- tests/ 新增 P4 测试文件
- docs/ 新增 P4 文档
- README.md / VERSION.md / CHANGELOG.md 可追加 P4 内容

禁止修改或破坏：
- 现有 Local Demo 1/3/5 条真实生成逻辑
- 100 条拒绝逻辑
- Pretrained 10K 读取逻辑
- Candidate Library 导入导出逻辑
- P2/P3 既有验收测试

五、具体步骤

步骤 1：新增后端规则验证函数

在 app.py 或合适位置新增函数：

validate_amp_candidate(sequence: str) -> dict

规则：
- length: 序列长度
- valid_length: 15 <= length <= 35
- invalid_aa: 是否包含 U/O/B/Z/J/X 或非标准氨基酸
- charge: K + R + H - D - E
- valid_charge: charge > 0
- hydrophobicity: A/V/I/L/M/F/W/Y/C 占比
- valid_hydrophobicity: 0.40 <= hydrophobicity <= 0.70
- duplicate_warning: 是否为低复杂度或明显重复序列
- rule_verdict: PASS / WARN / FAIL

注意：
不得调用不存在的真实模型；
不得伪造 MIC、溶血、毒性、XGBoost 分数。

步骤 2：新增 ARIS-Lite 审查结构

新增函数：

build_adversarial_review(candidate: dict, run_context: dict) -> dict

返回结构包括：

{
  "candidate_id": "...",
  "sequence": "...",
  "rule_validator": {
    "agent": "Rule Validator",
    "verdict": "PASS/WARN/FAIL",
    "findings": []
  },
  "biology_critic": {
    "agent": "Biology Critic",
    "verdict": "PASS/WARN/FAIL",
    "findings": []
  },
  "engineering_critic": {
    "agent": "Engineering Critic",
    "verdict": "PASS/WARN/FAIL/BLOCKED",
    "findings": []
  },
  "evidence_auditor": {
    "agent": "Evidence Auditor",
    "verdict": "DIRECT_EVIDENCE/INDIRECT_EVIDENCE/MOCK_ONLY/UNSUPPORTED",
    "findings": []
  },
  "arbiter": {
    "agent": "Evidence Arbiter",
    "final_verdict": "PASS/REVISE/BLOCKED/NEEDS_SERVER",
    "next_action": "...",
    "reason": "..."
  }
}

其中：
- biology_critic 先用规则模拟，不接外部 LLM；
- engineering_critic 检查是否 local_demo、是否有 run_id、是否为真实 EvoDiff 1/3/5 生成；
- evidence_auditor 判断哪些证据是真实的，哪些只是 demo/mock；
- arbiter 根据前面结果给最终 verdict。

步骤 3：新增 API endpoint

新增接口：

POST /api/adversarial-validate

输入：
{
  "sequence": "KWKLFKKIGAVLKVL",
  "source": "local_demo/generated/csv_import/candidate_library",
  "run_id": "optional",
  "mode": "local_demo"
}

输出：
完整 adversarial review JSON。

新增接口：

POST /api/adversarial-validate-batch

输入：
{
  "candidates": [
    {"sequence": "...", "source": "..."}
  ],
  "mode": "local_demo"
}

输出：
{
  "count": 3,
  "reviews": [...]
}

步骤 4：前端新增模块

在 templates/index.html 和 static/js/app.js 中新增：

模块标题：
Adversarial Validation / 对抗式多 Agent 质控

功能：
1. 输入单条 sequence，点击 Run Validation；
2. 对 Candidate Library 中 Top N 执行批量验证；
3. 每条候选肽展示：
   - Rule Validator
   - Biology Critic
   - Engineering Critic
   - Evidence Auditor
   - Final Arbiter
4. 用明显标签显示：
   - PASS
   - REVISE
   - BLOCKED
   - NEEDS_SERVER
5. 显示科学边界：
   “当前结果仅为本地小规模 demo 和规则审查，不代表实验验证结果；MIC、毒性、溶血、体内效果需要后续真实模型或实验验证。”

步骤 5：新增 Claim Ledger 展示

每条候选肽生成 claim ledger：

示例：
[
  {
    "claim": "This sequence was generated by local EvoDiff demo.",
    "support_level": "DIRECT_EVIDENCE",
    "evidence": "run_id/log if available"
  },
  {
    "claim": "This sequence passes basic AMP physicochemical filters.",
    "support_level": "DIRECT_EVIDENCE",
    "evidence": "computed length/charge/hydrophobicity"
  },
  {
    "claim": "This sequence has low MIC.",
    "support_level": "UNSUPPORTED",
    "evidence": "MIC model not executed in local demo"
  },
  {
    "claim": "This sequence is experimentally validated.",
    "support_level": "UNSUPPORTED",
    "evidence": "No wet-lab result"
  }
]

前端要展示这个 claim ledger。

步骤 6：新增测试

新增：
tests/p4_adversarial_validation_test.py

测试内容：
1. 合格序列返回 PASS 或 REVISE；
2. 长度过短返回 FAIL/BLOCKED/REVISE；
3. 含 X/U/O/B/Z/J 返回 FAIL；
4. 电荷 <=0 返回 FAIL 或 REVISE；
5. 疏水性过低/过高返回 WARN 或 FAIL；
6. MIC claim 必须是 UNSUPPORTED 或 MOCK_ONLY；
7. experimental validation claim 必须是 UNSUPPORTED；
8. /api/adversarial-validate 返回 200；
9. /api/adversarial-validate-batch 返回 count 和 reviews；
10. 不破坏现有 P2/P3 acceptance tests。

步骤 7：文档

新增：
docs/AMPGEN_ARIS_LITE_ADVERSARIAL_VALIDATION.md

内容包括：
1. 为什么需要多 Agent 验证；
2. AMPG 中的 5 个 Agent 角色；
3. 规则验证标准；
4. evidence ledger；
5. final verdict 解释；
6. 科学边界；
7. 后续如何接服务器生产模式；
8. 后续如何接 Hermes/Kimi/Claude/DeepSeek 真正多 Agent 审查。

更新：
README.md
CHANGELOG.md
VERSION.md

版本建议：
v0.3-aris-lite-adversarial-validation

六、验收标准

必须满足：

1. Flask 能正常启动：
PowerShell:
cd "D:\Desktop\ampg\ampgen-web"
.venv\Scripts\python app.py

2. 浏览器能访问：
http://127.0.0.1:5050

3. 原有功能不坏：
- Local Demo 1/3/5 条仍可用；
- 100 条仍拒绝；
- Candidate Library 仍可导入导出；
- Pretrained 10K 仍可读取。

4. 新接口可用：
POST /api/adversarial-validate
POST /api/adversarial-validate-batch

5. 前端能看到：
Adversarial Validation / 对抗式多 Agent 质控模块。

6. 对以下序列测试结果合理：
- KWKLFKKIGAVLKVL：应通过多数基础规则；
- AAAAAAAA：长度过短，不能 PASS；
- KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK：长度过长，不能 PASS；
- KWKXFKKIGAVLKVL：含 X，必须 FAIL；
- DDDDDDDDDDDDDDDDD：负电荷，不能 PASS。

7. 科学边界必须明确：
- 不得输出“实验验证有效”；
- 不得输出真实 MIC 预测，除非真实模型已运行；
- 不得输出真实毒性/溶血结论；
- 不得伪造服务器生产模式结果。

8. 测试通过：
PowerShell:
cd "D:\Desktop\ampg\ampgen-web"
.venv\Scripts\python -m pytest tests -q

七、最终输出要求

请输出最终报告，保存到：

D:\ai\product\kimi\agent-bridge\reports\AMPGEN_WEB_P4_ARIS_LITE_ADVERSARIAL_VALIDATION_REPORT.md

报告必须包含：
1. 修改文件清单；
2. 新增 API 清单；
3. 新增前端模块说明；
4. 测试结果；
5. 示例输入和输出；
6. 科学边界说明；
7. 后续接入 Hermes/Kimi/Claude/DeepSeek 多 Agent 的建议；
8. 是否建议打 tag：v0.3-aris-lite-adversarial-validation。
```

---

## 六、后续真正接入你本地 Agent 系统时怎么分工？

等 P4 后端结构稳定后，再接你现有 Agent：

| 角色           | 任务                             |
| ------------ | ------------------------------ |
| KimiCode     | 主施工：写 Flask API、前端模块、测试        |
| DeepSeek-TUI | 跑 pytest、检查接口、检查日志             |
| Claude Code  | 审查架构和科学边界，专门挑错                 |
| Hermes       | 总控：汇总 reviewer 结果，生成最终报告       |
| 服务器 stamp218 | 后续跑真实 1000–10000 条 AMPGen 生产任务 |

你这个 AMPG 项目最应该借鉴 ARIS 的地方是：

> **每一个候选肽，不只给结果，还要给“为什么通过、谁挑过错、证据在哪里、哪些结论不能说”。**

这样 AMPG 就从一个普通生成网页，升级成了一个真正有科研质控逻辑的 **AI Agent 抗菌肽筛选工作流平台**。

[1]: https://arxiv.org/html/2605.03042v1 "ARIS: Autonomous Research via Adversarial Multi-Agent Collaboration"
[2]: https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep "GitHub - wanshuiyin/Auto-claude-code-research-in-sleep: ARIS ⚔️ (Auto-Research-In-Sleep) — Lightweight Markdown-only skills for autonomous ML research: cross-model review loops, idea discovery, and experiment automation. No framework, no lock-in — works with Claude Code, Codex, OpenClaw, or any LLM agent. · GitHub"
