"""Desikan-Killiany parcels and how they map onto NeuroSim's 14 functional regions."""

CORTICAL_SIM_REGIONS = (
    "prefrontal", "frontal", "motor", "somato", "parietal",
    "visual", "temporal", "auditory", "broca", "wernicke",
)

_BILATERAL = {
    "lateralorbitofrontal": "prefrontal",
    "parsorbitalis": "prefrontal",
    "frontalpole": "prefrontal",
    "medialorbitofrontal": "prefrontal",
    "rostralmiddlefrontal": "prefrontal",
    "rostralanteriorcingulate": "prefrontal",
    "caudalanteriorcingulate": "prefrontal",
    "superiorfrontal": "frontal",
    "caudalmiddlefrontal": "frontal",
    "precentral": "motor",
    "paracentral": "motor",
    "postcentral": "somato",
    "superiorparietal": "parietal",
    "inferiorparietal": "parietal",
    "supramarginal": "parietal",
    "precuneus": "parietal",
    "posteriorcingulate": "parietal",
    "isthmuscingulate": "parietal",
    "lateraloccipital": "visual",
    "lingual": "visual",
    "cuneus": "visual",
    "pericalcarine": "visual",
    "transversetemporal": "auditory",
    "superiortemporal": "auditory",
    "middletemporal": "temporal",
    "inferiortemporal": "temporal",
    "fusiform": "temporal",
    "temporalpole": "temporal",
    "entorhinal": "temporal",
    "parahippocampal": "temporal",
    "insula": "temporal",
}

_LATERALISED = {
    "parsopercularis": {"L": "broca", "R": "frontal"},
    "parstriangularis": {"L": "broca", "R": "frontal"},
    "bankssts": {"L": "wernicke", "R": "temporal"},
}

DK_LABELS = tuple(sorted({*_BILATERAL, *_LATERALISED}))

_PRETTY = {
    "bankssts": "Banks of the superior temporal sulcus",
    "caudalanteriorcingulate": "Caudal anterior cingulate",
    "caudalmiddlefrontal": "Caudal middle frontal gyrus",
    "cuneus": "Cuneus",
    "entorhinal": "Entorhinal cortex",
    "frontalpole": "Frontal pole",
    "fusiform": "Fusiform gyrus",
    "inferiorparietal": "Inferior parietal lobule",
    "inferiortemporal": "Inferior temporal gyrus",
    "insula": "Insula",
    "isthmuscingulate": "Isthmus of the cingulate",
    "lateraloccipital": "Lateral occipital cortex",
    "lateralorbitofrontal": "Lateral orbitofrontal cortex",
    "lingual": "Lingual gyrus",
    "medialorbitofrontal": "Medial orbitofrontal cortex",
    "middletemporal": "Middle temporal gyrus",
    "paracentral": "Paracentral lobule",
    "parahippocampal": "Parahippocampal gyrus",
    "parsopercularis": "Pars opercularis",
    "parsorbitalis": "Pars orbitalis",
    "parstriangularis": "Pars triangularis",
    "pericalcarine": "Pericalcarine cortex",
    "postcentral": "Postcentral gyrus",
    "posteriorcingulate": "Posterior cingulate",
    "precentral": "Precentral gyrus",
    "precuneus": "Precuneus",
    "rostralanteriorcingulate": "Rostral anterior cingulate",
    "rostralmiddlefrontal": "Rostral middle frontal gyrus",
    "superiorfrontal": "Superior frontal gyrus",
    "superiorparietal": "Superior parietal lobule",
    "superiortemporal": "Superior temporal gyrus",
    "supramarginal": "Supramarginal gyrus",
    "temporalpole": "Temporal pole",
    "transversetemporal": "Transverse temporal gyrus",
}


def sim_region_for(label: str, hemi: str) -> str:
    """Returns the NeuroSim region a Desikan-Killiany parcel belongs to.

    Args:
        label: Desikan-Killiany parcel name, as used in the Lausanne scale033 atlas.
        hemi: "L" or "R".

    Returns:
        One of CORTICAL_SIM_REGIONS.

    Raises:
        KeyError: If the label is not a cortical Desikan-Killiany parcel.
    """
    if label in _LATERALISED:
        return _LATERALISED[label][hemi]
    return _BILATERAL[label]


def pretty_name(label: str) -> str:
    """Returns the human-readable anatomical name for a parcel label.

    Args:
        label: Desikan-Killiany parcel name.

    Returns:
        A display name such as "Pars opercularis".
    """
    return _PRETTY[label]
