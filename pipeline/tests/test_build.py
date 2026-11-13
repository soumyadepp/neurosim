import json
from pathlib import Path

import numpy as np
import pytest

from neurosim_data.build import RAW, build

FAST_SPINS = 40

pytestmark = pytest.mark.skipif(not (RAW / "hansen_receptors" / "sc_weighted.npy").exists(), reason="raw data not downloaded")


@pytest.fixture(scope="module")
def out(tmp_path_factory) -> Path:
    target = tmp_path_factory.mktemp("data")
    build(target, n_spins=FAST_SPINS, spins_out=target / "spins.json")
    return target


@pytest.fixture(scope="module")
def brain(out) -> dict:
    return json.loads((out / "brain.json").read_text())


def test_has_68_cortical_nodes_with_matching_matrices(brain):
    assert len(brain["nodes"]) == 68
    sc, fc = np.array(brain["sc"]), np.array(brain["fc"])
    assert sc.shape == fc.shape == (68, 68)
    np.testing.assert_allclose(sc, sc.T)
    assert sc.max() == pytest.approx(1.0)
    np.testing.assert_allclose(np.diag(fc), 1.0)


def test_left_nodes_sit_left_of_the_midline(brain):
    xs = {h: [n["centroid"][0] for n in brain["nodes"] if n["hemi"] == h] for h in "LR"}
    assert max(xs["L"]) < 0 < min(xs["R"])


def test_frontal_nodes_are_in_front_of_occipital_nodes(brain):
    z = {n["label"]: n["centroid"][2] for n in brain["nodes"] if n["hemi"] == "L"}
    assert z["frontalpole"] > z["precentral"] > z["lateraloccipital"]


def test_every_node_carries_a_sim_region_network_and_receptor_profile(brain):
    names = brain["receptors"]["names"]
    assert {"GABAa", "NMDA", "D1", "D2", "5HT1a", "M1"} <= set(names)
    for node in brain["nodes"]:
        assert node["simRegion"]
        assert node["network"]
        assert len(node["receptors"]) == len(names)


def test_receptors_average_to_one_over_cortex(brain):
    dens = np.array([n["receptors"] for n in brain["nodes"]])
    np.testing.assert_allclose(dens.mean(axis=0), 1.0, atol=1e-4)


def test_sim_region_profiles_cover_subcortex(brain):
    profiles = brain["receptors"]["simRegions"]
    for region in ("prefrontal", "motor", "thalamus", "hippocampus", "brainstem", "cerebellum"):
        assert region in profiles


def test_homotopic_pairs_join_matching_parcels(brain):
    nodes = brain["nodes"]
    assert len(brain["homotopicPairs"]) == 34
    for left, right in brain["homotopicPairs"]:
        assert nodes[left]["label"] == nodes[right]["label"]
        assert nodes[left]["hemi"] == "L" and nodes[right]["hemi"] == "R"


def test_subcortical_anchors_sit_below_and_behind_cortex(brain):
    a = brain["anchors"]
    assert a["thalamus"]["L"][0] < 0 < a["thalamus"]["R"][0]
    assert a["cerebellum"]["center"][1] < a["thalamus"]["L"][1]
    assert a["brainstem"]["bottom"][1] < a["brainstem"]["top"][1]


def test_mesh_binary_matches_its_layout(out, brain):
    blob = (out / brain["mesh"]["file"]).read_bytes()
    for h in brain["mesh"]["hemispheres"]:
        nodes = np.frombuffer(blob, dtype="<i2", offset=h["nodeOffset"], count=h["vertexCount"])
        faces = np.frombuffer(blob, dtype="<u4", offset=h["faceOffset"], count=h["faceCount"] * 3)
        assert faces.max() < h["vertexCount"]
        labelled = nodes[nodes >= 0]
        assert labelled.size > 0.85 * h["vertexCount"]
        hemis = {brain["nodes"][i]["hemi"] for i in np.unique(labelled)}
        assert hemis == {h["hemi"]}


def test_baseline_fits_are_recorded(brain):
    v = brain["validation"]
    assert 0.3 < v["scFcR"] < 0.6
    assert v["empiricalMeanFc"] > 0


def test_sources_are_cited(brain):
    assert len(brain["sources"]) >= 3
    for s in brain["sources"]:
        assert s["citation"] and s["license"] and s["url"]


def test_carries_all_nineteen_receptor_maps(brain):
    assert len(brain["receptors"]["names"]) == 19
    assert "VAChT" in brain["receptors"]["names"]
    assert "MOR" in brain["receptors"]["names"]
    for node in brain["nodes"]:
        assert len(node["receptors"]) == 19


def test_carries_meg_band_power_per_region(brain):
    meg = brain["meg"]
    assert meg["bands"] == ["delta", "theta", "alpha", "beta", "gamma1", "gamma2"]
    assert len(meg["values"]) == 68
    assert all(len(row) == 6 for row in meg["values"])
    assert all(v > 0 for row in meg["values"] for v in row)


def test_carries_enigma_atrophy_per_region(brain):
    enigma = brain["enigma"]
    assert len(enigma["disorders"]) == 13
    assert "parkinsons" in enigma["disorders"]
    assert len(enigma["values"]) == 68
    assert all(len(row) == 13 for row in enigma["values"])


def test_receptor_meg_validation_reports_every_band_against_its_null(brain):
    result = brain["validation"]["megReceptors"]
    assert result["bands"] == brain["meg"]["bands"]
    assert result["spins"] == FAST_SPINS
    for key in ("r", "nullMean", "p"):
        assert len(result[key]) == len(result["bands"])
    assert all(0 < p <= 1 for p in result["p"])
    assert all(r > null for r, null in zip(result["r"], result["nullMean"]))


def test_carries_measured_tau_for_every_region_and_map(brain):
    tau = brain["tau"]
    assert tau["maps"] == ["limbic", "mtlSparing", "posterior", "leftTemporal", "clinic"]
    assert len(tau["values"]) == 68
    assert all(len(row) == len(tau["maps"]) for row in tau["values"])


def test_limbic_tau_peaks_in_the_entorhinal_cortex(brain):
    limbic = [row[0] for row in brain["tau"]["values"]]
    assert brain["nodes"][int(np.argmax(limbic))]["label"] == "entorhinal"


def test_posterior_tau_peaks_outside_the_medial_temporal_lobe(brain):
    posterior = [row[2] for row in brain["tau"]["values"]]
    assert brain["nodes"][int(np.argmax(posterior))]["label"] not in ("entorhinal", "parahippocampal")


def test_measured_tau_and_atrophy_agree_beyond_their_null(brain):
    result = brain["validation"]["tauAtrophy"]
    assert result["r"] > result["nullMean"]
    assert result["spins"] == FAST_SPINS


def test_writes_spins_as_within_hemisphere_permutations(out, brain):
    spins = json.loads((out / "spins.json").read_text())
    hemis = [node["hemi"] for node in brain["nodes"]]
    assert len(spins) == FAST_SPINS
    for spin in spins:
        assert sorted(spin) == list(range(68))
        assert all(hemis[i] == hemis[j] for i, j in enumerate(spin))
