#!/usr/bin/env python3
"""
CLI wrapper for P6E discriminator scoring.
Called by backend via subprocess with scorer venv Python.
"""
import argparse
import json
import sys
import os

# Add the discriminator export work directory to path
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from p6e_features_exact import get_pre_features_exact
import joblib
import numpy as np
import pandas as pd


def score_sequences(sequences, model_path):
    """Score a list of sequences and return probabilities."""
    import tempfile
    
    prepared = [{"ID": f"SEQ_{i:04d}", "Sequence": seq} for i, seq in enumerate(sequences)]
    temp_fd, temp_path = tempfile.mkstemp(suffix=".csv")
    try:
        os.close(temp_fd)
        pd.DataFrame(prepared).to_csv(temp_path, index=False)
        
        fresh_df = get_pre_features_exact(temp_path)
        feature_cols = [c for c in fresh_df.columns if c not in ["ID", "Sequence"]]
        
        X = fresh_df[feature_cols].apply(pd.to_numeric, errors='coerce')
        
        model = joblib.load(model_path)
        proba = model.predict_proba(X)[:, 1]
        return proba.tolist()
    finally:
        os.unlink(temp_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="JSON file with list of sequences")
    parser.add_argument("--model", required=True, help="Path to joblib model")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()
    
    with open(args.input) as f:
        sequences = json.load(f)
    
    scores = score_sequences(sequences, args.model)
    
    with open(args.output, "w") as f:
        json.dump(scores, f)
    
    print(f"Scored {len(scores)} sequences")


if __name__ == "__main__":
    main()
