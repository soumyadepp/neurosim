import pytest

from neurosim_data.build import HANSEN, NEUROVAULT, PET_TRACERS, TAU_ATROPHY_MAP, TAU_MAPS
from neurosim_data.fetch import HANSEN_COMMIT, hansen_downloads, neurovault_downloads, verify_checksum


def test_pins_every_download_to_one_commit():
    urls = [url for url, _ in hansen_downloads()]
    assert urls and all(f"/{HANSEN_COMMIT}/" in url for url in urls)


def test_lands_files_where_the_build_reads_them():
    dests = {dest.relative_to(HANSEN).as_posix() for _, dest in hansen_downloads()}
    assert {"sc_weighted.npy", "fc_weighted.npy", "region_info_scale033.xlsx", "enigma_atrophy.csv", "meg_power_scale033.csv"} <= dests
    assert {f"pet/{tracer}.csv" for tracer in PET_TRACERS} <= dests
    assert len([d for d in dests if d.startswith("pet/")]) == 41


def test_fetches_every_patient_map_the_build_reads():
    dests = {dest.relative_to(NEUROVAULT).as_posix() for _, dest, _ in neurovault_downloads()}
    assert dests == {f"{name}.nii.gz" for name in [*TAU_MAPS, TAU_ATROPHY_MAP]}


def test_pins_every_patient_map_by_checksum():
    assert all(len(digest) == 64 for _, _, digest in neurovault_downloads())


def test_rejects_a_download_that_is_not_the_pinned_file(tmp_path):
    path = tmp_path / "map.nii.gz"
    path.write_bytes(b"not the file")
    with pytest.raises(ValueError, match="map.nii.gz"):
        verify_checksum(path, "0" * 64)
