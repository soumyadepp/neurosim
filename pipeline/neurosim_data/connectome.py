"""Helpers for structural and functional connectivity matrices."""

from collections.abc import Sequence

import numpy as np


def homotopic_pairs(labels: Sequence[str], hemis: Sequence[str]) -> list[tuple[int, int]]:
    """Pairs each left-hemisphere node with the right-hemisphere node of the same parcel.

    Args:
        labels: Parcel name per node.
        hemis: "L" or "R" per node.

    Returns:
        (left index, right index) pairs, ordered by left index.
    """
    right = {label: i for i, (label, h) in enumerate(zip(labels, hemis)) if h == "R"}
    return [(i, right[label]) for i, (label, h) in enumerate(zip(labels, hemis)) if h == "L" and label in right]


def upper_triangle_r(a: np.ndarray, b: np.ndarray) -> float:
    """Pearson correlation between the off-diagonal upper triangles of two square matrices.

    Args:
        a: First (n, n) matrix.
        b: Second (n, n) matrix.

    Returns:
        Pearson r over the n * (n - 1) / 2 unique off-diagonal entries.
    """
    iu = np.triu_indices(a.shape[0], 1)
    return float(np.corrcoef(a[iu], b[iu])[0, 1])
