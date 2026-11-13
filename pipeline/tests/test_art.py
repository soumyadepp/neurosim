import json

import numpy as np
import pytest

from neurosim_data.art import ART_PATH, LOBE_OF, build, chaikin, douglas_peucker, marching_squares, path_d
from neurosim_data.build import RAW


def test_marching_squares_traces_a_rectangle():
    mask = np.zeros((12, 12), dtype=bool)
    mask[2:6, 3:9] = True
    loops = marching_squares(mask)
    assert len(loops) == 1
    pts = loops[0]
    assert np.allclose(pts[0], pts[-1])
    assert 2.4 <= pts[:, 0].min() <= 3.1 and 7.9 <= pts[:, 0].max() <= 8.6
    assert 1.4 <= pts[:, 1].min() <= 2.1 and 4.9 <= pts[:, 1].max() <= 5.6


def test_marching_squares_separates_two_blobs():
    mask = np.zeros((10, 20), dtype=bool)
    mask[2:5, 2:6] = True
    mask[5:8, 12:18] = True
    assert len(marching_squares(mask)) == 2


def test_douglas_peucker_drops_collinear_points_and_keeps_corners():
    flat = np.array([[0, 0], [1, 0.005], [2, -0.005], [4, 0]], dtype=float)
    assert len(douglas_peucker(flat, 0.5)) == 2
    corner = np.array([[0, 0], [1, 0.005], [2, 0], [4, 0], [4, 4]], dtype=float)
    out = douglas_peucker(corner, 0.5)
    assert [list(p) for p in out] == [[0, 0], [4, 0], [4, 4]]


def test_chaikin_smooths_and_stays_inside_the_hull():
    pts = np.array([[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], dtype=float)
    out = chaikin(pts, 2)
    assert len(out) > len(pts)
    assert out[:, 0].min() >= 0 and out[:, 0].max() <= 4


def test_path_d_is_a_closed_one_decimal_path():
    d = path_d(np.array([[1.234, 2.0], [3.0, 4.555], [1.234, 2.0]]))
    assert d == "M1.2 2L3 4.6Z"


def test_every_desikan_parcel_has_a_lobe_and_insula_reads_as_temporal():
    assert len(LOBE_OF) == 34
    assert LOBE_OF["insula"] == "temporal"
    assert set(LOBE_OF.values()) == {"frontal", "parietal", "temporal", "occipital"}


@pytest.mark.skipif(not (RAW / "hansen_receptors" / "sc_weighted.npy").exists(), reason="raw data not downloaded")
def test_build_writes_real_geometry(tmp_path):
    out = tmp_path / "brainArt.json"
    build(out)
    art = json.loads(out.read_text())
    assert art["viewBox"] == [400, 300]
    assert {l["id"] for l in art["lobes"]} == {"frontal", "parietal", "temporal", "occipital"}
    for piece in [art["silhouette"], art["hippocampus"]["path"], art["brainstem"]["path"], art["cerebellum"]["path"], *[l["path"] for l in art["lobes"]]]:
        assert piece.startswith("M") and piece.endswith("Z")
    assert len(art["sulci"]) >= 4
    assert len(art["parcels"]) == 34
    for p in art["parcels"].values():
        assert 0 <= p["x"] <= 400 and 0 <= p["y"] <= 300 and p["r"] > 0
    assert art["parcels"]["entorhinal"]["y"] > art["parcels"]["superiorfrontal"]["y"]
    assert art["parcels"]["frontalpole"]["x"] < art["parcels"]["pericalcarine"]["x"]
    assert ART_PATH.name == "brainArt.json"
