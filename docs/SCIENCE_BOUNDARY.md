# AMPGen Science Boundary

> **Generation ≠ Experimentally Validated. All scores are computational predictions.**

---

## Field Boundary Table

| Field | Current Status | Source | Can Represent Experimental Validation? |
|---|---|---|---|
| `sequence` | Generated | AMPGen (evodiff PLM sampling) | **No** |
| `amp_score` | Filled | P6E XGBoost AMP discriminator | **No** |
| `mic_saureus` | Filled | P6F XGBoost baseline regressor | **No** |
| `mic_ecoli` | `null` | No model / data missing | **No** |
| `toxicity_risk` | `null` | No model integrated | **No** |
| `hemolysis_risk` | `null` | No model integrated | **No** |
| `shortlist` | Generated | Computational screening | **No** |
| `representative` | Generated | Deduplication screening (k-mer Jaccard) | **No** |

---

## Critical Clarifications

1. **amp_score is NOT MIC**  
   `amp_score` is a binary classification probability (0–1) from an XGBoost discriminator trained on known AMP vs. non-AMP sequences. It predicts *likelihood of being antimicrobial*, not minimum inhibitory concentration.

2. **mic_saureus is NOT an experimentally measured MIC**  
   `mic_saureus` is a regression prediction (μM) from a baseline XGBoost regressor trained on ~18k *S. aureus* MIC data points. It is a **computational estimate**, not a laboratory broth microdilution result.

3. **mic_saureus does NOT represent mic_ecoli**  
   The P6F model was trained exclusively on *S. aureus* data. It cannot be used to infer *E. coli* activity. `mic_ecoli` remains `null` until a dedicated *E. coli* model is trained and integrated.

4. **shortlist does NOT mean experimentally effective**  
   Shortlists (combined, low-MIC, high-AMP, representative) are computational rankings. A peptide appearing in a shortlist has **not** been tested in a lab.

5. **representative candidates do NOT mean best peptides**  
   Representative selection uses k-mer Jaccard deduplication to maximize sequence diversity. Diversity ≠ optimal activity. These are starting points for experimental exploration, not guaranteed winners.

6. **All candidates require wet-lab validation**  
   Before any peptide can be claimed as "active," it must undergo:
   - MIC determination (broth microdilution against target pathogens)
   - Hemolysis assay (human red blood cells)
   - Cytotoxicity assay (mammalian cell lines)
   - Protease stability / serum stability (if applicable)

7. **Do NOT forge toxicity, hemolysis, or experimental validation**  
   Until dedicated toxicity and hemolysis prediction models are integrated, `toxicity_risk` and `hemolysis_risk` must remain `null`. Do not invent values, infer from rules, or extrapolate from other peptides.

---

## Model Performance Reference (for context only)

| Model | Metric | Value | Notes |
|---|---|---|---|
| P6E XGBoost AMP discriminator | Accuracy | 0.9640 | 21,953 training samples |
| | F1 | 0.9602 | Binary classification |
| | AUC | 0.9943 | ROC-AUC |
| P6F XGBoost MIC regressor (S. aureus) | Test R² | 0.8464 | 18,671 training samples |
| | Test RMSE | 0.5456 | logMIC scale |
| | Test MAE | 0.2976 | logMIC scale |

These metrics describe **model fit on historical data**, not experimental reproducibility on new peptides.

---

## Source Label Truthfulness

| Source Value | Meaning |
|---|---|
| `local_demo` | Local mock data, no real model call |
| `local_mock` | Local simulated data |
| `local_real_smoke` | Local real AMPGen call (CPU mode, slow) |
| `server_production` | Server GPU generation with P6E + P6F scoring |
| `server_batch` | Server batch GPU generation with P6E + P6F scoring |

**Never** label `local_demo` data as `server_production` or claim experimental validation.

---

## Export Disclaimer (Mandatory)

All exported files (CSV, FASTA, JSON, Markdown) must include:

> **Computational prediction only. Not experimentally validated.**  
> **amp_score and MIC values are model predictions, not laboratory measurements.**  
> **All candidates require independent wet-lab validation before experimental conclusions.**

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
