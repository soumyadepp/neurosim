import numpy as np

from neurosim_data.connectome import homotopic_pairs, upper_triangle_r


def test_homotopic_pairs_match_labels_across_hemispheres():
    labels = ["a", "b", "a", "b"]
    hemis = ["R", "R", "L", "L"]
    assert homotopic_pairs(labels, hemis) == [(2, 0), (3, 1)]


def test_upper_triangle_r_ignores_the_diagonal():
    a = np.array([[1.0, 0.2, 0.4], [0.2, 1.0, 0.6], [0.4, 0.6, 1.0]])
    b = np.array([[9.0, 0.1, 0.2], [0.1, -9.0, 0.3], [0.2, 0.3, 9.0]])
    assert np.isclose(upper_triangle_r(a, b), 1.0)
