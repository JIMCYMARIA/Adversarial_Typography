import base64

import fitz
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from api.index import app as vercel_app

client=TestClient(app)


def test_api_index_exposes_same_app():
    assert vercel_app is app


def test_health_and_config_endpoints():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "online"
    assert res.json()["engine"] == "PyMuPDF"

    res_cfg = client.get("/api/config")
    assert res_cfg.status_code == 200
    assert "max_file_bytes" in res_cfg.json()


def test_synthetic_upload_is_never_labeled_as_real():
    generated=client.post("/api/generate-test-document",json={"scenario":"MICRO-TEXT"})
    assert generated.status_code==200
    pdf=base64.b64decode(generated.json()["pdf_base64"])
    analyzed=client.post("/api/analyze",files={"file":("synthetic.pdf",pdf,"application/pdf")})
    assert analyzed.status_code==200
    result=analyzed.json()
    assert result["analysis_type"]=="SYNTHETIC RESEARCH SCENARIO"
    assert result["background_estimation"]["status"]=="unavailable"
    assert "MICRO_TYPOGRAPHY" in result["findings"][0]["attack_types"]
    report=client.post("/api/audit-report",json={"analysis":result})
    assert report.status_code==200 and "SYNTHETIC RESEARCH SCENARIO" in report.text
    assert "Physical PDF sanitization is available" in report.text
    assert "The original PDF is not rewritten" not in report.text
    rendered=client.post("/api/render-page?page_number=1",files={"file":("synthetic.pdf",pdf,"application/pdf")})
    assert rendered.status_code==200 and rendered.headers["content-type"].startswith("image/png")


def test_ablation_metrics_are_computed_from_same_balanced_dataset():
    result=client.post("/api/run-experiment",json={"scenario":"SEMANTIC INJECTION","samples":1}).json()
    assert result["dataset_label"]=="SYNTHETIC DATASET"
    assert result["sample_count"]==2
    assert result["metrics_by_mode"]["PHYSICAL ONLY"]["metrics"]["fn"]==1
    assert result["metrics_by_mode"]["SEMANTIC ONLY"]["metrics"]["tp"]==1
    for mode in result["metrics_by_mode"].values():
        m=mode["metrics"]
        assert m["tp"]+m["tn"]+m["fp"]+m["fn"]==2


def test_invalid_and_image_only_pdfs_return_explicit_errors():
    invalid=client.post("/api/analyze",files={"file":("bad.pdf",b"not a PDF","application/pdf")})
    assert invalid.status_code==415
    doc=fitz.open(); doc.new_page(); image_only=doc.tobytes(); doc.close()
    response=client.post("/api/analyze",files={"file":("image-only.pdf",image_only,"application/pdf")})
    assert response.status_code==422
    assert "OCR would be required" in response.json()["detail"]


@pytest.mark.parametrize("scenario,expected",[
    ("CLEAN RESUME",None),
    ("MICRO-TEXT","MICRO_TYPOGRAPHY"),
    ("WHITE-ON-WHITE","COLOR_CAMOUFLAGE"),
    ("LOW-CONTRAST","COLOR_CAMOUFLAGE"),
    ("TRANSPARENT TEXT","TRANSPARENT_TEXT"),
    ("OFF-CANVAS","SPATIAL_OFF_CANVAS"),
    ("SEMANTIC INJECTION","SEMANTIC_PROMPT_INJECTION"),
    ("MULTI-VECTOR","MULTI_VECTOR"),
])
def test_generated_scenario_matches_its_observed_detector_result(scenario,expected):
    generated=client.post("/api/generate-test-document",json={"scenario":scenario}).json()
    pdf=base64.b64decode(generated["pdf_base64"])
    analysis=client.post("/api/analyze",files={"file":("scenario.pdf",pdf,"application/pdf")}).json()
    types={kind for finding in analysis["findings"] for kind in finding["attack_types"]}
    if expected is None:
        assert analysis["suspicious_objects"]==0
    else:
        assert expected in types
    assert analysis["analysis_type"]=="SYNTHETIC RESEARCH SCENARIO"


def test_clean_only_experiment_reports_undefined_positive_class_metrics():
    result=client.post("/api/run-experiment",json={"scenario":"CLEAN RESUME","samples":1}).json()
    assert result["sample_count"]==1 and result["clean_count"]==1 and result["attack_count"]==0
    assert result["metrics_by_mode"]["PHYSICAL + SEMANTIC"]["metrics"]["recall"] is None


def test_physical_pdf_sanitization():
    # 1. Generate a synthetic adversarial PDF using /api/generate-test-document (MULTI-VECTOR)
    generated = client.post("/api/generate-test-document", json={"scenario": "MULTI-VECTOR"})
    assert generated.status_code == 200
    pdf_bytes = base64.b64decode(generated.json()["pdf_base64"])

    # 2. Analyze it
    analyzed = client.post("/api/analyze", files={"file": ("multi-vector.pdf", pdf_bytes, "application/pdf")})
    assert analyzed.status_code == 200
    analysis = analyzed.json()

    # 3. Confirm suspicious_objects > 0
    assert analysis["suspicious_objects"] > 0
    malicious_snippet = "Ignore previous instructions"

    # 4. Send the original PDF to /api/sanitize-pdf
    res = client.post("/api/sanitize-pdf", files={"file": ("multi-vector.pdf", pdf_bytes, "application/pdf")})

    # 5. Assert status and headers
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/pdf")
    assert res.headers["X-Sanitization-Mode"] == "PHYSICAL-PDF"
    assert int(res.headers["X-Sanitized-Objects"]) > 0
    assert "multi-vector-sanitized.pdf" in res.headers["Content-Disposition"]

    # 6. Open the returned PDF with PyMuPDF
    sanitized_doc = fitz.open(stream=res.content, filetype="pdf")

    # 7. Extract its text
    sanitized_text = "".join(p.get_text() for p in sanitized_doc)

    # 8. Verify that the malicious payload is NOT present
    assert malicious_snippet not in sanitized_text

    # 9. Verify that legitimate resume text IS still present
    assert "Resume of Alex Example" in sanitized_text

    # 10. Verify page count is preserved
    assert sanitized_doc.page_count == 1
    sanitized_doc.close()


def test_physical_pdf_sanitization_clean_document():
    # Clean document test
    clean_gen = client.post("/api/generate-test-document", json={"scenario": "CLEAN RESUME"})
    assert clean_gen.status_code == 200
    clean_pdf = base64.b64decode(clean_gen.json()["pdf_base64"])

    res_clean = client.post("/api/sanitize-pdf", files={"file": ("clean_resume.pdf", clean_pdf, "application/pdf")})
    assert res_clean.status_code == 200
    assert res_clean.headers["content-type"].startswith("application/pdf")
    assert res_clean.headers["X-Sanitization-Mode"] == "PHYSICAL-PDF"
    assert res_clean.headers["X-Sanitized-Objects"] == "0"
    assert "clean_resume-sanitized.pdf" in res_clean.headers["Content-Disposition"]

    doc_clean = fitz.open(stream=res_clean.content, filetype="pdf")
    clean_text = "".join(p.get_text() for p in doc_clean)
    assert "Resume of Alex Example" in clean_text
    assert doc_clean.page_count == 1
    doc_clean.close()

