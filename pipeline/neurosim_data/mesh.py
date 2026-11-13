"""Cortical surface meshes labelled with connectome node indices, packed for the browser."""

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

MEDIAL_WALL = -1


def vertex_nodes(labels: np.ndarray, names: Sequence[str], node_order: Sequence[str], offset: int) -> np.ndarray:
    """Converts per-vertex annotation labels into connectome node indices.

    Args:
        labels: Per-vertex index into names, as returned by nibabel's read_annot (-1 for unlabelled).
        names: Annotation label names.
        node_order: Parcel names of this hemisphere in connectome order.
        offset: Connectome index of this hemisphere's first parcel.

    Returns:
        Per-vertex node index, or MEDIAL_WALL for vertices outside every parcel.
    """
    lookup = {name: offset + i for i, name in enumerate(node_order)}
    table = np.array([lookup.get(name, MEDIAL_WALL) for name in names], dtype=np.int16)
    out = np.full(labels.shape, MEDIAL_WALL, dtype=np.int16)
    valid = labels >= 0
    out[valid] = table[labels[valid]]
    return out


@dataclass(frozen=True)
class HemisphereMesh:
    """One hemisphere's pial and white surfaces in scene units, with per-vertex node labels.

    Attributes:
        hemi: "L" or "R".
        pial: (v, 3) outer surface vertices.
        white: (v, 3) inner surface vertices, vertex-matched to pial.
        faces: (f, 3) triangle vertex indices.
        nodes: (v,) connectome node index per vertex, MEDIAL_WALL where unlabelled.
    """

    hemi: str
    pial: np.ndarray
    white: np.ndarray
    faces: np.ndarray
    nodes: np.ndarray

    def to_bytes(self, base_offset: int) -> tuple[bytes, dict]:
        """Packs the mesh as little-endian pial f32, white f32, faces u32, nodes i16, padded to 4 bytes.

        Args:
            base_offset: Byte offset this blob will start at inside the combined file.

        Returns:
            The packed bytes and a layout dict with counts and absolute byte offsets.
        """
        parts = [
            np.ascontiguousarray(self.pial, dtype="<f4").tobytes(),
            np.ascontiguousarray(self.white, dtype="<f4").tobytes(),
            np.ascontiguousarray(self.faces, dtype="<u4").tobytes(),
            np.ascontiguousarray(self.nodes, dtype="<i2").tobytes(),
        ]
        offsets, cursor = [], base_offset
        for part in parts:
            offsets.append(cursor)
            cursor += len(part)
        blob = b"".join(parts)
        blob += b"\0" * (-len(blob) % 4)
        layout = {
            "hemi": self.hemi,
            "vertexCount": int(len(self.pial)),
            "faceCount": int(len(self.faces)),
            "pialOffset": offsets[0],
            "whiteOffset": offsets[1],
            "faceOffset": offsets[2],
            "nodeOffset": offsets[3],
        }
        return blob, layout
