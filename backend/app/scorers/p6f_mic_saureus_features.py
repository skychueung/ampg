"""
P6F S. aureus MIC scorer — simple physicochemical feature extraction.
Matches the exact 25-dim feature schema used during baseline training.
"""
import pandas as pd

STANDARD_AA = set("ACDEFGHIKLMNPQRSTVWY")
CHARGE_POS = set("KRH")
CHARGE_NEG = set("DE")
HYDROPHOBIC = set("AVILMFWY")


def extract_features(seq: str):
    """Extract 25-dim physicochemical features from a peptide sequence."""
    seq = seq.upper().strip()
    L = len(seq)
    if L == 0:
        return None
    counts = {aa: 0 for aa in STANDARD_AA}
    for c in seq:
        if c in counts:
            counts[c] += 1
    feats = {
        "length": L,
        "net_charge_approx": sum(1 for c in seq if c in CHARGE_POS) - sum(1 for c in seq if c in CHARGE_NEG),
        "hydrophobic_fraction": sum(1 for c in seq if c in HYDROPHOBIC) / L,
        "n_aromatic": sum(1 for c in seq if c in "FYW"),
        "n_sulfur": sum(1 for c in seq if c in "CM"),
    }
    for aa in STANDARD_AA:
        feats[f"freq_{aa}"] = counts[aa] / L
    return feats


def build_feature_dataframe(sequences: list) -> pd.DataFrame:
    """Build a feature DataFrame for a list of sequences."""
    rows = []
    for seq in sequences:
        f = extract_features(seq)
        rows.append(f)
    df = pd.DataFrame(rows)
    # Ensure column order matches training schema
    ordered_cols = [
        "length", "net_charge_approx", "hydrophobic_fraction",
        "n_aromatic", "n_sulfur",
    ] + [f"freq_{aa}" for aa in sorted(STANDARD_AA)]
    return df[ordered_cols]
