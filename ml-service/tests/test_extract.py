import io

from docx import Document
from fastapi.testclient import TestClient

from app.main import app


def make_docx(lines):
    doc = Document()
    for line in lines:
        doc.add_paragraph(line)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def make_pdf(text):
    """PDF mínimo válido con una línea de texto (offsets calculados)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objs = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
        b"<</Length %d>>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    out += b"".join(b"%010d 00000 n \n" % off for off in offsets)
    out += b"trailer\n<</Root 1 0 R/Size %d>>\nstartxref\n%d\n%%%%EOF" % (len(objs) + 1, xref)
    return out


def post(client, name, data):
    return client.post("/extract", files={"file": (name, data)})


def test_extract_docx():
    with TestClient(app) as client:
        r = post(client, "cv.docx", make_docx(["Desarrollador backend con 4 años de experiencia", "Node.js, Express y PostgreSQL"]))
    assert r.status_code == 200
    assert "Node.js" in r.json()["text"]


def test_extract_pdf():
    with TestClient(app) as client:
        r = post(client, "cv.pdf", make_pdf("Desarrollador backend con 4 anos de experiencia en Node.js"))
    assert r.status_code == 200
    assert "Node.js" in r.json()["text"]


def test_extract_rejects_unsupported_format():
    with TestClient(app) as client:
        assert post(client, "cv.txt", b"hola").status_code == 415


def test_extract_rejects_document_without_text():
    with TestClient(app) as client:
        assert post(client, "vacio.docx", make_docx([""])).status_code == 422
