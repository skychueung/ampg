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
