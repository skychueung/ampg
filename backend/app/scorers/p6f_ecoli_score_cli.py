#!/usr/bin/env python3
"""
CLI wrapper for P6F E. coli MIC baseline scorer.
Called by backend via subprocess with scorer venv Python.
"""
import argparse
import json
import sys
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from p6f_mic_ecoli_features import build_feature_dataframe
import joblib
import numpy as np
import pandas as pd


def score_sequences(sequences, model_path, metadata_path):
    """Score a list of sequences and return dict with logMIC and uM predictions."""
    # Load feature schema to get feature names for alignment
    feature_schema_path = metadata_path.replace(".metadata.json", ".feature_schema.json")
    with open(feature_schema_path) as f:
        feature_schema = json.load(f)
    feature_names = feature_schema["feature_names"]

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
    for seq, logmic, um in zip(sequences, logmic_preds, um_preds):
        results.append({
            "sequence": seq,
            "mic_ecoli_logmic_pred": float(logmic),
            "mic_ecoli_uM_pred": float(um),
            "model_source": "p6f_ecoli_xgboost_baseline",
            "backend_integrated": False,
            "scientific_disclaimer": "Computational prediction only; not experimentally measured MIC.",
        })
    return results


def main():
    parser = argparse.ArgumentParser(description="P6F E. coli MIC baseline scorer")
    parser.add_argument("--input", required=True, help="JSON file with list of sequences")
    parser.add_argument("--model", required=True, help="Path to joblib model")
    parser.add_argument("--metadata", required=True, help="Path to metadata JSON")
    parser.add_argument("--output", required=True, help="Output JSON file")
    args = parser.parse_args()

    with open(args.input) as f:
        sequences = json.load(f)

    results = score_sequences(sequences, args.model, args.metadata)

    with open(args.output, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Scored {len(results)} sequences", file=sys.stderr)


if __name__ == "__main__":
    main()
