"""
Document Scanner & Perspective Correction Engine.
Detects document/book page boundaries in photos and applies 4-point perspective
transform (homography) to flatten and unwarp tilted phone photographs into clean,
upright document pages.
"""
import os
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders coordinates: [top-left, top-right, bottom-right, bottom-left]
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]      # Top-left has smallest sum (x + y)
    rect[2] = pts[np.argmax(s)]      # Bottom-right has largest sum (x + y)

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]   # Top-right has smallest diff (x - y)
    rect[3] = pts[np.argmax(diff)]   # Bottom-left has largest diff (x - y)

    return rect


def detect_document_corners(image_path: str, return_is_found: bool = False) -> Any:
    """
    Automatically detects the 4 corners of a book or document page in a photograph.
    Rejects the outer camera frame and isolates tilted/skewed documents on desk backgrounds.
    Returns list of 4 points: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image at {image_path}")

    h, w = img.shape[:2]

    # Resize for faster edge detection and noise reduction
    max_dim = 800.0
    scale = max_dim / max(h, w)
    small_w = int(w * scale)
    small_h = int(h * scale)
    small = cv2.resize(img, (small_w, small_h))
    total_area = small_w * small_h

    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    best_corners = None
    max_score = -1

    for low_t, high_t in [(30, 150), (20, 100), (50, 200)]:
        edged = cv2.Canny(blurred, low_t, high_t)
        for k_size in [9, 7]:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
            closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

            for c in contours:
                area = cv2.contourArea(c)
                frac = area / total_area
                if not (0.10 <= frac <= 0.85):
                    continue

                rect = cv2.minAreaRect(c)
                (cx, cy), (rw, rh), angle = rect
                if rw <= 0 or rh <= 0:
                    continue

                # Reject outer photo frame contours (axis-aligned rectangles spanning >40% of image)
                is_frame = (abs(angle) < 2 or abs(angle - 90) < 2) and (frac > 0.40)
                if is_frame:
                    continue

                ar = max(rw, rh) / min(rw, rh)
                # Check aspect ratio typical for books/pages (1.05 to 2.8)
                if 1.05 <= ar <= 2.8:
                    box = cv2.boxPoints(rect)
                    score = area * (1.1 if (1.15 <= ar <= 1.9) else 0.9)
                    if score > max_score:
                        max_score = score
                        best_corners = box

        if best_corners is not None and (max_score / total_area) > 0.15:
            break

    found_document = best_corners is not None

    # Fallback to 4% margin if no distinct book contour is detected
    if best_corners is None:
        margin_x = w * 0.04
        margin_y = h * 0.04
        fallback_corners = [
            [round(margin_x, 1), round(margin_y, 1)],
            [round(w - margin_x, 1), round(margin_y, 1)],
            [round(w - margin_x, 1), round(h - margin_y, 1)],
            [round(margin_x, 1), round(h - margin_y, 1)]
        ]
        return (fallback_corners, False) if return_is_found else fallback_corners

    # Rescale back to original image dimensions
    orig_corners = best_corners / scale
    orig_corners[:, 0] = np.clip(orig_corners[:, 0], 0, w)
    orig_corners[:, 1] = np.clip(orig_corners[:, 1], 0, h)
    ordered = order_points(orig_corners)

    result = [[round(float(p[0]), 1), round(float(p[1]), 1)] for p in ordered]
    return (result, True) if return_is_found else result


def warp_perspective_document(
    image_path: str,
    corners: List[List[float]],
    output_path: str
) -> Tuple[str, int, int]:
    """
    Applies 4-point perspective transform to extract, straighten, and flatten the book page.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image at {image_path}")

    pts = np.array(corners, dtype="float32")
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Calculate width of new flattened document
    width_top = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    width_bottom = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    max_w = max(int(width_top), int(width_bottom))

    # Calculate height of new flattened document
    height_right = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_left = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_h = max(int(height_right), int(height_left))

    # Prevent degenerate dimensions
    max_w = max(max_w, 200)
    max_h = max(max_h, 200)

    # Destination points for standard flat rectangle
    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1]
    ], dtype="float32")

    # Compute perspective transform matrix & warp
    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, matrix, (max_w, max_h), flags=cv2.INTER_LANCZOS4)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, warped)

    return output_path, max_w, max_h


def estimate_skew_angle(img: np.ndarray) -> float:
    """
    Estimates the dominant skew angle of text/document lines in degrees.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80, minLineLength=60, maxLineGap=10)
    if lines is None or len(lines) < 5:
        return 0.0
    angles = []
    for l in lines:
        pts = l[0] if (hasattr(l, "shape") and len(l.shape) > 1) else l
        try:
            x1, y1, x2, y2 = float(pts[0]), float(pts[1]), float(pts[2]), float(pts[3])
            deg = (((np.degrees(np.arctan2(y2 - y1, x2 - x1)) + 45) % 90) - 45)
            angles.append(deg)
        except Exception:
            continue
    return float(np.median(angles)) if angles else 0.0


def auto_deskew_image(image_path: str, output_path: str) -> Tuple[str, float]:
    """
    Automatically straightens/deskews an image so text lines are horizontal.
    """
    import shutil
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image at {image_path}")

    angle = estimate_skew_angle(img)
    if abs(angle) < 2.0:
        if image_path != output_path:
            shutil.copyfile(image_path, output_path)
        return output_path, 0.0

    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]

    rotated = cv2.warpAffine(img, M, (new_w, new_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, rotated)
    return output_path, angle

