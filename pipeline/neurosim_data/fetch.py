"""Downloads the open datasets the build needs into pipeline/raw.

Run from the pipeline directory:
    .venv/bin/python -m neurosim_data.fetch
"""

import hashlib
import urllib.request
from pathlib import Path

from .build import HANSEN, NEUROVAULT, NNT, PET_TRACERS

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


NEUROVAULT_BASE = "https://neurovault.org/media/images"

NEUROVAULT_FILES = {
    "limbic": ("12296/MeanTauZMasked_Subtype1.nii.gz", "608daf149a5146106d63d9fcfeb1943c7943ba68a6b1f5ce7e1df1a713ad3dee"),
    "mtlSparing": ("12296/MeanTauZMasked_Subtype2.nii.gz", "7f0892b695433eed2ebeda479d96b03e311ef09e68e59e327cb697b4fba56360"),
    "posterior": ("12296/MeanTauZMasked_Subtype3.nii.gz", "2dc40373221f3cd10054659ae1d46e2fe2779b8558d6801b58fe298fe9238f82"),
    "leftTemporal": ("12296/MeanTauZMasked_Subtype4.nii.gz", "7ae6e42cc9a0f49fc8cf30260b34841b8a24f2cbf9a055537f3cce7b96ed8708"),
    "clinic": ("3829/mean_32_wwAV1451_1.nii.gz", "5523e24311c526e6275e28d1283a5b591756e9630a6b4d184538d4d3296591f6"),
    "clinicAtrophy": ("3829/mean_32_w_jacob_GMs8_inv.nii.gz", "957f26a729478bb9ae830f45b552f79c3e69e0d4cef249444df8223a2e2ba0b8"),
}


def neurovault_downloads() -> list[tuple[str, Path, str]]:
    """Lists the group-average patient maps to fetch from NeuroVault.

    NeuroVault files are not versioned, so each one is pinned by its SHA-256 instead of a commit.

    Returns:
        Triples of source URL, local destination under raw/neurovault and expected SHA-256.
    """
    return [
        (f"{NEUROVAULT_BASE}/{path}", NEUROVAULT / f"{name}.nii.gz", digest)
        for name, (path, digest) in NEUROVAULT_FILES.items()
    ]


def verify_checksum(path: Path, expected: str) -> None:
    """Confirms a downloaded file is the one the build was written against.

    Args:
        path: File to check.
        expected: SHA-256 hex digest the file must have.

    Raises:
        ValueError: If the digest differs.
    """
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f"{path.name} has SHA-256 {actual}, expected {expected}")


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
    """Fetches the Hansen files, the NeuroVault patient maps, then the atlas and surfaces via netneurotools."""
    for url, dest in hansen_downloads():
        if dest.exists():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest)
        print(f"fetched {dest.relative_to(HANSEN.parent)}")

    for url, dest, digest in neurovault_downloads():
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(url, dest)
            print(f"fetched {dest.relative_to(NEUROVAULT.parent)}")
        verify_checksum(dest, digest)

    from netneurotools.datasets import fetch_cammoun2012, fetch_fsaverage

    NNT.mkdir(parents=True, exist_ok=True)
    fetch_cammoun2012("fsaverage5", data_dir=str(NNT), verbose=0)
    fetch_cammoun2012("MNI152NLin2009aSym", data_dir=str(NNT), verbose=0)
    fetch_fsaverage("fsaverage5", data_dir=str(NNT), verbose=0)
    print("fetched Lausanne atlas and fsaverage5 surfaces")


if __name__ == "__main__":
    main()
