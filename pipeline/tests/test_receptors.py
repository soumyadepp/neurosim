import numpy as np

from neurosim_data.receptors import region_profile, relative_density


def test_relative_density_averages_to_one_over_cortex():
    values = np.array([2.0, 4.0, 6.0, 100.0])
    cortex = np.array([True, True, True, False])
    rel = relative_density(values, cortex)
    assert np.isclose(rel[cortex].mean(), 1.0)
    assert np.isclose(rel[3], 25.0)


def test_region_profile_averages_member_nodes():
    densities = {"GABAa": np.array([1.0, 3.0, 5.0]), "NMDA": np.array([2.0, 2.0, 8.0])}
    profile = region_profile(densities, [0, 1])
    assert profile == {"GABAa": 2.0, "NMDA": 2.0}


def test_region_profile_with_no_members_is_neutral():
    densities = {"GABAa": np.array([1.0, 3.0])}
    assert region_profile(densities, []) == {"GABAa": 1.0}
