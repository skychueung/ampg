#!/usr/bin/env python3
"""
CLI wrapper for P6F S. aureus MIC baseline scorer.
Called by backend via subprocess with scorer venv Python.
"""
import argparse
import json
import sys
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from p6f_mic_saureus_features import build_feature_dataframe
import joblib
import numpy as np
import pandas as pd


def score_sequences(sequences, model_path, metadata_path):
    """Score a list of sequences and return dict with logMIC and uM predictions."""
    # Load metadata to get feature names for alignment
    with open(metadata_path) as f:
        metadata = json.load(f)
    feature_names = metadata["feature_names"]

    df = build_feature_dataframe(sequences)
    # Align columns to training schema (XGBoost aligns by name, but explicit reorder is safer)
    for col in feature_names:
        if col not in df.columns:
            df[col] = 0.0
    df = df[feature_names]

    model = joblib.load(model_path)
    logmic_preds = model.predict(df)
    um_preds = 10 ** logmic_preds

    results = []
    for logmic, um in zip(logmic_preds, um_preds):
        results.append({
            "mic_saureus_logmic_pred": float(logmic),
            "mic_saureus_uM_pred": float(um),
            "mic_saureus_source": "model_prediction_xgboost_baseline",
            "mic_ecoli": None,
        })
    return results


def main():
    parser = argparse.ArgumentParser(description="P6F S. aureus MIC baseline scorer")
    parser.add_argument("--input", required=True, help="JSON file with list of sequences")
    parser.add_argument("--model", required=True, help="Path to joblib model")
    parser.add_argument("--metadata", required=True, help="Path to metadata JSON")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()

    with open(args.input) as f:
        sequences = json.load(f)

    results = score_sequences(sequences, args.model, args.metadata)

    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Scored {len(results)} sequences")


if __name__ == "__main__":
    main()
