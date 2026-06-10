"""Minimal test for PseKRAAC B boundary fix and sequence-level isolation.
Run on server with: python test_psekraac_boundary.py
"""
import sys
sys.path.insert(0, "/home/xh/kxc/ampg可视化/服务器版/backend")

from app.runners.server_production_runner import _score_sequences_with_p6e, STANDARD_AA


def test_standard_aa_set():
    assert STANDARD_AA == set("ACDEFGHIKLMNPQRSTVWY")
    print("[TEST PASS] STANDARD_AA set correct")


def test_prefilter_logic():
    """Test the pre-filter logic without calling real scorer."""
    sequences = [
        "ACDEFGHIKLMNPQRSTVWY",  # standard
        "ACDEFGHIKLMNPQRSTVWYB",  # contains B
        "ACDEFGHIKLMNPQRSTVWYX",  # contains X
        "ACDEFGHIKLMNPQRSTVWY",  # standard
    ]
    
    # Simulate the pre-filter logic
    unsupported_indices = []
    supported_sequences = []
    supported_map = []
    
    for i, seq in enumerate(sequences):
        seq_upper = seq.upper()
        unsupported = sorted(set(seq_upper) - STANDARD_AA)
        if unsupported:
            unsupported_indices.append((i, unsupported))
        else:
            supported_sequences.append(seq)
            supported_map.append((i, seq))
    
    assert len(unsupported_indices) == 2
    assert unsupported_indices[0] == (1, ['B'])
    assert unsupported_indices[1] == (2, ['X'])
    assert len(supported_sequences) == 2
    assert supported_map[0] == (0, "ACDEFGHIKLMNPQRSTVWY")
    assert supported_map[1] == (3, "ACDEFGHIKLMNPQRSTVWY")
    print("[TEST PASS] Pre-filter logic isolates B and X correctly")


def test_end_to_end_mixed_chunk():
    """End-to-end test with real scorer."""
    sequences = [
        "ACDEFGHIKLMNPQRSTVWY",   # standard, should get a score
        "MKLLLB",                  # contains B, should be null
        "ACDEFGHIKLMNPQRSTVWY",   # standard, should get a score
    ]
    
    scores = _score_sequences_with_p6e(sequences)
    
    assert len(scores) == 3, f"Expected 3 scores, got {len(scores)}"
    
    # Sequence 0: standard, should have a real score (float)
    assert scores[0] is not None, f"Sequence 0 should have score, got {scores[0]}"
    assert isinstance(scores[0], float), f"Sequence 0 score should be float, got {type(scores[0])}"
    print(f"[TEST PASS] Sequence 0 (standard) amp_score={scores[0]:.4f}")
    
    # Sequence 1: contains B, should be null
    assert scores[1] is None, f"Sequence 1 (contains B) should be null, got {scores[1]}"
    print("[TEST PASS] Sequence 1 (contains B) amp_score=null")
    
    # Sequence 2: standard, should have a real score
    assert scores[2] is not None, f"Sequence 2 should have score, got {scores[2]}"
    assert isinstance(scores[2], float), f"Sequence 2 score should be float, got {type(scores[2])}"
    print(f"[TEST PASS] Sequence 2 (standard) amp_score={scores[2]:.4f}")
    
    print("[TEST PASS] End-to-end mixed chunk: only B sequence is null, others scored")


def test_all_unsupported():
    """Test chunk where all sequences are unsupported."""
    sequences = ["BBBB", "XXXX", "ZZZZ"]
    scores = _score_sequences_with_p6e(sequences)
    assert scores == [None, None, None]
    print("[TEST PASS] All unsupported sequences return null")


def test_all_supported():
    """Test chunk where all sequences are supported."""
    sequences = ["ACDEFGHIKLMNPQRSTVWY", "MKLLLAVVV"]
    scores = _score_sequences_with_p6e(sequences)
    assert len(scores) == 2
    assert scores[0] is not None
    assert scores[1] is not None
    print(f"[TEST PASS] All supported sequences scored: {scores[0]:.4f}, {scores[1]:.4f}")


if __name__ == "__main__":
    print("=" * 60)
    print("PseKRAAC B Boundary Fix — Sequence-Level Isolation Test")
    print("=" * 60)
    
    test_standard_aa_set()
    test_prefilter_logic()
    test_end_to_end_mixed_chunk()
    test_all_unsupported()
    test_all_supported()
    
    print("=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)
