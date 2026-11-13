import nibabel as nib
import numpy as np
import pytest

from neurosim_data.volumes import parcellate


def _atlas() -> nib.Nifti1Image:
    labels = np.zeros((8, 8, 8), dtype=np.int16)
    labels[:4] = 1
    labels[4:] = 2
    return nib.Nifti1Image(labels, np.diag([2.0, 2.0, 2.0, 1.0]))


def test_averages_the_map_within_each_region():
    data = np.zeros((8, 8, 8))
    data[:4] = 3.0
    data[4:] = 5.0
    image = nib.Nifti1Image(data, np.diag([2.0, 2.0, 2.0, 1.0]))
    assert np.allclose(parcellate(image, _atlas(), [1, 2]), [3.0, 5.0])


def test_brings_the_atlas_onto_the_grid_of_the_map():
    data = np.zeros((16, 16, 16))
    data[:8] = 3.0
    data[8:] = 5.0
    fine = np.diag([1.0, 1.0, 1.0, 1.0])
    fine[:3, 3] = -0.5
    image = nib.Nifti1Image(data, fine)
    assert np.allclose(parcellate(image, _atlas(), [1, 2]), [3.0, 5.0])


def test_ignores_voxels_the_map_masks_out():
    data = np.zeros((8, 8, 8))
    data[:2] = 4.0
    data[4:] = 5.0
    image = nib.Nifti1Image(data, np.diag([2.0, 2.0, 2.0, 1.0]))
    assert np.allclose(parcellate(image, _atlas(), [1, 2]), [4.0, 5.0])


def test_refuses_a_region_the_map_does_not_cover():
    data = np.zeros((8, 8, 8))
    data[4:] = 5.0
    image = nib.Nifti1Image(data, np.diag([2.0, 2.0, 2.0, 1.0]))
    with pytest.raises(ValueError, match="region 1"):
        parcellate(image, _atlas(), [1, 2])
