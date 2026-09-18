export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OCRLine {
  text: string;
  confidence?: number;
  box?: number[][];
}

export interface OCRResult {
  full_text: string;
  line_count: number;
  lines: OCRLine[];
  engine?: string;
  image_path?: string;
}

export interface PageItem {
  id: string;
  filename: string;
  preview_url: string;
  has_ocr: boolean;
  ocr_status: "pending" | "processing" | "completed" | "failed";
  ocr_result: OCRResult | null;
  is_flattened: boolean;
  updated_at: number;
}

export interface SessionInfo {
  session_id: string;
  pages: PageItem[];
}
