# Candidate Review User Guide

## Page Path

`/candidate-review`

---

## API Endpoint

```
GET /api/v1/candidate-review/p6f-shortlist?type={type}
```

**Query parameter**: `type` — one of the supported shortlist types listed below.

**Response**: JSON array of candidate peptides with fields:
- `rank`
- `sequence`
- `length`
- `amp_score`
- `mic_saureus`
- `mic_ecoli`
- `combined_rank_score`
- `net_charge_approx`
- `hydrophobic_fraction`
- `source_group`

---

## Supported Shortlist Types (10)

| # | Type | Description |
|---|------|-------------|
| 1 | `combined_top100` | Top 100 by combined ranking (amp_score + low MIC) |
| 2 | `combined_top50` | Top 50 by combined ranking |
| 3 | `combined_top20` | Top 20 by combined ranking |
| 4 | `low_mic_top100` | Top 100 by lowest mic_saureus |
| 5 | `low_mic_top50` | Top 50 by lowest mic_saureus |
| 6 | `low_mic_top20` | Top 20 by lowest mic_saureus |
| 7 | `high_amp_top100` | Top 100 by highest amp_score |
| 8 | `high_amp_top50` | Top 50 by highest amp_score |
| 9 | `high_amp_top20` | Top 20 by highest amp_score |
| 10 | `representative50` | 50 representative peptides after k-mer Jaccard deduplication |

---

## Page Field Descriptions

| Field | Meaning | Sortable |
|---|---|---|
| `sequence` | Amino acid sequence of the peptide | — |
| `length` | Number of amino acids | ✅ |
| `amp_score` | P6E XGBoost AMP discriminator probability (0–1). Higher = more AMP-like. | ✅ |
| `mic_saureus` | P6F XGBoost baseline regressor predicted MIC against *S. aureus* (μM). Lower = stronger predicted activity. | ✅ |
| `mic_ecoli` | Predicted MIC against *E. coli*. Currently **null** (no model/data). | — |
| `combined_rank_score` | Composite score balancing amp_score and low mic_saureus. Higher = better combined profile. | ✅ |
| `net_charge_approx` | Approximate net charge at physiological pH | ✅ |
| `hydrophobic_fraction` | Fraction of hydrophobic amino acids | ✅ |
| `source_group` | Origin group label (e.g., `combined`, `low_mic`, `high_amp`) | ✅ |

---

## Sorting Behavior

- **amp_score**: Higher values first (descending)
- **mic_saureus**: Lower values first (ascending) — lower MIC = stronger predicted activity
- **combined_rank_score**: Higher values first (descending)
- **length**: Click header to toggle ascending/descending

---

## Filters

| Filter | Behavior |
|---|---|
| **AMP-like only** | Show only peptides with `amp_score >= 0.5` |
| **Max MIC** | Hide peptides with `mic_saureus` above the threshold |
| **Min length** | Hide peptides shorter than the threshold |
| **Max length** | Hide peptides longer than the threshold |

---

## CSV Download

Click the **Download CSV** button to export the currently displayed (filtered + sorted) list as a CSV file.

The downloaded CSV includes:
- All visible columns
- A trailing disclaimer row: *"Computational prediction only. Not experimentally validated."*

---

## Scientific Boundary

> **Candidate Review is candidate screening, not experimental validation.**

- `amp_score` is a computational prediction from an XGBoost model. It is **not** an experimental antimicrobial activity assay.
- `mic_saureus` is a computational prediction from a baseline XGBoost regressor. It is **not** an experimentally measured MIC.
- `mic_ecoli` is currently **null** — no model or data exists for *E. coli*.
- `combined_rank_score` is a mathematical composite of computational predictions, not a biological activity score.
- `representative50` uses k-mer Jaccard deduplication for sequence diversity — it does not guarantee functional diversity or experimental efficacy.

**All candidates require wet-lab validation before any experimental conclusion can be drawn.**

---

## Error Handling

If an invalid `type` is requested, the API returns:

```json
{
  "detail": "Invalid shortlist type. Allowed: combined_top100, combined_top50, combined_top20, low_mic_top100, low_mic_top50, low_mic_top20, high_amp_top100, high_amp_top50, high_amp_top20, representative50"
}
```

HTTP status: **400 Bad Request**

---

*Last updated: 2026-06-08 (v0.6.9-candidate-review)*
