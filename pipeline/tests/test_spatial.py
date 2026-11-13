import numpy as np

from neurosim_data.spatial import distance_cv, parcel_sphere_centroids, spin_p, spin_permutations


def _sphere_points(n: int, seed: int) -> np.ndarray:
    points = np.random.default_rng(seed).normal(size=(n, 3))
    return points / np.linalg.norm(points, axis=1, keepdims=True)


def test_distance_cv_is_near_one_for_a_linear_relationship():
    rng = np.random.default_rng(0)
    coords = rng.normal(size=(60, 3))
    X = rng.normal(size=(60, 3))
    Y = (X @ np.array([1.5, -0.5, 2.0]) + 4.0)[:, None]
    assert distance_cv(X, Y, coords)[0] > 0.99


def test_distance_cv_is_near_zero_for_unrelated_noise():
    rng = np.random.default_rng(1)
    coords = rng.normal(size=(60, 3))
    X = rng.normal(size=(60, 3))
    Y = rng.normal(size=(60, 1))
    assert abs(distance_cv(X, Y, coords)[0]) < 0.3


def test_distance_cv_scores_each_target_column():
    rng = np.random.default_rng(2)
    coords = rng.normal(size=(60, 3))
    X = rng.normal(size=(60, 2))
    Y = np.column_stack([X[:, 0] * 2.0, rng.normal(size=60)])
    scores = distance_cv(X, Y, coords)
    assert scores[0] > 0.99
    assert abs(scores[1]) < 0.4


def test_parcel_sphere_centroids_lie_on_the_unit_sphere():
    vertices = _sphere_points(200, 3) * 100.0
    nodes = np.arange(200) % 5
    nodes[:10] = -1
    centroids = parcel_sphere_centroids(vertices, nodes, 5)
    assert centroids.shape == (5, 3)
    assert np.allclose(np.linalg.norm(centroids, axis=1), 1.0)


def test_spins_are_permutations_that_stay_within_a_hemisphere():
    coords = np.vstack([_sphere_points(12, 4), _sphere_points(12, 5)])
    hemi = np.array(["L"] * 12 + ["R"] * 12)
    spins = spin_permutations(coords, hemi, 50, seed=7)
    assert spins.shape == (50, 24)
    for spin in spins:
        assert sorted(spin[:12]) == list(range(12))
        assert sorted(spin[12:]) == list(range(12, 24))


def test_spins_are_reproducible_and_actually_move_regions():
    coords = np.vstack([_sphere_points(12, 4), _sphere_points(12, 5)])
    hemi = np.array(["L"] * 12 + ["R"] * 12)
    first = spin_permutations(coords, hemi, 20, seed=7)
    again = spin_permutations(coords, hemi, 20, seed=7)
    assert np.array_equal(first, again)
    assert (first != np.arange(24)).mean() > 0.5


def test_spin_p_counts_the_observed_value_among_the_nulls():
    assert spin_p(0.9, np.array([0.1, 0.2, 0.3])) == 0.25
    assert spin_p(0.15, np.array([0.1, 0.2, 0.3])) == 0.75
