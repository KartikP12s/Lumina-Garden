"""Build a plain, two-page PDF from the report source using only Python 3."""
from pathlib import Path
import json
import re
import textwrap

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs/Assignment-3-Report.md'
DEST = ROOT / 'docs/Assignment-3-Report.pdf'


def evidence():
    result = json.loads((ROOT / 'docs/benchmark-results.json').read_text())
    lines = ['Local stress test: 10 seconds growth/warm-up, then 8 seconds measured per level; bloom 0.65 and one point light per plant.']
    for row in result['results']:
        lines.append(f"{row['plants']} plant(s): {row['averageFps']:.1f} average FPS; {row['p95FrameMs']:.1f} ms p95 frame time; {row['drawCalls']} draw calls.")
    slowest_ms = max(1000 / row['minFps'] for row in result['results'])
    interpretation = ('Isolated long frames prevent a claim of consistent 60 FPS.' if slowest_ms > 33.4 else 'The measured workloads stayed near 60 FPS; this does not guarantee performance on other devices or at other resolutions.')
    lines.append(f"Measured on an Apple M2 GPU in Chrome {re.search(r'Chrome/([0-9.]+)', result['userAgent']).group(1)}, with a {result['viewport']['width']} x {result['viewport']['height']} canvas and pixel ratio {result['pixelRatio']}. FPS uses animation-frame intervals, not GPU timer queries. {interpretation} The five-plant cap does not validate the original 15-20-plant target. Raw data: docs/benchmark-results.json.")
    return '\n\n'.join(lines)


def pdf_string(text):
    for before, after in [('→', '->'), ('–', '-'), ('—', '-'), ('’', "'"), ('“', '"'), ('”', '"')]:
        text = text.replace(before, after)
    return text.encode('cp1252', errors='replace').decode('latin1').replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def render_page(markdown, page_number):
    operations = []
    links = []
    y = 748
    for block in re.split(r'\n\s*\n', markdown.strip()):
        if block.startswith('<!--'):
            continue
        heading = block.startswith('#')
        if block.startswith('# '):
            size, leading, font, width = 17, 22, 'F2', 70
        elif block.startswith('## '):
            size, leading, font, width = 12, 17, 'F2', 90
        else:
            size, leading, font, width = 10.5, 14, 'F1', 97
        text = re.sub(r'^#+\s*', '', block)
        for paragraph in text.splitlines():
            for line in textwrap.wrap(paragraph, width=width, break_long_words=False, break_on_hyphens=False):
                if y < 53:
                    raise RuntimeError(f'Report page {page_number} overflows. Shorten the source.')
                operations.append(f'BT /{font} {size} Tf 48 {y:.1f} Td ({pdf_string(line)}) Tj ET')
                for url in re.findall(r'https?://[^\s]+', line):
                    links.append((url, y - 3, y + size + 2))
                y -= leading
        y -= 7 if heading else 6
    operations.append(f'BT /F1 8 Tf 48 28 Td (LuminaGarden | Assignment 3) Tj ET')
    operations.append(f'BT /F1 8 Tf 548 28 Td ({page_number}/2) Tj ET')
    return '\n'.join(operations).encode('latin1'), links


def write_pdf(pages):
    objects = []
    objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')
    objects.append(b'<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    annotations = []
    for index, (content, links) in enumerate(pages):
        stream_id = 6 + index * 2
        references = []
        for url, bottom, top in links:
            references.append(f'{9 + len(annotations)} 0 R')
            annotations.append(f'<< /Type /Annot /Subtype /Link /Rect [48 {bottom:.1f} 564 {top:.1f}] /Border [0 0 0] /A << /S /URI /URI ({pdf_string(url)}) >> >>'.encode('latin1'))
        annots = ' /Annots [' + ' '.join(references) + ']' if references else ''
        objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {stream_id} 0 R{annots} >>'.encode())
        objects.append(f'<< /Length {len(content)} >>\nstream\n'.encode() + content + b'\nendstream')
    objects.extend(annotations)
    info_id = len(objects) + 1
    objects.append(b'<< /Title (LuminaGarden - Assignment 3 Progress Report) /Author (Kartik Patel; Safa Akbar) >>')
    data = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data.extend(f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(data)
    data.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        data.extend(f'{offset:010d} 00000 n \n'.encode())
    data.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R /Info {info_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    DEST.write_bytes(data)


source = SOURCE.read_text()
source = re.sub(r'<!-- benchmark:start -->.*?<!-- benchmark:end -->', '<!-- benchmark:start -->\n' + evidence() + '\n<!-- benchmark:end -->', source, flags=re.S)
SOURCE.write_text(source)
# Remove evidence markers, preserving their body.
printable = source.replace('<!-- benchmark:start -->', '').replace('<!-- benchmark:end -->', '')
sections = printable.split('<!-- pagebreak -->')
if len(sections) != 2:
    raise RuntimeError('The report must have exactly two pages.')
write_pdf([render_page(page, i + 1) for i, page in enumerate(sections)])
print(f'Created {DEST} (2 pages)')
