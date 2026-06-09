"""Physicochemical property calculations for peptide sequences."""

HYDROPHOBIC: dict[str, float] = {
    "A": 0.5,
    "V": 1.0,
    "I": 1.5,
    "L": 1.5,
    "M": 0.5,
    "F": 2.0,
    "W": 2.5,
    "Y": 1.5,
    "C": 0.5,
    "P": -0.5,
    "G": 0.0,
    "S": -0.5,
    "T": -0.5,
    "N": -1.0,
    "Q": -1.0,
    "H": -0.5,
    "K": -2.0,
    "R": -2.0,
    "D": -1.5,
    "E": -1.5,
}

VALID_AA = set("ACDEFGHIKLMNPQRSTVWY")
INVALID_AA = set("UOBZJX")


def compute_length(sequence: str) -> int:
    return len(sequence)


def compute_net_charge(sequence: str) -> int:
    charge = 0
    for aa in sequence.upper():
        if aa in "KRH":
            charge += 1
        elif aa in "DE":
            charge -= 1
    return charge


def compute_hydrophobic_fraction(sequence: str) -> float:
    if not sequence:
        return 0.0
    hydro_count = sum(1 for aa in sequence.upper() if aa in "VILFMYWCA")
    return round(hydro_count / len(sequence), 3)


def compute_hydrophobicity(sequence: str) -> float:
    if not sequence:
        return 0.0
    total = sum(HYDROPHOBIC.get(aa, 0.0) for aa in sequence.upper())
    return round(total / len(sequence), 3)


def check_invalid_aa(sequence: str) -> bool:
    return any(aa.upper() in INVALID_AA for aa in sequence)


def apply_amp_filter(sequence: str) -> dict:
    length = compute_length(sequence)
    invalid = check_invalid_aa(sequence)
    net_charge = compute_net_charge(sequence)
    hydro_frac = compute_hydrophobic_fraction(sequence)

    passed = True
    reasons = []

    if not (15 <= length <= 35):
        passed = False
        reasons.append(f"Length {length} not in 15-35")
    if invalid:
        passed = False
        reasons.append("Contains invalid amino acids (U/O/B/Z/J/X)")
    if net_charge <= 0:
        passed = False
        reasons.append(f"Net charge {net_charge} <= 0")
    if not (0.40 <= hydro_frac <= 0.70):
        passed = False
        reasons.append(f"Hydrophobic fraction {hydro_frac} not in 0.40-0.70")

    return {
        "passed": passed,
        "reasons": reasons,
        "length": length,
        "net_charge": net_charge,
        "hydrophobic_fraction": hydro_frac,
        "hydrophobicity": compute_hydrophobicity(sequence),
        "valid_aa": 0 if invalid else 1,
    }
