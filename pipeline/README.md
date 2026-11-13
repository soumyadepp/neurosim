# Data pipeline

Turns open neuroimaging datasets into the two static files the app loads:

- `public/data/brain.json`: 68 cortical regions with names, networks and receptor profiles, the structural connectome, resting-state functional connectivity, and anchors for deep structures
- `public/data/cortex.bin`: the fsaverage5 pial and white-matter surfaces with a region label per vertex

You only need this to rebuild the data. The app ships with both files already built.

## Setup

Requires Python 3.12 or newer.

```bash
cd pipeline
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Fetch, build, test

```bash
.venv/bin/python -m neurosim_data.fetch              # about 11 MB into pipeline/raw (not committed)
.venv/bin/python -m neurosim_data.build ../public/data
.venv/bin/python -m pytest -q
```

`fetch` downloads the Hansen et al. (2022) files pinned to commit `f8b41da` of [netneurolab/hansen_receptors](https://github.com/netneurolab/hansen_receptors), plus the Lausanne atlas and fsaverage5 surfaces through netneurotools. The build tests are skipped until the raw data is present.

It also expects six group-average patient maps from NeuroVault (collections [12296](https://neurovault.org/collections/12296) and [3829](https://neurovault.org/collections/3829), both CC0) in `raw/neurovault`. NeuroVault files are not versioned, so each is pinned by SHA-256 and `fetch` refuses a file that does not match.

Known limitation: NeuroVault answers Python's default HTTP client with 403, so `fetch` cannot download these six itself yet. Until that is settled, fetch them once with curl and run `fetch` again to verify them:

```bash
mkdir -p raw/neurovault && cd raw/neurovault
base=https://neurovault.org/media/images
curl -L -o limbic.nii.gz        $base/12296/MeanTauZMasked_Subtype1.nii.gz
curl -L -o mtlSparing.nii.gz    $base/12296/MeanTauZMasked_Subtype2.nii.gz
curl -L -o posterior.nii.gz     $base/12296/MeanTauZMasked_Subtype3.nii.gz
curl -L -o leftTemporal.nii.gz  $base/12296/MeanTauZMasked_Subtype4.nii.gz
curl -L -o clinic.nii.gz        $base/3829/mean_32_wwAV1451_1.nii.gz
curl -L -o clinicAtrophy.nii.gz $base/3829/mean_32_w_jacob_GMs8_inv.nii.gz
```

The build also writes `src/lib/testing/spins.json`: 1,000 spatial rotations of the 68 regions, used by the app's tests to score the disease model against the measured tau maps.

## What the build does

| Module | Job |
|---|---|
| `regions.py` | Maps the 68 Desikan-Killiany regions onto the simulator's 14 functional regions and gives them readable names |
| `receptors.py` | Turns PET receptor densities into values relative to the cortical mean (1.0 = average) |
| `connectome.py` | Pairs mirror regions across hemispheres and scores how well wiring predicts resting connectivity |
| `space.py` | Converts MNI millimetres into the scene's coordinate frame |
| `mesh.py` | Labels each surface vertex with its region and packs the surfaces into one binary file |
| `build.py` | Runs all of the above and writes the output with sources and licences embedded |

The derived data carries the CC BY-NC-SA 4.0 licence of its source. See the main README for citations and terms.
