"""Coordinate helpers between PyMuPDF's unrotated text space and rendered page space."""
from __future__ import annotations

import fitz


def bbox_to_rendered(page: fitz.Page, bbox: list[float] | tuple[float, ...]) -> list[float]:
    """Transform a PyMuPDF text bbox into the rotated page coordinate space used by rendering."""
    rect = fitz.Rect(bbox) * page.rotation_matrix
    return [rect.x0, rect.y0, rect.x1, rect.y1]


def rendered_page_size(page: fitz.Page) -> tuple[float, float]:
    rect = page.rect
    return float(rect.width), float(rect.height)
