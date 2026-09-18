export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  page_count: number;
  has_cover: boolean;
  cover_url?: string;
  pdf_url?: string;
  transcript_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface BookCompilePayload {
  title: string;
  author: string;
  description?: string;
  tags?: string[];
}
