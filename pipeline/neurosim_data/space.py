"""Coordinate conversion from scanner space (RAS millimetres) into NeuroSim scene units."""

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class SimSpace:
    """Affine map from RAS mm (x right, y anterior, z superior) to scene units (x right, y up, z front).

    Attributes:
        center_mm: RAS point that becomes the scene origin.
        mm_per_unit: Millimetres per scene unit.
    """

    center_mm: np.ndarray
    mm_per_unit: float

    @classmethod
    def fit(cls, points_mm: np.ndarray, half_extent: float) -> "SimSpace":
        """Builds a space centred on the points' bounding box whose longest half-axis spans half_extent units.

        Args:
            points_mm: (n, 3) RAS coordinates.
            half_extent: Scene units the longest half-axis should cover.

        Returns:
            The fitted SimSpace.
        """
        lo, hi = points_mm.min(axis=0), points_mm.max(axis=0)
        return cls(center_mm=(lo + hi) / 2, mm_per_unit=float((hi - lo).max() / 2 / half_extent))

    def to_sim(self, points_mm: np.ndarray) -> np.ndarray:
        """Converts RAS points to scene coordinates.

        Args:
            points_mm: (n, 3) RAS coordinates.

        Returns:
            (n, 3) scene coordinates.
        """
        p = (np.asarray(points_mm, dtype=float) - self.center_mm) / self.mm_per_unit
        return p[:, [0, 2, 1]]

    def length(self, mm: float) -> float:
        """Converts a distance in millimetres to scene units.

        Args:
            mm: Distance in millimetres.

        Returns:
            The same distance in scene units.
        """
        return mm / self.mm_per_unit
