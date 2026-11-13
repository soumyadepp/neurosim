import pytest

from neurosim_data.build import PET_TRACERS, RECEPTOR_NAMES, receptor_groups, receptor_of


def test_names_match_the_published_set():
    assert len(RECEPTOR_NAMES) == 19
    assert set(RECEPTOR_NAMES) == set(receptor_groups())


@pytest.mark.parametrize(
    ("filename", "expected"),
    [
        ("GABAa-bz_flumazenil_hc16_norgaard", "GABAa"),
        ("GABAa_flumazenil_hc6_dukart", "GABAa"),
        ("SERT_MADAM_c11", "5HTT"),
        ("5HTT_dasb_hc100_beliveau", "5HTT"),
        ("MU_carfentanil_hc204_kantonen", "MOR"),
        ("NAT_MRB_hc77_ding", "NET"),
        ("mGluR5_abp_hc73_smart", "mGluR5"),
        ("D2_flb457_hc55_sandiego", "D2"),
    ],
)
def test_maps_each_tracer_to_its_canonical_receptor(filename, expected):
    assert receptor_of(filename) == expected


def test_every_tracer_is_assigned_and_none_is_lost():
    groups = receptor_groups()
    assigned = sorted(f for files in groups.values() for f in files)
    assert assigned == sorted(PET_TRACERS)
    assert len(PET_TRACERS) == 41


def test_receptors_with_several_tracers_keep_them_all():
    groups = receptor_groups()
    assert len(groups["VAChT"]) == 4
    assert len(groups["D2"]) == 4
    assert len(groups["GABAa"]) == 3
    assert len(groups["NMDA"]) == 1
