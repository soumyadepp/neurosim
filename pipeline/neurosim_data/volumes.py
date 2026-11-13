"""Reduces volumetric brain maps to one value per atlas region."""

import nibabel as nib
import numpy as np
from nilearn.image import resample_to_img


def parcellate(image: nib.Nifti1Image, atlas: nib.Nifti1Image, region_ids: list[int]) -> np.ndarray:
    """Averages a volumetric map within each region of an atlas.

    The atlas is brought onto the grid of the map, never the other way round, so the measured
    values are not interpolated. Voxels equal to zero or not finite are treated as outside the
    map's mask and left out of the average.

    Args:
        image: The map to reduce.
        atlas: Integer label volume in the same reference space.
        region_ids: Atlas labels to report, in output order.

    Returns:
        Mean value per region.

    Raises:
        ValueError: If a region has no voxel inside the map's mask.
    """
    labels = resample_to_img(atlas, image, interpolation="nearest", force_resample=True, copy_header=True)
    labels = np.asarray(labels.dataobj).round().astype(int)
    data = np.asarray(image.dataobj, dtype=float).reshape(labels.shape)
    valid = np.isfinite(data) & (data != 0)
    out = np.zeros(len(region_ids))
    for k, region in enumerate(region_ids):
        inside = valid & (labels == region)
        if not inside.any():
            raise ValueError(f"region {region} has no voxel inside the map")
        out[k] = data[inside].mean()
    return out
