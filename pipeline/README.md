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
