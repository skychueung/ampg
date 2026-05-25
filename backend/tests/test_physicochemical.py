from app.services.physicochemical import (
    compute_length,
    compute_net_charge,
    compute_hydrophobic_fraction,
    compute_hydrophobicity,
    check_invalid_aa,
    apply_amp_filter,
)


def test_compute_length():
    assert compute_length("AKL") == 3


def test_compute_net_charge():
    assert compute_net_charge("KKK") == 3
    assert compute_net_charge("DDE") == -3
    assert compute_net_charge("AKL") == 1


def test_compute_hydrophobic_fraction():
    frac = compute_hydrophobic_fraction("VVVVAAAA")
    assert frac == 1.0
    frac2 = compute_hydrophobic_fraction("KKKKDDDD")
    assert frac2 == 0.0


def test_check_invalid_aa():
    assert check_invalid_aa("AKLX") is True
    assert check_invalid_aa("AKL") is False


def test_apply_amp_filter_pass():
    # 20 length, positive charge, no invalid aa, mixed hydrophobic
    seq = "AKLFWVILMNRSTQYE"
    result = apply_amp_filter(seq)
    assert result["passed"] is True
    assert result["length"] == len(seq)
    assert result["net_charge"] > 0


def test_apply_amp_filter_reject_length():
    seq = "A" * 10
    result = apply_amp_filter(seq)
    assert result["passed"] is False
    assert any("Length" in r for r in result["reasons"])


def test_apply_amp_filter_reject_invalid_aa():
    seq = "AKLFWVILMNRSTQYB"
    result = apply_amp_filter(seq)
    assert result["passed"] is False
    assert any("invalid" in r for r in result["reasons"])
