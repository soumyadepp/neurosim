"""Assembles brain.json and cortex.bin from the downloaded open datasets.

Run from the pipeline directory:
    .venv/bin/python -m neurosim_data.build ../public/data
"""

import json
import sys
from pathlib import Path

import nibabel as nib
import numpy as np
import pandas as pd

from .connectome import homotopic_pairs, upper_triangle_r
from .mesh import HemisphereMesh, vertex_nodes
from .receptors import region_profile, relative_density
from .regions import pretty_name, sim_region_for
from .space import SimSpace
from .spatial import distance_cv, parcel_sphere_centroids, spin_p, spin_permutations

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
HANSEN = RAW / "hansen_receptors"
NNT = RAW / "nnt"
SURF = NNT / "tpl-fsaverage" / "fsaverage5" / "surf"
ANNOT = NNT / "atl-cammoun2012" / "fsaverage5" / "atl-Cammoun2012_space-fsaverage5_res-033_hemi-{h}_deterministic.annot"
VOLUME = NNT / "atl-cammoun2012" / "MNI152NLin2009aSym" / "atl-Cammoun2012_space-MNI152NLin2009aSym_res-033_deterministic.nii.gz"

SCENE_HALF_EXTENT = 1.1
CEREBELLUM_CENTER_MM = np.array([0.0, -62.0, -34.0])
CEREBELLUM_RADII_MM = np.array([50.0, 23.0, 30.0])

MEG_BANDS = ["delta", "theta", "alpha", "beta", "gamma1", "gamma2"]
MEG_SPINS = 10000
MEG_SPIN_SEED = 0

ENIGMA_DISORDERS = [
    "22q", "adhd", "asd", "epilepsy_gge", "epilepsy_rtle", "epilepsy_ltle", "depression",
    "ocd", "schizophrenia", "bipolar", "obesity", "schizotypy", "parkinsons",
]

RECEPTOR_NAMES = [
    "5HT1a", "5HT1b", "5HT2a", "5HT4", "5HT6", "5HTT", "A4B2", "CB1", "D1", "D2",
    "DAT", "GABAa", "H3", "M1", "mGluR5", "MOR", "NET", "NMDA", "VAChT",
]

RECEPTOR_ALIASES = {"GABAa-bz": "GABAa", "SERT": "5HTT", "MU": "MOR", "NAT": "NET"}

PET_TRACERS = [
    "5HT1a_cumi_hc8_beliveau", "5HT1a_way_hc36_savli",
    "5HT1b_az_hc36_beliveau", "5HT1b_p943_hc22_savli", "5HT1b_p943_hc65_gallezot",
    "5HT2a_alt_hc19_savli", "5HT2a_cimbi_hc29_beliveau", "5HT2a_mdl_hc3_talbot",
    "5HT4_sb20_hc59_beliveau", "5HT6_gsk_hc30_radhakrishnan",
    "5HTT_dasb_hc100_beliveau", "5HTT_dasb_hc30_savli",
    "A4B2_flubatine_hc30_hillmer",
    "CB1_FMPEPd2_hc22_laurikainen", "CB1_omar_hc77_normandin",
    "D1_SCH23390_hc13_kaller",
    "D2_fallypride_hc49_jaworska", "D2_flb457_hc37_smith", "D2_flb457_hc55_sandiego",
    "D2_raclopride_hc7_alakurtti",
    "DAT_fepe2i_hc6_sasaki", "DAT_fpcit_hc174_dukart_spect",
    "GABAa-bz_flumazenil_hc16_norgaard", "GABAa_FLUMAZENIL_c11", "GABAa_flumazenil_hc6_dukart",
    "H3_cban_hc8_gallezot",
    "M1_lsn_hc24_naganawa",
    "MU_carfentanil_hc204_kantonen", "MU_carfentanil_hc39_turtonen",
    "NAT_MRB_hc10_hesse", "NAT_MRB_hc77_ding",
    "NMDA_ge179_hc29_galovic",
    "SERT_DASB_HC30", "SERT_MADAM_c11",
    "VAChT_feobv_hc18_aghourian_sum", "VAChT_feobv_hc3_spreng",
    "VAChT_feobv_hc4_tuominen", "VAChT_feobv_hc5_bedard_sum",
    "mGluR5_abp_hc22_rosaneto", "mGluR5_abp_hc28_dubois", "mGluR5_abp_hc73_smart",
]


def receptor_of(tracer: str) -> str:
    """Canonical receptor a tracer file measures.

    Args:
        tracer: Tracer filename stem, such as "SERT_MADAM_c11".

    Returns:
        The receptor name used throughout the app, resolving historical aliases.
    """
    prefix = tracer.split("_")[0]
    return RECEPTOR_ALIASES.get(prefix, prefix)


def receptor_groups() -> dict[str, list[str]]:
    """Groups every tracer file under the receptor it measures.

    Returns:
        Receptor name to its tracer filename stems, in the published receptor order.
    """
    groups: dict[str, list[str]] = {name: [] for name in RECEPTOR_NAMES}
    for tracer in PET_TRACERS:
        groups[receptor_of(tracer)].append(tracer)
    return groups

NETWORK_NAMES = {
    "visual": "Visual",
    "somatomotor": "Somatomotor",
    "dorsal attention": "Dorsal attention",
    "ventral attention": "Ventral attention",
    "limbic": "Limbic",
    "frontoparietal": "Frontoparietal",
    "default mode": "Default mode",
}

SUBCORTICAL_PROFILE_SOURCES = {"thalamus": "thalamusproper", "hippocampus": "hippocampus", "brainstem": "brainstem"}

SOURCES = [
    {
        "name": "Structural connectome, resting-state FC and receptor maps",
        "citation": "Hansen JY et al. (2022). Mapping neurotransmitter systems to the structural and functional organization of the human neocortex. Nature Neuroscience 25, 1569-1581.",
        "license": "CC BY-NC-SA 4.0 (FC derived from HCP data, HCP open-access terms apply)",
        "url": "https://github.com/netneurolab/hansen_receptors",
    },
    {
        "name": "Lausanne multiscale parcellation (scale 33)",
        "citation": "Cammoun L et al. (2012). Mapping the human connectome at multiple scales with diffusion spectrum MRI. J Neurosci Methods 203, 386-397.",
        "license": "Distributed via netneurotools (BSD-3-Clause)",
        "url": "https://github.com/netneurolab/netneurotools",
    },
    {
        "name": "fsaverage5 cortical surface",
        "citation": "Fischl B et al. (1999). High-resolution intersubject averaging and a coordinate system for the cortical surface. Human Brain Mapping 8, 272-284.",
        "license": "FreeSurfer software license",
        "url": "https://surfer.nmr.mgh.harvard.edu/",
    },
    {
        "name": "Whole-brain Hopf model",
        "citation": "Deco G et al. (2017). The dynamics of resting fluctuations in the brain: metastability and its dynamical cortical core. Scientific Reports 7, 3095.",
        "license": "Method",
        "url": "https://doi.org/10.1038/s41598-017-03073-5",
    },
]


def _round(a: np.ndarray, digits: int) -> list:
    return np.round(a, digits).tolist()


def _load_region_info() -> pd.DataFrame:
    info = pd.read_excel(HANSEN / "region_info_scale033.xlsx")
    return info.drop(columns=[c for c in info.columns if c.startswith("Unnamed")])


def _load_hemisphere(h: str, node_labels: list[str], offset: int):
    pial, faces = nib.freesurfer.read_geometry(str(SURF / f"{'lh' if h == 'L' else 'rh'}.pial"))
    white, _ = nib.freesurfer.read_geometry(str(SURF / f"{'lh' if h == 'L' else 'rh'}.white"))
    labels, _, names = nib.freesurfer.read_annot(str(ANNOT).format(h=h))
    nodes = vertex_nodes(labels, [n.decode() for n in names], node_labels, offset)
    return pial, white, faces, nodes


def _volume_centroids(ids: dict[str, int]) -> dict[str, np.ndarray]:
    img = nib.load(str(VOLUME))
    data = np.asarray(img.dataobj)
    out = {}
    for key, value in ids.items():
        vox = np.argwhere(data == value)
        out[key] = nib.affines.apply_affine(img.affine, vox)
    return out


def _sphere_centroids(hemispheres: dict, hemis: list[str]) -> np.ndarray:
    out = np.zeros((len(hemis), 3))
    for h in ("L", "R"):
        idx = [i for i, hh in enumerate(hemis) if hh == h]
        vertices, _ = nib.freesurfer.read_geometry(str(SURF / f"{'lh' if h == 'L' else 'rh'}.sphere"))
        out[idx] = parcel_sphere_centroids(vertices, hemispheres[h][3] - idx[0], len(idx))
    return out


def receptor_meg_validation(
    receptors: np.ndarray, meg: np.ndarray, coords: np.ndarray, sphere: np.ndarray, hemis: list[str], n_spins: int,
) -> dict:
    """Tests whether receptor density predicts MEG band power beyond what smoothness explains.

    The score is the held-out correlation from distance-dependent cross-validation. The null
    repeats the same analysis with the receptor maps spun on the sphere, so it shows how well
    maps that are equally smooth but anatomically misplaced would have done.

    Args:
        receptors: Receptor density, one row per region.
        meg: MEG band power, one row per region and one column per band.
        coords: Region centroids, used to rank regions by distance.
        sphere: Region centroids on the unit sphere, used to spin the maps.
        hemis: Hemisphere label per region.
        n_spins: Number of spatial rotations in the null.

    Returns:
        Per-band score, null mean and spin-test p-value, with the number of spins.
    """
    observed = distance_cv(receptors, meg, coords)
    spins = spin_permutations(sphere, np.array(hemis), n_spins, MEG_SPIN_SEED)
    null = np.array([distance_cv(receptors[spin], meg, coords) for spin in spins])
    return {
        "bands": MEG_BANDS,
        "r": _round(observed, 3),
        "nullMean": _round(null.mean(axis=0), 3),
        "p": [round(spin_p(observed[k], null[:, k]), 4) for k in range(len(MEG_BANDS))],
        "spins": n_spins,
    }


def build(out_dir: Path, meg_spins: int = MEG_SPINS) -> None:
    """Writes brain.json and cortex.bin into out_dir.

    Args:
        out_dir: Destination directory, created if missing.
        meg_spins: Spatial rotations used for the receptor to MEG null. The published figures
            use the default; fewer is only for fast checks of the build itself.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    info = _load_region_info()
    cortex_mask = (info.structure == "cortex").to_numpy()
    cortex = info[cortex_mask].reset_index(drop=True)
    labels, hemis = cortex.label.tolist(), cortex.hemisphere.tolist()

    sc = np.load(HANSEN / "sc_weighted.npy")
    fc = np.load(HANSEN / "fc_weighted.npy")

    hemispheres = {}
    for h in ("L", "R"):
        idx = [i for i, hh in enumerate(hemis) if hh == h]
        hemispheres[h] = _load_hemisphere(h, [labels[i] for i in idx], offset=idx[0])

    space = SimSpace.fit(np.vstack([hemispheres[h][0] for h in "LR"]), SCENE_HALF_EXTENT)

    meshes, blobs, offset = [], [], 0
    for h in ("L", "R"):
        pial, white, faces, nodes = hemispheres[h]
        mesh = HemisphereMesh(h, space.to_sim(pial), space.to_sim(white), faces, nodes)
        blob, layout = mesh.to_bytes(offset)
        blobs.append(blob)
        meshes.append(layout)
        offset += len(blob)
    (out_dir / "cortex.bin").write_bytes(b"".join(blobs))

    centroids = np.zeros((len(labels), 3))
    for h in ("L", "R"):
        pial, _, _, nodes = hemispheres[h]
        for node in np.unique(nodes[nodes >= 0]):
            centroids[node] = space.to_sim(pial[nodes == node]).mean(axis=0)

    rel_all = {}
    for receptor, tracers in receptor_groups().items():
        densities = [
            relative_density(np.loadtxt(HANSEN / "pet" / f"{tracer}.csv", delimiter=",").ravel(), cortex_mask)
            for tracer in tracers
        ]
        rel_all[receptor] = np.mean(densities, axis=0)
    rel_cortex = {name: values[cortex_mask] for name, values in rel_all.items()}
    names = list(RECEPTOR_NAMES)

    sim_regions = sorted({sim_region_for(l, h) for l, h in zip(labels, hemis)})
    profiles = {
        region: region_profile(rel_cortex, [i for i, (l, h) in enumerate(zip(labels, hemis)) if sim_region_for(l, h) == region])
        for region in sim_regions
    }
    for region, source in SUBCORTICAL_PROFILE_SOURCES.items():
        rows = np.flatnonzero((info.label == source).to_numpy())
        profiles[region] = region_profile(rel_all, rows.tolist())
    profiles["cerebellum"] = {name: 1.0 for name in names}

    sub = info[~cortex_mask]
    ids = {f"{row.label}_{row.hemisphere}": int(row.id) for row in sub.itertuples()}
    vox = _volume_centroids(ids)
    stem = vox["brainstem_L"]
    z_hi, z_lo = np.percentile(stem[:, 2], 95), np.percentile(stem[:, 2], 5)
    anchors = {
        "thalamus": {h: _round(space.to_sim(vox[f"thalamusproper_{h}"].mean(axis=0, keepdims=True))[0], 4) for h in "LR"},
        "hippocampus": {h: _round(space.to_sim(vox[f"hippocampus_{h}"].mean(axis=0, keepdims=True))[0], 4) for h in "LR"},
        "hippocampusSpread": _round(space.to_sim(vox["hippocampus_L"]).std(axis=0), 4),
        "brainstem": {
            "top": _round(space.to_sim(stem[stem[:, 2] >= z_hi].mean(axis=0, keepdims=True))[0], 4),
            "bottom": _round(space.to_sim(stem[stem[:, 2] <= z_lo].mean(axis=0, keepdims=True))[0], 4),
            "radius": round(space.length(float(np.ptp(stem[:, 0])) / 2), 4),
        },
        "cerebellum": {
            "center": _round(space.to_sim(CEREBELLUM_CENTER_MM[None])[0], 4),
            "radii": _round(np.array([space.length(r) for r in CEREBELLUM_RADII_MM]), 4),
        },
    }

    nodes_json = [
        {
            "index": i,
            "label": label,
            "name": pretty_name(label),
            "hemi": hemi,
            "simRegion": sim_region_for(label, hemi),
            "network": NETWORK_NAMES.get(str(cortex.yeo_7[i]), str(cortex.yeo_7[i])),
            "economo": str(cortex.von_economo[i]),
            "centroid": _round(centroids[i], 4),
            "receptors": [round(float(rel_cortex[n][i]), 4) for n in names],
        }
        for i, (label, hemi) in enumerate(zip(labels, hemis))
    ]

    iu = np.triu_indices(len(labels), 1)
    meg = np.genfromtxt(HANSEN / "meg_power_scale033.csv", delimiter=",")
    meg_receptors = receptor_meg_validation(
        np.column_stack([rel_cortex[n] for n in names]), meg, centroids, _sphere_centroids(hemispheres, hemis), hemis, meg_spins,
    )
    brain = {
        "version": 1,
        "nodes": nodes_json,
        "sc": _round(sc / sc.max(), 5),
        "fc": _round(fc, 4),
        "homotopicPairs": homotopic_pairs(labels, hemis),
        "receptors": {
            "names": names,
            "simRegions": {r: {k: round(v, 4) for k, v in p.items()} for r, p in profiles.items()},
            "estimated": ["cerebellum"],
        },
        "anchors": anchors,
        "meg": {"bands": MEG_BANDS, "values": _round(meg, 4)},
        "enigma": {"disorders": ENIGMA_DISORDERS, "values": _round(np.genfromtxt(HANSEN / "enigma_atrophy.csv", delimiter=","), 4)},
        "mesh": {"file": "cortex.bin", "hemispheres": meshes},
        "validation": {
            "scFcR": round(upper_triangle_r(sc, fc), 4),
            "empiricalMeanFc": round(float(fc[iu].mean()), 4),
            "megReceptors": meg_receptors,
        },
        "space": {"mmPerUnit": round(space.mm_per_unit, 4), "centerMm": _round(space.center_mm, 3)},
        "sources": SOURCES,
    }
    (out_dir / "brain.json").write_text(json.dumps(brain, separators=(",", ":")))


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "public" / "data")
