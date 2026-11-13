"""Downloads the open datasets the build needs into pipeline/raw.

Run from the pipeline directory:
    .venv/bin/python -m neurosim_data.fetch
"""

import urllib.request
from pathlib import Path

from .build import HANSEN, NNT, PET_TRACERS

HANSEN_COMMIT = "f8b41da92a733f99368c1f39d4959731aa1316c1"
HANSEN_BASE = f"https://raw.githubusercontent.com/netneurolab/hansen_receptors/{HANSEN_COMMIT}"

HANSEN_FILES = {
    "data/lausanne/sc_weighted.npy": "sc_weighted.npy",
    "data/lausanne/fc_weighted.npy": "fc_weighted.npy",
    "data/lausanne/region_info_scale033.xlsx": "region_info_scale033.xlsx",
    "results/receptor_data_scale033.csv": "receptor_data_scale033.csv",
    "data/enigma_atrophy.csv": "enigma_atrophy.csv",
    "data/MEG/power_scale033.csv": "meg_power_scale033.csv",
    "data/receptor_names_pet.npy": "receptor_names_pet.npy",
    "README.md": "README.md",
}


def hansen_downloads() -> list[tuple[str, Path]]:
    """Lists every file to fetch from the Hansen et al. (2022) repository, pinned to one commit.

    Returns:
        Pairs of source URL and local destination under raw/hansen_receptors.
    """
    pairs = [(f"{HANSEN_BASE}/{src}", HANSEN / dest) for src, dest in HANSEN_FILES.items()]
    pairs += [
        (f"{HANSEN_BASE}/data/PET_parcellated/scale033/{tracer}.csv", HANSEN / "pet" / f"{tracer}.csv")
        for tracer in PET_TRACERS
    ]
    return pairs


def main() -> None:
    """Fetches the Hansen files, then the Lausanne atlas and fsaverage5 surfaces via netneurotools."""
    for url, dest in hansen_downloads():
        if dest.exists():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest)
        print(f"fetched {dest.relative_to(HANSEN.parent)}")

    from netneurotools.datasets import fetch_cammoun2012, fetch_fsaverage

    NNT.mkdir(parents=True, exist_ok=True)
    fetch_cammoun2012("fsaverage5", data_dir=str(NNT), verbose=0)
    fetch_cammoun2012("MNI152NLin2009aSym", data_dir=str(NNT), verbose=0)
    fetch_fsaverage("fsaverage5", data_dir=str(NNT), verbose=0)
    print("fetched Lausanne atlas and fsaverage5 surfaces")


if __name__ == "__main__":
    main()
