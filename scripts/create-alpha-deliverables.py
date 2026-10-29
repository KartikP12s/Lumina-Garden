"""Generate the plain 2-page report and a 4-slide PPTX/PDF with speaker notes.

Install scripts/requirements-docs.txt in a virtual environment first.
Sources: docs/alpha/{production-plan,release-notes,benchmark-results,deployment}.json.
"""
from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape
import json
import math
import re

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
import fitz
from PIL import Image as PILImage

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
ALPHA = DOCS / 'alpha'
PLAN = json.loads((ALPHA / 'production-plan.json').read_text())
RELEASE = json.loads((ALPHA / 'release-notes.json').read_text())
BENCH = json.loads((ALPHA / 'benchmark-results.json').read_text())
DEPLOY = json.loads((ALPHA / 'deployment.json').read_text())
URL = DEPLOY['url']
REPO = 'https://github.com/KartikP12s/Lumina-Garden'
METRICS = ', '.join(f"{r['plants']} plants: {r['averageFps']:.1f} FPS / {r['p95FrameMs']:.1f} ms p95 / {r['drawCalls']} calls" for r in BENCH['results'])
WORST = max(1000 / r['minFps'] for r in BENCH['results'])


def para(text, style):
    return Paragraph(escape(text).replace('\n', '<br/>'), style)


def create_report():
    output = DOCS / 'Assignment-4-Report.pdf'
    body = ParagraphStyle('body', fontName='Helvetica', fontSize=9.1, leading=12, spaceAfter=5)
    small = ParagraphStyle('small', parent=body, fontSize=8, leading=10.4, spaceAfter=4)
    cell = ParagraphStyle('cell', parent=small, fontSize=8, leading=10.4, spaceAfter=0)
    heading = ParagraphStyle('heading', parent=body, fontName='Helvetica-Bold', fontSize=11.5, leading=15, spaceBefore=7, spaceAfter=5)
    title = ParagraphStyle('title', parent=heading, fontSize=17, leading=21, spaceBefore=0, spaceAfter=6)
    story = [para('LuminaGarden - Assignment 4: Alpha & Production Plan', title),
             para(f"Kartik Patel | Safa Akbar | {RELEASE['date']} | {RELEASE['version']}", small),
             para('Alpha checkpoint: October 29-November 1. The complete garden loop, coherent wind, and day/night are integrated. Start empty, grow 1-5 plants, finish once all are mature, and restart. The existing seeded geometry, staged growth, colored point lights, and bloom remain the core.', body),
             para('Weekly development schedule', heading),
             para(PLAN['calendar_status'], small)]
    data = [[para(x, cell) for x in ['Week / dates', 'Engineering tasks', 'Asset tasks', 'Integration / acceptance']]]
    for row in PLAN['weeks']:
        data.append([para(row[k], cell) for k in ['week', 'engineering', 'assets', 'integration']])
    table = Table(data, colWidths=[60, 158, 124, 186], repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#aab2a9')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e9ede7')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f2ed')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 7), para(PLAN['proposed_ownership'], small),
              para('Scope control: feature freeze December 6. December 7-13 is exclusively for fixes, documentation, and polish. Defer unstable optional features before the freeze; no new features or feature assets in the buffer.', body),
              para('Playable alpha and source', heading),
              Paragraph(f'Playable project: <link href="{URL}" color="#1f4d3b">{URL}</link>', body),
              para('Production alpha verified at this URL.' if DEPLOY['verified_alpha'] else DEPLOY['status'], small),
              Paragraph(f'Public source / README: <link href="{REPO}" color="#1f4d3b">{REPO}</link>', body),
              para('Run locally: npm ci; npm run dev. Production: npm run build; npm run preview. Node.js 22.12+ and desktop WebGL2 required. README contains build instructions.', small),
              PageBreak(), para('Release notes - changes since Assignment 3', title)]
    for label, key in [('New features', 'new_features'), ('Bug fixes', 'bug_fixes'), ('Known issues and limits', 'known_issues')]:
        story.append(para(label, heading))
        story += [para('- ' + item, body) for item in RELEASE[key]]
    story += [para('Validation and measured performance', heading),
              para('Seven unit tests and six Chrome browser tests pass. Checks cover staged growth, seed replay, five-plant bounds, the full session loop, pause/resume, moving light anchors, daylight controls, repeated reset/resource bounds, camera drags, diagnostic cancellation, and WebGL2 failure.', body),
              para(METRICS + '.', body),
              para(f"Measured on Apple M2, Chrome {re.search(r'Chrome/([0-9.]+)', BENCH['userAgent']).group(1)}, {BENCH['viewport']['width']} x {BENCH['viewport']['height']} canvas, DPR {BENCH['pixelRatio']}; wind {BENCH['windStrength']:.0%}, daylight {BENCH['daylight']:.0%}, bloom control {BENCH.get('bloomControl', .65):.2f}. Each level: 10s growth/warm-up + 8s measured RAF intervals. Slowest recorded frame: {WORST:.1f} ms. Averages near 60 FPS do not establish headroom or performance on other GPUs. These are frame intervals, not GPU timings. Raw evidence: docs/alpha/benchmark-results.json.", small)]
    def footer(c, doc):
        c.setFont('Helvetica', 8); c.setFillColor(colors.HexColor('#555555'))
        c.drawString(42, 24, 'LuminaGarden | Assignment 4 | Tentative final: December 14, 2026')
        c.drawRightString(570, 24, f'{doc.page}/2')
    SimpleDocTemplate(str(output), pagesize=(612, 792), leftMargin=42, rightMargin=42, topMargin=36, bottomMargin=40, title='LuminaGarden - Assignment 4', author='Kartik Patel; Safa Akbar').build(story, onFirstPage=footer, onLaterPages=footer)
    with fitz.open(output) as pdf:
        if len(pdf) != 2:
            raise RuntimeError(f'The report must be at most 2 pages; generated {len(pdf)}.')
    rows = '\n'.join('| ' + ' | '.join(row[k] for k in ['week', 'engineering', 'assets', 'integration']) + ' |' for row in PLAN['weeks'])
    text = f"# Assignment 4 - LuminaGarden Alpha\n\nKartik Patel | Safa Akbar | {RELEASE['date']}\n\n## Weekly development plan\n\n{PLAN['calendar_status']}\n\n| Week / dates | Engineering | Assets | Integration / acceptance |\n| --- | --- | --- | --- |\n{rows}\n\n{PLAN['proposed_ownership']}\n\n## Release notes\n"
    for label, key in [('New features', 'new_features'), ('Bug fixes', 'bug_fixes'), ('Known issues', 'known_issues')]:
        text += f'\n### {label}\n\n' + '\n'.join('- ' + item for item in RELEASE[key]) + '\n'
    text += f'\n## Validation\n\n7 unit tests and 6 Chrome browser tests pass. {METRICS}. Slowest frame: {WORST:.1f} ms. Evidence: docs/alpha/benchmark-results.json. One browser/GPU and five plants do not validate the original 15–20-plant target.\n\n## Links\n\nPlayable project: {URL}\n\n{DEPLOY["status"]}\n\nSource / README: {REPO}\n'
    (DOCS / 'Assignment-4-Report.md').write_text(text)
    print('Created report (2 pages).')


class Deck:
    """Use the same point coordinates for editable PowerPoint and PDF slides."""
    W, H = 960, 540
    def __init__(self):
        self.ppt = Presentation(); self.ppt.slide_width = Pt(self.W); self.ppt.slide_height = Pt(self.H)
        self.ppt.core_properties.title = 'LuminaGarden - Assignment 4 Mid-Crit'
        self.ppt.core_properties.author = 'Kartik Patel; Safa Akbar'
        self.pdf = canvas.Canvas(str(DOCS / 'LuminaGarden-Assignment-4-Presentation.pdf'), pagesize=(self.W, self.H))
        self.pdf.setTitle('LuminaGarden - Assignment 4 Mid-Crit'); self.pdf.setAuthor('Kartik Patel; Safa Akbar')
        self.index = 0
    def page(self, title, subtitle, speaker, timing, notes):
        if self.index: self.pdf.showPage()
        self.index += 1; self.slide = self.ppt.slides.add_slide(self.ppt.slide_layouts[6])
        self.slide.background.fill.solid(); self.slide.background.fill.fore_color.rgb = RGBColor.from_string('091511')
        self.pdf.setFillColor(colors.HexColor('#091511')); self.pdf.rect(0, 0, self.W, self.H, fill=1, stroke=0)
        self.text(36, 22, 790, 17, 'LUMINA GARDEN / ALPHA 04 / MID-CRIT', 9, 'A4C58F', True)
        self.text(36, 55, 890, 45, title, 28, 'E7EFDF', True)
        self.text(36, 103, 880, 35, subtitle, 12, 'A8BBA0')
        self.line(36, 504, 924, 504, '31472D')
        self.text(36, 516, 650, 14, f'Kartik Patel & Safa Akbar   |   {speaker}: {timing}', 8, '8EA581')
        self.text(872, 515, 55, 15, f'{self.index} / 4', 9, 'B6D0A5')
        self.slide.notes_slide.notes_text_frame.text = notes
    def text(self, x, y, w, h, text, size=14, color='D8E4D0', bold=False):
        box = self.slide.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h))
        frame = box.text_frame; frame.clear(); frame.word_wrap = True
        frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
        for i, line in enumerate(text.split('\n')):
            p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
            p.text = line; p.font.name = 'Arial'; p.font.size = Pt(size); p.font.bold = bold; p.font.color.rgb = RGBColor.from_string(color)
            p.space_before = p.space_after = Pt(0); p.line_spacing = Pt(size * 1.22)
        style = ParagraphStyle('slide', fontName='Helvetica-Bold' if bold else 'Helvetica', fontSize=size, leading=size * 1.22, textColor=colors.HexColor('#' + color), alignment=TA_LEFT)
        p = para(text, style); pw, ph = p.wrap(w, 1000)
        if ph > h + 1: raise RuntimeError(f'Slide {self.index} text overflows: {text[:65]} ({ph} > {h})')
        p.drawOn(self.pdf, x, self.H - y - ph)
    def rect(self, x, y, w, h, fill='13241A', stroke='30472D'):
        shape = self.slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
        shape.fill.solid(); shape.fill.fore_color.rgb = RGBColor.from_string(fill)
        shape.line.color.rgb = RGBColor.from_string(stroke); shape.line.width = Pt(0.7)
        self.pdf.setFillColor(colors.HexColor('#' + fill)); self.pdf.setStrokeColor(colors.HexColor('#' + stroke)); self.pdf.setLineWidth(.7)
        self.pdf.roundRect(x, self.H - y - h, w, h, 7, fill=1, stroke=1)
    def line(self, x1, y1, x2, y2, color='AFCF98', width=1):
        shape = self.slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Pt(x1), Pt(y1), Pt(x2), Pt(y2))
        shape.line.color.rgb = RGBColor.from_string(color); shape.line.width = Pt(width)
        self.pdf.setStrokeColor(colors.HexColor('#' + color)); self.pdf.setLineWidth(width); self.pdf.line(x1, self.H - y1, x2, self.H - y2)
    def picture(self, name, x, y, w, h, region=None):
        path = ALPHA / 'evidence' / f'{name}.png'
        source = str(path)
        if region:
            im = PILImage.open(path); iw, ih = im.size
            crop = im.crop(tuple(int(n * (iw if i % 2 == 0 else ih)) for i, n in enumerate(region)))
            source = BytesIO(); crop.save(source, format='PNG'); source.seek(0)
        image = ImageReader(source); iw, ih = image.getSize(); scale = min(w / iw, h / ih)
        dw, dh = iw * scale, ih * scale; x += (w - dw) / 2; y += (h - dh) / 2
        if hasattr(source, 'seek'): source.seek(0)
        self.slide.shapes.add_picture(source, Pt(x), Pt(y), width=Pt(dw), height=Pt(dh))
        self.pdf.drawImage(image, x, self.H - y - dh, width=dw, height=dh, mask='auto')
    def save(self):
        self.pdf.save(); self.ppt.save(DOCS / 'LuminaGarden-Assignment-4-Presentation.pptx')


def create_deck():
    notes = [
        "Kartik | 0:00-0:25 (25 seconds).\n\nLuminaGarden is a small interactive garden built with Three.js and TypeScript. Our three pillars are procedural generation, animation, and rendering. The alpha now has a complete loop: start, plant and shape the garden, finish, and restart. We'll focus on two challenges: coherent plant animation and the cost of glow.\n\nPoint briefly at the loop; keep the overview short.",
        "Kartik | 0:25-1:45 (80 seconds).\n\nOur first challenge is making generated plants feel structured while they grow. Unconstrained random branches can look disconnected or implausible, while scaling a complete model makes every part appear at once. We generate a deterministic blueprint from the seed, with bounded height, five to eight branches, and three to five leaves per branch. Branch placement follows a golden-angle distribution.\n\nThe blueprint gives each segment and organ a start and end time. A clamped smoothstep turns overall growth progress into a local reveal amount. Fourteen trunk segments extend from their bases, then branches, leaves, and petals appear.\n\nThese are screenshots from the actual nine-second growth sequence. The same seed recreates the same blueprint, and generator tests check finite, bounded geometry across 300 seeds. The tradeoff is artistic control rather than botanical realism; the rules do not prevent every leaf intersection.\n\nPoint along the stage images, then hand over to Safa.",
        "Safa | 1:45-3:10 (85 seconds).\n\nAdding wind makes the first challenge harder. If we rotate each leaf or branch independently, attachment points can separate, especially during growth. Our solution is one continuous deformation in plant-local coordinates. We first place an instance, then bend its resulting position using the same height-squared field as every other part. A vertex at the root has zero displacement, and higher vertices move farther. Each plant gets a seed-derived phase.\n\nGrowth still updates the instance transforms. Wind runs in the vertex shader, so mature plants can sway without uploading all their organ matrices again. We also transform normals using the deformation's inverse-transpose Jacobian so lighting follows the bend. Point-light anchors use the same analytic field on the CPU.\n\nThe screenshots show the same five-plant layout with still and strong wind. This is a cheap, coherent visual approximation: it does not model inertia or preserve exact branch lengths. Those are deliberate limitations, not physical-simulation claims.",
        f"Safa | 3:10-4:30 (80 seconds).\n\nThe second challenge is producing convincing glow within a real-time budget. Emission makes a surface bright. A point light illuminates nearby soil. Bloom is a screen-space halo around bright pixels. The comparison switches bloom off and on while keeping emission. Day/night also adjusts emission and bloom to avoid the washed-out daytime result we found in visual review.\n\nWe measured actual animation-frame intervals with wind at seventy percent, daylight at fifteen percent, bloom enabled, and one point light per plant. Each level gets ten seconds of growth and warm-up followed by eight seconds of sampling. The table shows the measured averages and total draw calls, including post-processing. The slowest recorded frame was {WORST:.1f} milliseconds, so an average near sixty does not mean every frame met the target.\n\nThese results are specific to Chrome, this M2 GPU, and this viewport. Five plants do not validate the original twenty-plant target, and a sixty-FPS cap hides spare headroom. Our next work is broader profiling, light interaction, and plant families, with December seventh onward reserved for fixes and documentation.\n\nLeave around thirty seconds of margin within the five-minute limit.",
    ]
    d = Deck()
    d.page('A small garden. A complete experience.', 'One alpha, three graphics pillars. Two technical challenges worth examining.', 'Kartik', '0:00-0:25', notes[0])
    d.text(36, 157, 350, 70, 'Build a bioluminescent garden\nfrom seeds and simple rules.', 19, 'E7EFDF', True)
    for y, label, detail in [(250, 'PROCEDURAL GENERATION', 'Seeded geometry and bounded variation'), (300, 'ANIMATION', 'Staged growth + coherent wind'), (350, 'RENDERING', 'Emission, colored lights, bloom + day/night')]:
        d.text(36, y, 350, 18, label, 10, 'A4C58F', True)
        d.text(36, y + 19, 355, 24, detail, 12, 'D0DECA')
    d.picture('night', 414, 151, 510, 280)
    for x, width, label, detail in [(36, 260, '01 / START', 'Menu + short control guide'), (333, 270, '02 / GROW & SHAPE', 'Plant 1-5 seeds · wind · time of day'), (640, 284, '03 / FINISH & RESTART', 'Mature garden summary · clean reset')]:
        d.rect(x, 440, width, 51)
        d.text(x + 12, 449, width - 24, 15, label, 10, 'C6E1B3', True)
        d.text(x + 12, 470, width - 24, 16, detail, 10, 'A1B596')
    d.line(300, 465, 329, 465); d.line(607, 465, 636, 465)

    d.page('Challenge 1 / Grow structure in sequence.', 'A repeatable blueprint controls geometry; local timing makes each part emerge from its base.', 'Kartik', '0:25-1:45', notes[1])
    for x, label, text in [
        (36, 'WHY IT IS HARD', 'Random branches can look incoherent.\nWhole-model scaling reveals every part\nat once instead of showing growth.'),
        (340, 'OUR APPROACH', 'Seed → constrained blueprint → instances.\n14 trunk segments; 5-8 branches.\n3-5 leaves per branch; staggered reveal.'),
        (644, 'EVIDENCE + TRADEOFF', 'Same seed → same geometry.\n300 seeds checked for finite bounds.\nIntersections are not collision-resolved.')]:
        d.text(x, 155, 280, 19, label, 11, 'A4C58F', True)
        d.text(x, 185, 280, 97, text, 13, 'D8E4D0')
    d.rect(36, 286, 888, 43)
    d.text(50, 299, 860, 24, 'Local reveal: g = smoothstep(0, 1, clamp((progress - start) / (end - start)))', 14, 'D8E7CE')
    for x, name, label in [(36, 'growth-sprout', 'SPROUT'), (262, 'growth-stem', 'STEM'), (488, 'growth-branches', 'BRANCHES'), (714, 'growth-mature', 'LEAVES + BLOOM')]:
        d.rect(x, 345, 210, 143)
        d.picture(name, x + 5, 350, 200, 112, (.28, .24, .56, .60))
        d.text(x + 10, 469, 190, 15, label, 9, 'B9D6A5', True)

    d.page('Challenge 1 / Keep wind and growth connected.', 'One deformation field keeps attachment positions coherent, including during staged growth.', 'Safa', '1:45-3:10', notes[2])
    d.rect(36, 154, 380, 334)
    d.text(53, 170, 345, 43, 'Instance placement first.\nShared plant-space bend second.', 18, 'E3EEDB', True)
    d.text(53, 233, 345, 57, "x' = x + kx(t) · max(y, 0)^2\nz' = z + kz(t) · max(y, 0)^2", 17, 'B9DAA5')
    d.text(53, 310, 345, 153, 'Root stays anchored; tips move more.\nSeed-derived phase varies the sway.\n\nNormals: inverse-transpose Jacobian.\nLight anchors: same analytic CPU field.\nMature organ matrices stay unchanged.', 13, 'D5E2CC')
    d.picture('wind-still', 439, 157, 230, 163, (.29, .15, .66, .72))
    d.picture('wind-moving', 694, 157, 230, 163, (.29, .15, .66, .72))
    d.text(451, 323, 215, 18, 'WIND 0% / SAME LAYOUT', 9, 'A4C58F', True)
    d.text(706, 323, 215, 18, 'WIND 100% / SAME LAYOUT', 9, 'A4C58F', True)
    d.rect(439, 361, 485, 127)
    d.text(455, 375, 450, 20, 'COHERENCE AT LOW CPU COST', 11, 'A4C58F', True)
    d.text(455, 404, 450, 70, 'Wind updates shader uniforms, not every organ matrix.\nThe same field deforms attached parts continuously.\nTradeoff: no inertia, collision response, or exact length conservation.', 12, 'D5E2CC')

    d.page('Challenge 2 / Glow within a real-time budget.', 'Emission, illumination, and bloom have different jobs; profiling has to include the complete frame.', 'Safa', '3:10-4:30', notes[3])
    d.picture('bloom-off', 36, 151, 245, 145, (.27, .14, .7, .75))
    d.picture('bloom-on', 299, 151, 245, 145, (.27, .14, .7, .75))
    d.text(48, 302, 235, 17, 'BLOOM OFF / EMISSION REMAINS', 9, 'A4C58F', True)
    d.text(311, 302, 235, 17, 'BLOOM ON / HALO RETURNS', 9, 'A4C58F', True)
    for x, label, text in [(36, 'EMISSION', 'Bright plant surfaces'), (208, 'POINT LIGHTS', 'Colored light on soil'), (380, 'BLOOM', 'Screen-space halo')]:
        d.rect(x, 342, 164, 58); d.text(x + 10, 354, 145, 15, label, 10, 'C5DDB3', True); d.text(x + 10, 377, 145, 16, text, 9, 'A7B99C')
    d.text(36, 420, 505, 63, 'Daylight attenuates emission and bloom to avoid washout.\nInstancing limits geometry draw calls.\nFPS capped near 60 does not reveal spare headroom.', 12, 'C2D3B7')
    d.rect(574, 155, 350, 172)
    for x, width, label in [(589, 52, 'Plants'), (650, 90, 'Avg FPS'), (750, 80, 'p95 ms'), (847, 65, 'Calls')]:
        d.text(x, 169, width, 18, label, 10, 'A4C58F', True)
    for i, row in enumerate(BENCH['results']):
        for x, width, value in [(589, 52, str(row['plants'])), (650, 90, f"{row['averageFps']:.1f}"), (750, 80, f"{row['p95FrameMs']:.1f}"), (847, 65, str(row['drawCalls']))]:
            d.text(x, 204 + i * 31, width, 22, value, 14, 'E0ECD5')
    d.text(574, 345, 350, 138, f"M2 / Chrome {re.search(r'Chrome/(\d+)', BENCH['userAgent']).group(1)} / {BENCH['viewport']['width']} × {BENCH['viewport']['height']} / DPR {BENCH['pixelRatio']}\nWind 70%; daylight 15%; bloom control 0.65.\n10s warm-up + 8s sampling at each level.\nSlowest recorded frame: {WORST:.1f} ms (included).\n\nOne GPU; no GPU timer queries.\nFive plants do not validate the original 20-plant target.", 11, 'AFC4A3')
    d.save()
    (DOCS / 'Assignment-4-Presentation-Notes.md').write_text('# Mid-crit speaker notes - 4 slides / target 4:30\n\n' + '\n\n---\n\n'.join(f'## Slide {i+1}\n\n{text}' for i, text in enumerate(notes)) + '\n\nRehearse with the deck. Keep the total under 5 minutes; the schedule/report are separate deliverables.\n')
    print('Created presentation (4 editable slides), matching PDF, and speaker notes.')


if __name__ == '__main__':
    create_report()
    create_deck()
