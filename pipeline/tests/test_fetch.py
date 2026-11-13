from neurosim_data.build import HANSEN, PET_TRACERS
from neurosim_data.fetch import HANSEN_COMMIT, hansen_downloads


def test_pins_every_download_to_one_commit():
    urls = [url for url, _ in hansen_downloads()]
    assert urls and all(f"/{HANSEN_COMMIT}/" in url for url in urls)


def test_lands_files_where_the_build_reads_them():
    dests = {dest.relative_to(HANSEN).as_posix() for _, dest in hansen_downloads()}
    assert {"sc_weighted.npy", "fc_weighted.npy", "region_info_scale033.xlsx", "enigma_atrophy.csv", "meg_power_scale033.csv"} <= dests
    assert {f"pet/{tracer}.csv" for tracer in PET_TRACERS} <= dests
    assert len([d for d in dests if d.startswith("pet/")]) == 41
