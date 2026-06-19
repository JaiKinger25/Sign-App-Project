import os
import fitz
import base64

SIGNED_DIR = "signed"
os.makedirs(SIGNED_DIR, exist_ok=True)


def _decode_signature_image(data_url: str | None):
    if not data_url:
        return None
    try:
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]
        return base64.b64decode(data_url)
    except Exception:
        return None


def _signature_rect(page, sig):
    """Convert saved frontend coordinates to real PDF coordinates.

    New app saves x/y as ratios between 0 and 1, relative to the rendered PDF page.
    Example: x=0.25 means 25% from the left side of the page.
    Old app saved x/y as pixels, so values bigger than 1 are treated as old pixel-style coordinates.
    """
    page_w = page.rect.width
    page_h = page.rect.height

    x = float(sig.x)
    y = float(sig.y)

    if 0 <= x <= 1 and 0 <= y <= 1:
        pdf_x = x * page_w
        pdf_y = y * page_h
        sig_w = page_w * 0.24
        sig_h = page_h * 0.075
    else:
        pdf_x = x
        pdf_y = y
        sig_w = 190
        sig_h = 75

    # Keep the signature fully inside the page.
    pdf_x = max(0, min(pdf_x, page_w - sig_w))
    pdf_y = max(0, min(pdf_y, page_h - sig_h))
    return fitz.Rect(pdf_x, pdf_y, pdf_x + sig_w, pdf_y + sig_h)


def finalize_pdf(document, signatures):
    pdf = fitz.open(document.stored_path)
    for sig in signatures:
        page_index = max(sig.page - 1, 0)
        if page_index >= len(pdf):
            continue

        page = pdf[page_index]
        image_bytes = _decode_signature_image(getattr(sig, "signature_image", None))
        rect = _signature_rect(page, sig)

        if image_bytes:
            page.insert_image(rect, stream=image_bytes, keep_proportion=True)
        else:
            # Typed-name signature only. No extra date/time text is printed.
            page.insert_text((rect.x0 + 8, rect.y0 + 35), str(sig.signer_name), fontsize=18)

    output_path = os.path.join(SIGNED_DIR, f"signed_{document.id}_{os.path.basename(document.filename)}")
    pdf.save(output_path, garbage=4, deflate=True)
    pdf.close()
    return output_path
