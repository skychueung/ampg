"""P6F S. aureus MIC baseline scorer CLI.

Called by backend runners via subprocess with the isolated .venv-p6f-mic Python.
"""
import argparse
import json

import joblib

from p6f_mic_saureus_features import extract_features


def main():
    parser = argparse.ArgumentParser(description="P6F S. aureus MIC baseline scorer")
    parser.add_argument("--input", required=True, help="JSON file with list of sequences")
    parser.add_argument("--model", required=True, help="Joblib model path")
    parser.add_argument("--metadata", required=True, help="JSON metadata path")
    parser.add_argument("--output", required=True, help="JSON output path")
    args = parser.parse_args()

    with open(args.input) as f:
        sequences = json.load(f)

    model = joblib.load(args.model)
    with open(args.metadata) as f:
        metadata = json.load(f)

    X = extract_features(sequences)
    logmic_preds = model.predict(X).tolist()

    results = []
    for logmic in logmic_preds:
        results.append(
            {
                "mic_saureus_logmic_pred": logmic,
                "mic_saureus_uM_pred": float(10 ** logmic),
                "mic_saureus_source": "model_prediction_xgboost_baseline",
                "mic_ecoli": None,
            }
        )

    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Scored {len(results)} sequences")


if __name__ == "__main__":
    main()
