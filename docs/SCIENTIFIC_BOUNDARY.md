# AMPGen Agent Platform — Scientific Boundary

## 1. LOCAL_REAL_SMOKE 的真实含义

`LOCAL_REAL_SMOKE` 模式通过 subprocess 真实调用本地 AMPGen/evodiff 模型生成肽序列。这表示：

- ✅ 序列来自真实的蛋白质语言模型（PLM）采样。
- ❌ **不代表实验验证**。生成的序列未经过体外或体内抗菌活性测试。
- ❌ **不代表临床可用性**。未经过毒性、免疫原性、稳定性等评估。

## 2. amp_score / MIC 的空值策略

| 字段 | LOCAL_DEMO | LOCAL_REAL_SMOKE | SERVER_PRODUCTION |
|------|-----------|------------------|-------------------|
| `amp_score` | **null**（v0.5.1-hotfix 后） | **null** | 未来接 XGBoost |
| `mic_ecoli` | **null**（v0.5.1-hotfix 后） | **null** | 未来接 MIC scorer |
| `mic_saureus` | **null**（v0.5.1-hotfix 后） | **null** | 未来接 MIC scorer |
| `toxicity_risk` | **null**（v0.5.1-hotfix 后） | **null** | 未来接毒性预测模型 |
| `hemolysis_risk` | **null**（v0.5.1-hotfix 后） | **null** | 未来接溶血预测模型 |

### 为什么必须为空？

1. **科学诚信**：未接真实预测模型时，不能生成看似真实的数字。
2. **防止误用**：空值迫使用户意识到这些指标尚未计算。
3. **法规合规**：计算生物学工具应避免输出可能被误解为实验数据的数值。

### 为什么 LOCAL_DEMO 分数必须为空？

在 v0.5.1-hotfix 之前，LOCAL_DEMO 曾使用基于电荷、疏水性的启发式公式生成假 `amp_score` 和假 `mic_ecoli` / `mic_saureus`。这些假值：
- 容易被误解为真实模型预测结果。
- 违反科学诚信原则。
- 可能导致用户基于假数据做出错误实验决策。

v0.5.1-hotfix 已彻底移除这些假值：
- LOCAL_DEMO 的 `amp_score`、`mic_ecoli`、`mic_saureus`、`toxicity_risk`、`hemolysis_risk` 全部写入 `NULL`。
- 历史数据库中的假分数已通过一次性修复脚本清空。
- 前端显示为空时统一标注 **"Not computed"**，不显示 0。

## 3. Demo 结果 ≠ 实验数据

- Demo 模式生成的序列是随机或半随机的，不经过真实模型。
- 即使是 LOCAL_REAL_SMOKE，也只有序列生成是真实的，后续评分全部缺失。
- **任何候选肽在用于实验前，都必须经过独立验证。**

## 4. 计算结果 ≠ 抗菌活性结论

平台的计算结果包括：
- 序列生成（PLM 采样）
- 理化性质计算（长度、电荷、疏水性）
- 未来可能包括：AMP 预测、MIC 预测、毒性预测

这些结果：
- 是**筛选工具**，不是**结论**。
- 必须配合湿实验（MIC 测定、溶血实验、细胞毒性实验）。
- 受模型训练数据偏差、采样随机性、参数选择影响。

## 5. 实验验证要求

所有通过本平台生成的候选肽，在用于任何研究或应用前，应完成以下最低验证：

| 验证项 | 方法 |
|--------|------|
| 抗菌活性 | MIC 测定（E. coli, S. aureus, P. aeruginosa 等） |
| 选择性 | 溶血实验（人红细胞） |
| 安全性 | 哺乳动物细胞毒性（如 HaCaT, HEK293） |
| 稳定性 | 蛋白酶降解实验、血清稳定性 |
| 结构 | CD 光谱或 NMR（如需要） |

## 6. 免责声明

所有 API 响应均包含：

> "Computational prediction only. Not experimentally validated."

用户必须理解并同意：
- 本平台输出仅供计算筛选参考。
- 不构成医疗、临床或商业建议。
- 使用本平台输出导致的任何后果由使用者自行承担。

## 7. 取消任务不产生伪造结果

当用户取消运行中的 `LOCAL_REAL_SMOKE` 任务时：
- 已生成的部分序列如果已被写入数据库，保留其 `amp_score=null` 状态。
- 未完成的序列不会被补全或填充假数据。
- 任务状态标记为 `CANCELLED`，而非 `SUCCEEDED` 或 `FAILED`。
- 取消不会导致任何虚假的实验结论。

## 8. 历史假分数清理（v0.5.1-hotfix）

2026-05-26 执行的清理操作：
- 备份数据库：`backups/db/ampgen_platform_before_v051_hotfix_YYYYMMDD_HHMMSS.db`
- 清空 `source='local_demo'` 的所有 `amp_score`、`mic_ecoli`、`mic_saureus`、`toxicity_risk`、`hemolysis_risk`
- `source='local_real_smoke'` 的记录完全不受影响
- 清理后 LOCAL_DEMO 分数非空数量 = 0

## 9. 导出报告的科学边界

所有导出的报告（CSV、FASTA、JSON、Markdown）均包含以下声明：

> **Computational prediction only. Not experimentally validated.**
> **LOCAL_REAL_SMOKE generates sequences only and does not validate antimicrobial activity.**
> **amp_score and MIC values are not computed unless real discriminator/scorer models are executed.**

- 导出 CSV 时，空分数显示为空单元格，不填充 0。
- 导出 Markdown 报告时，包含 "Next Experimental Validation" 建议章节（合成、MIC、MBC、溶血、细胞毒性）。
- 用户不得将导出结果作为实验验证结论直接发表或用于临床决策。

## 9. 审查机制

所有版本发布前必须经过 **ARIS-Lite 四角色审查**（详见 [ARIS_LITE_REVIEW_PROTOCOL.md](./ARIS_LITE_REVIEW_PROTOCOL.md)），其中 **Scientific Boundary Reviewer** 负责确保以上规则得到遵守。


## 10. Demo 数据仅保留为开发参考（v0.5.2）

2026-05-26 更新：
- Dashboard、ReportExport 预览、PeptideDetail 已全面切换真实 API。
- demoData.ts 不再作为任何主流程的数据来源。
- 所有展示的 mp_score、MIC 均为真实数据库值（LOCAL_DEMO 为 null）。
- 用户看到的序列、状态、来源均来自真实 SQLite 数据库。


## 11. LOCAL_DEMO artifacts 为空是正常设计（v0.5.4）

LOCAL_DEMO 运行器在内存中直接生成序列并写入 SQLite，**不创建文件 artifacts**。
因此 `GET /api/v1/generation-runs/{run_id}/artifacts` 对 LOCAL_DEMO 返回：
```json
{ "artifact_dir": null, "files": [], "message": "No artifacts directory configured for this run." }
```

这是**预期行为**，不是缺陷。

LOCAL_REAL_SMOKE 才会产生真实的 stdout.log / stderr.log / generated_sequences.csv / generated_sequences.fasta。

## 12. Run Detail 页面的科学边界（v0.5.4）

Generation Run Detail 页面在以下位置持续展示科学边界：
- 页面顶部黄色警示横幅：`Computational prediction only. Not experimentally validated.`
- LOCAL_REAL_SMOKE 结果旁额外说明：`Real AMPGen sequence generation completed. AMP score and MIC are not computed.`
- Peptides 表格中所有 score 列显示 `Not computed`
- Workflow 页面顶部和底部均有科学边界提示

## 13. 未接入系统的明确标识（v0.5.4）

AMPGen Workflow Visualizer 页面明确标识以下系统为未接入：
- SERVER_PRODUCTION: `Not connected / BLOCKED`
- AMP Discriminator: `Not detected`
- MIC Scorer: `Not detected`

## 14. Rule-Based Ranking 不是模型预测（v0.5.5）

Peptide Analytics 页面中的 "Top Rule-Based Candidates" 使用简单的启发式规则排序：

- valid_aa == 1
- length 15–35
- net_charge > 0
- hydrophobic_fraction 0.40–0.70
- status == CANDIDATE

**这不是 XGBoost 模型预测。**
**这不是神经网络评分。**
**这不是实验验证的抗菌活性。**

页面上必须明确显示：
> Rule-based ranking only. Not a model prediction.

## 15. Analytics 页面的科学边界（v0.5.5）

Peptide Analytics 页面在以下位置展示科学边界：
- 页面顶部黄色警示横幅
- 状态标签："Computational prediction only", "AMP score: Not computed", "MIC: Not computed"
- Top candidates 表格上方明确说明 "Rule-based ranking only. Not a model prediction."
- Candidate detail drawer 中 amp_score / MIC 显示 "Not computed"
- 所有分布图和统计仅反映计算生成的序列的理化性质，不反映实验抗菌活性


## 16. Sequence Similarity 不是功能相似（v0.5.7）

Sequence Explorer 的 Similarity Explorer 使用 **normalized Levenshtein distance** 计算序列编辑距离：

```
similarity = 1 - levenshtein_distance / max(len(seq1), len(seq2))
```

这是一个**纯序列字符串层面的相似性度量**。

**必须明确标识：**
- 序列相似 ≠ 功能相似
- 编辑距离小不代表两条肽具有相同的抗菌活性
- 编辑距离小不代表相同的靶标特异性
- 相似性结果仅用于序列去重和多样性评估

页面上必须显示：
> Sequence similarity is descriptive only and does not imply functional equivalence.

## 17. Descriptive Motif Statistics 不是功能 Motif（v0.5.7）

Sequence Explorer 的 Motif / Enrichment 区域统计：
- N-terminal 前 5 位氨基酸出现频率
- C-terminal 后 5 位氨基酸出现频率
- 全序列中最常见的二肽组合
- 全序列中最常见的单个氨基酸

这些统计是**描述性的**，仅反映当前数据集中氨基酸的位置分布偏好。

**不是功能 motif discovery。**
**不是结构 motif 预测。**
**不是结合位点识别。**

页面上必须显示：
> Descriptive motif statistics only. Not functional motif validation.

## 18. Representative Peptides 不是 Best Peptides（v0.5.7）

Sequence Explorer 的 Representative Peptides 使用以下**启发式规则**贪婪选择：

1. 优先 valid_aa == 1
2. 优先 length 15–35
3. 优先 net_charge > 0
4. 优先 hydrophobic_fraction 0.40–0.70
5. 优先 status == CANDIDATE / FILTERED
6. 跳过与已选代表序列相似度 >= 0.85 的肽

**这不是 AMP 活性最优选择。**
**这不是 XGBoost 模型预测。**
**这不是实验验证的最优肽。**

representative 的含义是：
- 在当前数据集中，这条肽的理化性质相对较好
- 与已选的代表序列有足够的多样性
- 可用于后续实验筛选的候选起点

页面上必须显示：
> Rule-based representative selection only. Not a model prediction.

## 19. 序列探索结果仍需实验验证（v0.5.7）

Sequence Explorer 输出的所有结果：
- Duplicate groups → 仅提示重复，不删除、不合并
- Similarity pairs → 仅提示序列相似，不做功能判断
- Motif statistics → 仅描述性统计，不做功能声明
- Representatives → 仅规则筛选，不做活性保证

**所有候选肽在用于实验前，仍需经过独立验证。**


## 20. Evidence Card 不是实验验证（v0.5.8）

Candidate Review Workbench 的 Evidence Card 使用以下**启发式规则**评估候选肽：

- length 15–35 aa
- net_charge > 0
- hydrophobic_fraction 0.40–0.70
- valid_aa == 1

**这些规则是计算筛选工具，不是实验验证。**
**pass 不代表这条肽具有抗菌活性。**
**fail 不代表这条肽完全无效（可能仍值得实验探索）。**

页面上必须显示：
> Rule-based review only. Not experimentally validated.

## 21. Shortlist 不代表功能有效（v0.5.8）

Shortlist 是用户或规则标记的候选肽集合，用于后续实验规划。

**Shortlist ≠ 实验验证有效。**
**selected_for_synthesis 只是合成计划标记，不是活性保证。**

所有导出文件（CSV、FASTA、Synthesis Order）必须包含：
> Computational candidate; not experimentally validated.

用户不得将 shortlist 直接作为实验结论发表。

## 22. Synthesis Order 是计划模板，不是实验结果（v0.5.8）

Synthesis Order CSV 是用于委托多肽合成公司（CRO）的**订单模板**。

- Purity、Scale 是默认建议值，可调整。
- Salt_Form 标注 "to be confirmed"，需实验确认。
- Remarks 明确标注 "Computational candidate; not experimentally validated."

合成完成后，仍需独立验证抗菌活性、毒性、溶血性等。

## 23. Review 更新不改变模型分数（v0.5.8）

通过 `POST /candidate-review/candidates/{id}/review` 更新 review 字段时：
- `amp_score`、`mic_ecoli`、`mic_saureus` 保持 null。
- 不会自动填充 0 或假值。
- 不会触发任何模型预测。
- 仅更新 review metadata。


## 24. Local Maintenance 不改变科学结论（v0.5.9）

Local Maintenance 是数据管理工具，不是实验验证工具：

- **备份/恢复** 只是复制 SQLite 数据库和 artifacts 文件，不改变肽序列的实验验证状态。
- **Project Snapshot** 包含的是计算结果，不是实验数据。
- **Cleanup** 删除的是旧 artifacts，不是删除实验记录。
- **Reset Demo Data** 删除的是 LOCAL_DEMO 生成的假数据，不影响 LOCAL_REAL_SMOKE 的真实模型输出。

维护操作不影响 AMPGen 原始模型目录中的模型权重文件。

## 25. Snapshot 不是实验证据包（v0.5.9）

Project Snapshot 是一个便于迁移和归档的压缩包，包含：
- 代码文档和脚本
- 本地数据库副本
- artifacts zip

**Snapshot 不包含：**
- AMPGen 原始模型权重（过大且非本项目产出）
- `.env` 文件（可能含敏感配置）
- `.git` 目录（快照本身已含 git commit 信息）

Snapshot 是开发/运维工具，不能替代实验记录本或数据管理计划（DMP）。
