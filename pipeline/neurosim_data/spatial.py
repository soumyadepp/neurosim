"""Spatially aware statistics for brain maps.

Brain maps are smooth, so neighbouring regions carry nearly the same value. Two consequences
follow, and both make a naive score look far better than it is: a model tested on regions next
to its training regions is partly being asked to repeat itself, and any two smooth maps
correlate more than chance. The functions here are the standard corrections for each.
"""

import numpy as np
from scipy.optimize import linear_sum_assignment
from scipy.spatial.distance import cdist


def distance_cv(X: np.ndarray, Y: np.ndarray, coords: np.ndarray, test_fraction: float = 0.25) -> np.ndarray:
    """Scores a linear model on the regions farthest from the ones it was fitted on.

    Every region takes a turn as the source. The model is fitted on the regions closest to the
    source and scored on the farthest ones, so the test set is never adjacent to the training
    set. This is the distance-dependent cross-validation of Hansen et al. 2022.

    Args:
        X: Predictors, one row per region.
        Y: Targets, one row per region and one column per target.
        coords: Region coordinates, used only to rank regions by distance.
        test_fraction: Share of regions held out for each source.

    Returns:
        The median held-out Pearson correlation across sources, one value per target column.
    """
    n = len(X)
    n_train = n - int(round(n * test_fraction))
    order = np.argsort(cdist(coords, coords), axis=1)
    scores = np.zeros((n, Y.shape[1]))
    for source in range(n):
        train, test = order[source, :n_train], order[source, n_train:]
        mean, std = X[train].mean(axis=0), X[train].std(axis=0)
        std[std == 0] = 1.0
        design = np.column_stack([np.ones(n_train), (X[train] - mean) / std])
        weights, *_ = np.linalg.lstsq(design, Y[train], rcond=None)
        predicted = np.column_stack([np.ones(len(test)), (X[test] - mean) / std]) @ weights
        scores[source] = _columnwise_r(predicted, Y[test])
    return np.median(scores, axis=0)


def _columnwise_r(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a = a - a.mean(axis=0)
    b = b - b.mean(axis=0)
    denominator = np.sqrt((a**2).sum(axis=0) * (b**2).sum(axis=0))
    denominator[denominator == 0] = np.inf
    return (a * b).sum(axis=0) / denominator


def parcel_sphere_centroids(sphere_vertices: np.ndarray, nodes: np.ndarray, n_nodes: int) -> np.ndarray:
    """Places each parcel at the mean of its vertices on the inflated sphere.

    Args:
        sphere_vertices: Vertex coordinates of one hemisphere's spherical surface.
        nodes: Parcel index per vertex, negative where the vertex belongs to no parcel.
        n_nodes: Number of parcels in the hemisphere, indexed from zero.

    Returns:
        Unit vectors, one per parcel.
    """
    centroids = np.array([sphere_vertices[nodes == node].mean(axis=0) for node in range(n_nodes)])
    return centroids / np.linalg.norm(centroids, axis=1, keepdims=True)


def spin_permutations(coords: np.ndarray, hemi: np.ndarray, n_spins: int, seed: int) -> np.ndarray:
    """Generates spatially constrained permutations by rotating parcels on the sphere.

    Each spin applies one random rotation to the left hemisphere and its mirror image to the
    right, then hands every original parcel the value of the rotated parcel that landed on it,
    using an optimal one-to-one matching. A spun map keeps its values and its smoothness but
    loses its alignment with anatomy, which is the null a smooth brain map should be held to
    (Alexander-Bloch et al. 2018, with the one-to-one matching of Markello and Misic 2021).

    Args:
        coords: Unit sphere coordinates, one row per parcel.
        hemi: Hemisphere label per parcel, "L" or "R".
        n_spins: Number of permutations to draw.
        seed: Seed for the random rotations.

    Returns:
        Integer array of shape (n_spins, n_parcels). Row s maps each parcel to the parcel whose
        value it takes in spin s, always within the same hemisphere.
    """
    rng = np.random.default_rng(seed)
    mirror = np.diag([-1.0, 1.0, 1.0])
    left, right = np.flatnonzero(hemi == "L"), np.flatnonzero(hemi == "R")
    spins = np.zeros((n_spins, len(coords)), dtype=int)
    for s in range(n_spins):
        rotation = _random_rotation(rng)
        for index, turn in ((left, rotation), (right, mirror @ rotation @ mirror)):
            _, match = linear_sum_assignment(cdist(coords[index], coords[index] @ turn.T))
            spins[s, index] = index[match]
    return spins


def _random_rotation(rng: np.random.Generator) -> np.ndarray:
    q, r = np.linalg.qr(rng.normal(size=(3, 3)))
    q = q * np.sign(np.diag(r))
    if np.linalg.det(q) < 0:
        q[:, 0] = -q[:, 0]
    return q


def spin_p(observed: float, null: np.ndarray) -> float:
    """One-sided permutation p-value, counting the observed value among the nulls.

    Args:
        observed: Score on the real data.
        null: Scores on spun data.

    Returns:
        The share of scores, real one included, at least as large as the observed score.
    """
    return float((1 + np.sum(null >= observed)) / (1 + len(null)))
