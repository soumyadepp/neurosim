"""Receptor density normalisation from parcellated PET maps."""

from collections.abc import Sequence

import numpy as np


def relative_density(values: np.ndarray, cortex_mask: np.ndarray) -> np.ndarray:
    """Scales a parcellated PET map so the cortical mean is 1.

    Args:
        values: Density per parcel.
        cortex_mask: True for cortical parcels.

    Returns:
        Densities relative to the cortical mean, so 1.5 means 50% above an average cortical region.
    """
    return values / values[cortex_mask].mean()


def region_profile(densities: dict[str, np.ndarray], members: Sequence[int]) -> dict[str, float]:
    """Averages each receptor's relative density over a group of parcels.

    Args:
        densities: Relative density per parcel, keyed by receptor.
        members: Parcel indices that make up the region.

    Returns:
        Mean relative density per receptor; 1.0 for every receptor when the region has no parcels.
    """
    if not members:
        return {name: 1.0 for name in densities}
    idx = list(members)
    return {name: float(values[idx].mean()) for name, values in densities.items()}
