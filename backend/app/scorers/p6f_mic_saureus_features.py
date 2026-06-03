"""P6F S. aureus MIC baseline feature extraction.

25-dim simple physicochemical features used by the XGBoost baseline regressor.
"""
import pandas as pd


def extract_features(sequences):
    """Extract 25-dim physicochemical features from peptide sequences.

    Features:
      - length
      - net_charge_approx (K/R/H +1, D/E -1)
      - hydrophobic_fraction (A/V/I/L/M/F/W/Y)
      - n_aromatic (F/W/Y)
      - n_sulfur (C/M)
      - freq_A .. freq_Y (20 amino-acid frequencies)
    """
    rows = []
    for seq in sequences:
        length = len(seq)
        net = sum(1 for aa in seq if aa in "KRH") - sum(1 for aa in seq if aa in "DE")
        hydro = sum(1 for aa in seq if aa in "AVILMFWY") / max(length, 1)
        aromatic = sum(1 for aa in seq if aa in "FWY")
        sulfur = sum(1 for aa in seq if aa in "CM")
        freqs = {
            f"freq_{aa}": seq.count(aa) / max(length, 1)
            for aa in "ACDEFGHIKLMNPQRSTVWY"
        }
        rows.append(
            {
                "length": length,
                "net_charge_approx": net,
                "hydrophobic_fraction": hydro,
                "n_aromatic": aromatic,
                "n_sulfur": sulfur,
                **freqs,
            }
        )
    return pd.DataFrame(rows)
