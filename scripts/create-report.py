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
    lines = ['Recorded stress test: 10 seconds growth/warm-up and 8 seconds measured at each level, bloom 0.65, one point light per plant.']
    for row in result['results']:
        lines.append(f"{row['plants']} plant(s): {row['averageFps']:.1f} average FPS; {row['p95FrameMs']:.1f} ms p95; {row['drawCalls']} draw calls; slowest frame {1000 / row['minFps']:.1f} ms.")
    slowest_ms = max(1000 / row['minFps'] for row in result['results'])
    interpretation = ('Isolated long frames prevent a claim of consistent 60 FPS.' if slowest_ms > 33.4 else 'This capture stayed near 60 FPS at the three measured workloads; it does not guarantee that result at other resolutions or on other GPUs.')
    lines.append(f"Environment: {result['gpu']}; Chrome {re.search(r'Chrome/([0-9.]+)', result['userAgent']).group(1)}; {result['viewport']['width']} x {result['viewport']['height']} canvas; pixel ratio {result['pixelRatio']}. Recording was active during measurement. Average FPS uses animation-frame intervals, not GPU timer queries. {interpretation} Five plants do not establish the original 20-plant goal. Raw data: docs/benchmark-results.json.")
    return '\n\n'.join(lines)


def pdf_string(text):
    for before, after in [('→', '->'), ('–', '-'), ('—', '-'), ('’', "'"), ('“', '"'), ('”', '"')]:
        text = text.replace(before, after)
    return text.encode('cp1252', errors='replace').decode('latin1').replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def render_page(markdown, page_number):
    operations = []
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
            size, leading, font, width = 9.7, 12.5, 'F1', 103
        text = re.sub(r'^#+\s*', '', block)
        for paragraph in text.splitlines():
            for line in textwrap.wrap(paragraph, width=width, break_long_words=False, break_on_hyphens=False):
                if y < 53:
                    raise RuntimeError(f'Report page {page_number} overflows. Shorten the source.')
                operations.append(f'BT /{font} {size} Tf 48 {y:.1f} Td ({pdf_string(line)}) Tj ET')
                y -= leading
        y -= 7 if heading else 6
    operations.append(f'BT /F1 8 Tf 48 28 Td (LuminaGarden | Assignment 3) Tj ET')
    operations.append(f'BT /F1 8 Tf 548 28 Td ({page_number}/2) Tj ET')
    return '\n'.join(operations).encode('latin1')


def write_pdf(pages):
    objects = []
    objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')
    objects.append(b'<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    for index, content in enumerate(pages):
        stream_id = 6 + index * 2
        objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {stream_id} 0 R >>'.encode())
        objects.append(f'<< /Length {len(content)} >>\nstream\n'.encode() + content + b'\nendstream')
    data = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data.extend(f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(data)
    data.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        data.extend(f'{offset:010d} 00000 n \n'.encode())
    data.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
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
