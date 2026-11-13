import pytest

from neurosim_data.regions import CORTICAL_SIM_REGIONS, DK_LABELS, pretty_name, sim_region_for


def test_every_desikan_label_maps_on_both_hemispheres():
    for label in DK_LABELS:
        for hemi in ("L", "R"):
            assert sim_region_for(label, hemi) in CORTICAL_SIM_REGIONS


def test_there_are_34_labels_per_hemisphere():
    assert len(DK_LABELS) == 34
    assert len(set(DK_LABELS)) == 34


def test_language_areas_are_left_lateralised():
    assert sim_region_for("parsopercularis", "L") == "broca"
    assert sim_region_for("parstriangularis", "L") == "broca"
    assert sim_region_for("bankssts", "L") == "wernicke"
    assert sim_region_for("parsopercularis", "R") != "broca"
    assert sim_region_for("bankssts", "R") != "wernicke"


def test_every_cortical_sim_region_gets_at_least_one_parcel():
    covered = {sim_region_for(label, hemi) for label in DK_LABELS for hemi in ("L", "R")}
    assert covered == set(CORTICAL_SIM_REGIONS)


def test_core_anatomy_is_where_textbooks_put_it():
    assert sim_region_for("precentral", "R") == "motor"
    assert sim_region_for("postcentral", "L") == "somato"
    assert sim_region_for("pericalcarine", "L") == "visual"
    assert sim_region_for("transversetemporal", "R") == "auditory"


def test_unknown_label_raises():
    with pytest.raises(KeyError):
        sim_region_for("corpuscallosum", "L")


def test_pretty_names_are_human_readable():
    assert pretty_name("parsopercularis") == "Pars opercularis"
    assert pretty_name("bankssts") == "Banks of the superior temporal sulcus"
    assert all(pretty_name(label) for label in DK_LABELS)
