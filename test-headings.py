import sys
sys.path.insert(0, '/app')
from chunker import Chunk
from extract_headings import extract_headings
import json

# Real text from doc cmsdb09hs0007s52h3asfdjka
chunks = [
    Chunk(text='QUY ĐỊNH VỀ CẤU TRÚC VÀ HÌNH THỨC BÀI ĐỌC\n1. Nguyên tắc cốt lõi: "Storytelling in Tech"\nMỗi bài đọc phải tuân thủ cấu trúc.', location={'page_number': 1}, chunk_index=0, token_count=50),
    Chunk(text='2. Cấu trúc bắt buộc của một bài đọc\nMột bài đọc tiêu chuẩn phải bao gồm đầy đủ 7 phần.', location={'page_number': 1}, chunk_index=1, token_count=50),
    Chunk(text='3. Quy trình biên soạn dành cho giảng viên\nBước 1: Xác định nhân vật chính', location={'page_number': 1}, chunk_index=2, token_count=50),
]

headings = extract_headings(chunks)
print(f'HEADINGS: {len(headings)}')
for h in headings:
    print(f'  L{h["level"]} p.{h["page_number"]}: {h["text"]}')
    print(f'    preview: {h["preview_text"][:80]}...' if h.get('preview_text') else '    (no preview)')