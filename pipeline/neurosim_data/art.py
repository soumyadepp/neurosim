"""2D lateral brain artwork generated from the real fsaverage5 anatomy.

Projects the left hemisphere's pial surface onto the sagittal plane (front to the left), traces
the silhouette, the four lobes and the deepest sulci from what is actually visible from the left,
outlines the hippocampus and brainstem from the Cammoun atlas volume, and records a 2D anchor for
every Desikan-Killiany parcel so the landing page can animate tau at real locations.

Run from the pipeline directory:
    .venv/bin/python -m neurosim_data.art
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path

import nibabel as nib
import numpy as np
from scipy import ndimage

from .build import ANNOT, CEREBELLUM_CENTER_MM, CEREBELLUM_RADII_MM, SURF, VOLUME, _load_region_info

ART_PATH = Path(__file__).resolve().parent.parent.parent / "src" / "lib" / "landing" / "brainArt.json"

WIDTH, HEIGHT, MARGIN = 400, 300, 16
CELL = 2.0
COLS, ROWS = int(WIDTH / CELL), int(HEIGHT / CELL)
SULCAL_CURVATURE = 0.04
SULCUS_MIN_CELLS = 25
MAX_SULCI = 14

LOBE_OF = {
    "superiorfrontal": "frontal", "rostralmiddlefrontal": "frontal", "caudalmiddlefrontal": "frontal",
    "parsopercularis": "frontal", "parstriangularis": "frontal", "parsorbitalis": "frontal",
    "lateralorbitofrontal": "frontal", "medialorbitofrontal": "frontal", "precentral": "frontal",
    "paracentral": "frontal", "frontalpole": "frontal", "rostralanteriorcingulate": "frontal",
    "caudalanteriorcingulate": "frontal",
    "postcentral": "parietal", "supramarginal": "parietal", "superiorparietal": "parietal",
    "inferiorparietal": "parietal", "precuneus": "parietal", "posteriorcingulate": "parietal",
    "isthmuscingulate": "parietal",
    "superiortemporal": "temporal", "middletemporal": "temporal", "inferiortemporal": "temporal",
    "bankssts": "temporal", "fusiform": "temporal", "transversetemporal": "temporal",
    "entorhinal": "temporal", "temporalpole": "temporal", "parahippocampal": "temporal",
    "insula": "temporal",
    "lateraloccipital": "occipital", "lingual": "occipital", "pericalcarine": "occipital",
    "cuneus": "occipital",
}

EDGE_MIDPOINTS = {0: (0.5, 0.0), 1: (1.0, 0.5), 2: (0.5, 1.0), 3: (0.0, 0.5)}

MS_SEGMENTS = {
    1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)], 5: [(0, 1), (3, 2)], 6: [(0, 2)],
    7: [(3, 0)], 8: [(3, 0)], 9: [(0, 2)], 10: [(0, 3), (2, 1)], 11: [(0, 1)], 12: [(3, 1)],
    13: [(2, 1)], 14: [(3, 2)],
}


def project(points_mm: np.ndarray) -> np.ndarray:
    """Projects RAS millimetres onto the sagittal plane with the face to the left and up on top.

    Args:
        points_mm: (n, 3) RAS coordinates.

    Returns:
        (n, 2) plane coordinates.
    """
    return np.column_stack([-points_mm[:, 1], -points_mm[:, 2]])


@dataclass(frozen=True)
class Frame:
    """Similarity transform from projected millimetres into the SVG viewBox.

    Attributes:
        scale: ViewBox units per millimetre.
        offset: Translation applied after scaling.
    """

    scale: float
    offset: np.ndarray

    @classmethod
    def fit(cls, points: np.ndarray) -> "Frame":
        """Fits all points into the viewBox with a margin, preserving aspect ratio.

        Args:
            points: (n, 2) projected coordinates.

        Returns:
            The fitted frame.
        """
        lo, hi = points.min(axis=0), points.max(axis=0)
        scale = min((WIDTH - 2 * MARGIN) / (hi - lo)[0], (HEIGHT - 2 * MARGIN) / (hi - lo)[1])
        center = (lo + hi) / 2
        return cls(scale, np.array([WIDTH / 2, HEIGHT / 2]) - center * scale)

    def apply(self, points: np.ndarray) -> np.ndarray:
        return points * self.scale + self.offset


def marching_squares(mask: np.ndarray) -> list[np.ndarray]:
    """Traces the boundaries of a binary mask as closed loops in (x, y) pixel-centre coordinates.

    Args:
        mask: (rows, cols) boolean image.

    Returns:
        Closed loops, each (n, 2) with the first point repeated at the end, largest first.
    """
    m = np.pad(mask, 1).astype(np.int8)
    tl, tr = m[:-1, :-1], m[:-1, 1:]
    bl, br = m[1:, :-1], m[1:, 1:]
    cases = tl * 8 + tr * 4 + br * 2 + bl * 1
    segments: dict[tuple[int, int], list[tuple[int, int]]] = {}

    def key(p: tuple[float, float]) -> tuple[int, int]:
        return int(round(p[0] * 2)), int(round(p[1] * 2))

    for r, c in zip(*np.nonzero((cases > 0) & (cases < 15))):
        for a, b in MS_SEGMENTS[cases[r, c]]:
            pa = (c + EDGE_MIDPOINTS[a][0] - 1, r + EDGE_MIDPOINTS[a][1] - 1)
            pb = (c + EDGE_MIDPOINTS[b][0] - 1, r + EDGE_MIDPOINTS[b][1] - 1)
            segments.setdefault(key(pa), []).append(key(pb))
            segments.setdefault(key(pb), []).append(key(pa))

    loops: list[np.ndarray] = []
    visited: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for start in list(segments):
        for first in segments[start]:
            if (start, first) in visited:
                continue
            loop = [start]
            prev, cur = start, first
            visited.update({(start, first), (first, start)})
            while cur != start:
                loop.append(cur)
                nxt = next((n for n in segments[cur] if n != prev), prev)
                visited.update({(cur, nxt), (nxt, cur)})
                prev, cur = cur, nxt
            loop.append(start)
            loops.append(np.array(loop, dtype=float) / 2)
    loops.sort(key=lambda l: -abs(cross2(l[:-1], l[1:]).sum()) / 2)
    return loops


def cross2(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Z component of the cross product of 2D vectors.

    Args:
        a: (n, 2) or (2,) vectors.
        b: (n, 2) or (2,) vectors.

    Returns:
        The scalar cross products.
    """
    a, b = np.atleast_2d(a), np.atleast_2d(b)
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def douglas_peucker(points: np.ndarray, eps: float) -> np.ndarray:
    """Simplifies a polyline, keeping every point farther than eps from the running chord.

    Args:
        points: (n, 2) polyline.
        eps: Maximum allowed deviation.

    Returns:
        The simplified polyline.
    """
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    chord = b - a
    norm = np.hypot(*chord)
    d = np.abs(cross2(points - a, chord)) / norm if norm > 1e-9 else np.hypot(*(points - a).T)
    k = int(np.argmax(d))
    if d[k] <= eps:
        return np.array([a, b])
    left = douglas_peucker(points[: k + 1], eps)
    right = douglas_peucker(points[k:], eps)
    return np.vstack([left[:-1], right])


def simplify_loop(points: np.ndarray, eps: float) -> np.ndarray:
    """Simplifies a closed loop by splitting it at its two most distant points.

    Args:
        points: (n, 2) closed loop, first point repeated at the end.
        eps: Maximum allowed deviation.

    Returns:
        The simplified closed loop.
    """
    ring = points[:-1]
    start = int(np.argmax(np.hypot(*(ring - ring.mean(axis=0)).T)))
    ring = np.roll(ring, -start, axis=0)
    split = int(np.argmax(np.hypot(*(ring - ring[0]).T)))
    first = douglas_peucker(ring[: split + 1], eps)
    second = douglas_peucker(np.vstack([ring[split:], ring[:1]]), eps)
    return np.vstack([first[:-1], second])


def chaikin(points: np.ndarray, iterations: int) -> np.ndarray:
    """Smooths a closed loop by corner cutting.

    Args:
        points: (n, 2) closed loop, first point repeated at the end.
        iterations: Number of corner-cutting passes.

    Returns:
        The smoothed closed loop.
    """
    ring = points[:-1]
    for _ in range(iterations):
        nxt = np.roll(ring, -1, axis=0)
        out = np.empty((len(ring) * 2, 2))
        out[0::2] = 0.75 * ring + 0.25 * nxt
        out[1::2] = 0.25 * ring + 0.75 * nxt
        ring = out
    return np.vstack([ring, ring[:1]])


def path_d(points: np.ndarray) -> str:
    """Formats a polyline as a closed SVG path with one-decimal coordinates.

    Args:
        points: (n, 2) loop; a repeated final point is dropped.

    Returns:
        The path's d attribute.
    """
    pts = points[:-1] if np.allclose(points[0], points[-1]) else points
    fmt = lambda v: f"{v:.1f}".rstrip("0").rstrip(".")
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + "Z"


def _splat(rows: np.ndarray, cols: np.ndarray, write) -> None:
    """Writes each sample into its cell and the eight neighbours, in the given order.

    Args:
        rows: Cell row per sample.
        cols: Cell column per sample.
        write: Callback taking clipped (rows, cols) index arrays.
    """
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            write(np.clip(rows + dr, 0, ROWS - 1), np.clip(cols + dc, 0, COLS - 1))


def _trace(mask: np.ndarray, eps: float, smooth: int, keep: int = 1) -> list[np.ndarray]:
    """Cleans a mask morphologically and returns its largest boundaries in viewBox coordinates.

    Args:
        mask: (ROWS, COLS) boolean image.
        eps: Simplification tolerance in cells.
        smooth: Chaikin passes.
        keep: Number of loops to return, largest first.

    Returns:
        Loops as (n, 2) arrays in viewBox units.
    """
    cleaned = ndimage.binary_opening(ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=2)))
    return [(chaikin(simplify_loop(loop, eps), smooth) + 0.5) * CELL for loop in marching_squares(cleaned)[:keep]]


def _voxel_mask(data: np.ndarray, affine: np.ndarray, value: int, frame: Frame) -> np.ndarray:
    """Rasters one labelled structure of the atlas volume into the drawing grid.

    Args:
        data: Volume label array.
        affine: Voxel-to-RAS affine.
        value: Label value to extract.
        frame: Projection frame.

    Returns:
        (ROWS, COLS) boolean mask.
    """
    vox = np.argwhere(data == value)
    px = frame.apply(project(nib.affines.apply_affine(affine, vox)))
    mask = np.zeros((ROWS, COLS), dtype=bool)
    rows = np.clip((px[:, 1] / CELL).astype(int), 0, ROWS - 1)
    cols = np.clip((px[:, 0] / CELL).astype(int), 0, COLS - 1)
    _splat(rows, cols, lambda r, c: mask.__setitem__((r, c), True))
    return mask


def _cerebellum_mm() -> np.ndarray:
    """Boundary of the cerebellum as an organically squashed ellipse in RAS millimetres.

    Returns:
        (n, 3) boundary points.
    """
    t = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    y = CEREBELLUM_CENTER_MM[1] + CEREBELLUM_RADII_MM[1] * 1.45 * np.cos(t) * (1 - 0.08 * np.sin(t))
    z = CEREBELLUM_CENTER_MM[2] + CEREBELLUM_RADII_MM[2] * 0.95 * np.sin(t)
    return np.column_stack([np.zeros_like(t), y, z])


def build(out_path: Path) -> None:
    """Writes the landing page's brain artwork JSON.

    Args:
        out_path: Destination file.
    """
    info = _load_region_info()
    pial, _ = nib.freesurfer.read_geometry(str(SURF / "lh.pial"))
    curv = nib.freesurfer.read_morph_data(str(SURF / "lh.curv"))
    labels, _, raw_names = nib.freesurfer.read_annot(str(ANNOT).format(h="L"))
    names = [n.decode() for n in raw_names]
    parcel_names = sorted(LOBE_OF)
    parcel_index = {n: i for i, n in enumerate(parcel_names)}
    vertex_parcel = np.array([parcel_index.get(names[l], -1) if l >= 0 else -1 for l in labels], dtype=np.int16)

    img = nib.load(str(VOLUME))
    data = np.asarray(img.dataobj)
    row_of = {(r.label, r.hemisphere): int(r.id) for r in info[info.structure != "cortex"].itertuples()}
    cereb = _cerebellum_mm()

    frame = Frame.fit(np.vstack([
        project(pial),
        project(nib.affines.apply_affine(img.affine, np.argwhere(data == row_of[("brainstem", "L")]))),
        project(cereb),
    ]))

    px = frame.apply(project(pial))
    order = np.argsort(-pial[:, 0])
    rows = np.clip((px[order, 1] / CELL).astype(int), 0, ROWS - 1)
    cols = np.clip((px[order, 0] / CELL).astype(int), 0, COLS - 1)
    occ = np.zeros((ROWS, COLS), dtype=bool)
    parcel = np.full((ROWS, COLS), -1, dtype=np.int16)
    curvg = np.zeros((ROWS, COLS))
    sorted_parcel, sorted_curv = vertex_parcel[order], curv[order]

    def write(r: np.ndarray, c: np.ndarray) -> None:
        occ[r, c] = True
        parcel[r, c] = sorted_parcel
        curvg[r, c] = sorted_curv

    _splat(rows, cols, write)

    lobes = []
    for lobe in ("frontal", "parietal", "occipital", "temporal"):
        idxs = [parcel_index[n] for n, l in LOBE_OF.items() if l == lobe]
        mask = np.isin(parcel, idxs)
        pts = _trace(mask, 1.1, 3)[0]
        com = ndimage.center_of_mass(mask)
        lobes.append({"id": lobe, "path": path_d(pts), "label": [round((com[1] + 0.5) * CELL, 1), round((com[0] + 0.5) * CELL, 1)]})

    silhouette = path_d(_trace(occ, 1.1, 3)[0])

    smooth_curv = ndimage.gaussian_filter(curvg, 1.0)
    sulci_mask = (smooth_curv > SULCAL_CURVATURE) & ndimage.binary_erosion(occ, iterations=2)
    sulci_mask = ndimage.binary_closing(sulci_mask)
    comp, n = ndimage.label(sulci_mask)
    sizes = ndimage.sum_labels(np.ones_like(comp), comp, index=range(1, n + 1))
    keep = [i + 1 for i in np.argsort(-sizes)[:MAX_SULCI] if sizes[i] >= SULCUS_MIN_CELLS]
    sulci = []
    for i in keep:
        loops = marching_squares(comp == i)
        if loops:
            sulci.append(path_d((chaikin(simplify_loop(loops[0], 1.2), 2) + 0.5) * CELL))

    hip_mask = _voxel_mask(data, img.affine, row_of[("hippocampus", "L")], frame)
    hip = _trace(hip_mask, 1.0, 3)[0]
    hip_com = ndimage.center_of_mass(hip_mask)
    stem_mask = _voxel_mask(data, img.affine, row_of[("brainstem", "L")], frame)
    stem = _trace(stem_mask, 1.0, 3)[0]
    cereb_px = frame.apply(project(cereb))

    total = int((vertex_parcel >= 0).sum())
    occ_area = float(occ.sum()) * CELL * CELL
    parcels = {}
    for name, i in parcel_index.items():
        sel = vertex_parcel == i
        centroid = px[sel].mean(axis=0)
        r = float(np.sqrt(sel.sum() / total * occ_area / np.pi))
        parcels[name] = {"x": round(float(centroid[0]), 1), "y": round(float(centroid[1]), 1), "r": round(min(40.0, max(9.0, r)), 1)}

    art = {
        "viewBox": [WIDTH, HEIGHT],
        "silhouette": silhouette,
        "lobes": lobes,
        "sulci": sulci,
        "hippocampus": {"path": path_d(hip), "label": [round((hip_com[1] + 0.5) * CELL, 1), round((hip_com[0] + 0.5) * CELL, 1)]},
        "brainstem": {"path": path_d(stem), "label": [round(float(stem[:, 0].mean()), 1), round(float(stem[:, 1].max()), 1)]},
        "cerebellum": {
            "path": path_d(cereb_px),
            "bbox": [round(float(v), 1) for v in [*cereb_px.min(axis=0), *cereb_px.max(axis=0)]],
        },
        "parcels": parcels,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(art, separators=(",", ":")))


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ART_PATH
    build(target)
    print(f"wrote {target}")
