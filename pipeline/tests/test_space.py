import numpy as np

from neurosim_data.space import SimSpace


def test_axes_are_reordered_from_ras_to_sim():
    space = SimSpace(center_mm=np.zeros(3), mm_per_unit=10.0)
    out = space.to_sim(np.array([[10.0, 20.0, 30.0]]))
    np.testing.assert_allclose(out, [[1.0, 3.0, 2.0]])


def test_center_maps_to_origin():
    space = SimSpace(center_mm=np.array([5.0, -20.0, 15.0]), mm_per_unit=80.0)
    np.testing.assert_allclose(space.to_sim(np.array([[5.0, -20.0, 15.0]])), [[0.0, 0.0, 0.0]])


def test_fit_to_bounds_centres_and_scales_the_longest_axis():
    pts = np.array([[-70.0, -105.0, -48.0], [70.0, 69.0, 80.0]])
    space = SimSpace.fit(pts, half_extent=1.1)
    out = space.to_sim(pts)
    np.testing.assert_allclose(out.mean(axis=0), [0.0, 0.0, 0.0], atol=1e-9)
    assert np.isclose(np.abs(out).max(), 1.1)


def test_lengths_convert_with_the_same_scale():
    space = SimSpace(center_mm=np.zeros(3), mm_per_unit=80.0)
    assert space.length(40.0) == 0.5
