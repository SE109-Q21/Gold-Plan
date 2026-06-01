from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "app-function-inventory.md"
OUTPUT = ROOT / "docs" / "app-function-inventory.pdf"


def register_fonts() -> tuple[str, str]:
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("DocArial", str(regular)))
        pdfmetrics.registerFont(TTFont("DocArial-Bold", str(bold)))
        return "DocArial", "DocArial-Bold"
    return "Helvetica", "Helvetica-Bold"


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def inline_markup(text: str) -> str:
    text = esc(text)
    text = re.sub(r"`([^`]+)`", r"<font face='Mono'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("DocArial" if "DocArial" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawRightString(A4[0] - 1.6 * cm, 1.05 * cm, f"Trang {doc.page}")
    canvas.restoreState()


def build_pdf():
    base_font, bold_font = register_fonts()
    mono_path = Path("C:/Windows/Fonts/consola.ttf")
    if mono_path.exists():
        pdfmetrics.registerFont(TTFont("Mono", str(mono_path)))
    else:
        pdfmetrics.registerFont(TTFont("Mono", str(Path("C:/Windows/Fonts/cour.ttf"))))

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="DocTitle",
        fontName=bold_font,
        fontSize=22,
        leading=27,
        textColor=colors.HexColor("#111111"),
        spaceAfter=14,
        alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="H2",
        fontName=bold_font,
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#1f1f1f"),
        spaceBefore=12,
        spaceAfter=7,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="H3",
        fontName=bold_font,
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#8A6A00"),
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="BodyDoc",
        fontName=base_font,
        fontSize=9.5,
        leading=13.2,
        textColor=colors.HexColor("#222222"),
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="BulletDoc",
        parent=styles["BodyDoc"],
        leftIndent=13,
        firstLineIndent=-8,
        bulletIndent=2,
        spaceAfter=3.5,
    ))
    styles.add(ParagraphStyle(
        name="SmallMeta",
        fontName=base_font,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#666666"),
        spaceAfter=10,
    ))

    story = []
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    in_list = False
    route_rows = [["Route / Khu vực", "Mục tiêu chính"]]
    current_heading = ""

    for raw in lines:
        line = raw.strip()
        if not line:
            in_list = False
            story.append(Spacer(1, 3))
            continue

        if line.startswith("# "):
            story.append(Paragraph(inline_markup(line[2:]), styles["DocTitle"]))
            story.append(Paragraph(
                "Tổng hợp chức năng, thành phần UI và nhiệm vụ theo từng trang trong app.",
                styles["SmallMeta"],
            ))
            continue

        if line.startswith("## "):
            if story:
                story.append(Spacer(1, 4))
            story.append(Paragraph(inline_markup(line[3:]), styles["H2"]))
            continue

        if line.startswith("### "):
            current_heading = line[4:]
            story.append(Paragraph(inline_markup(current_heading), styles["H3"]))
            if current_heading.startswith("`/") or current_heading.startswith("/"):
                route_rows.append([inline_markup(current_heading), "Xem chi tiết trong phần tương ứng"])
            continue

        if line.startswith("- "):
            story.append(Paragraph(inline_markup(line[2:]), styles["BulletDoc"], bulletText="•"))
            in_list = True
            continue

        if line.endswith(":") and not in_list:
            story.append(Paragraph(f"<b>{inline_markup(line)}</b>", styles["BodyDoc"]))
        else:
            story.append(Paragraph(inline_markup(line), styles["BodyDoc"]))

    if len(route_rows) > 1:
        story.append(PageBreak())
        story.append(Paragraph("Phụ lục: danh sách route/khu vực", styles["H2"]))
        table = Table(route_rows, colWidths=[7.2 * cm, 9.2 * cm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1D47A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111111")),
            ("FONTNAME", (0, 0), (-1, 0), bold_font),
            ("FONTNAME", (0, 1), (-1, -1), base_font),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("LEADING", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D6D6D6")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.55 * cm,
        title="GoldPlan - Tong Hop Chuc Nang Theo Trang",
        author="Codex",
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
