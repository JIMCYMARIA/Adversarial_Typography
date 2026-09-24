# Adversarial Typography

PDF-level detection and sanitization research prototype for hidden instructions in resumes. The existing Vite/vanilla-JS document scan is retained; a separate React/Tailwind route provides synthetic experiments. FastAPI and PyMuPDF perform analysis locally on the CPU.

## Run locally

Install backend dependencies with `python -m pip install -r requirements.txt`, then start the API from this directory:

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, run `npm install` once and start Vite:

```powershell
npm run dev
```

The document scan is at `/`; the isolated React/Tailwind research lab is at `/experiments`. Run backend and UI checks with `python -m pip install -r requirements-dev.txt`, `python -m pytest -q`, and `npm run build`.

In Vite development, the UI defaults to `http://127.0.0.1:8000`; set `VITE_API_URL` to override it. Production always calls the same-origin `/api/...` routes. `api/index.py` exports the existing FastAPI app for Vercel, while Vercel detects and builds the Vite frontend from `package.json`. With a linked Vercel project, `vercel dev` serves both from one local origin. Standalone local API docs are at `http://127.0.0.1:8000/docs`.

## API

- `GET /api/health`, `GET /api/config`
- `POST /api/analyze` (`multipart/form-data`, field `file`): actual PDF text spans, physical features, findings, baseline, and explainable risk.
- `POST /api/render-page` (`multipart/form-data`, field `file`, query `page_number`): PNG rendered from that uploaded PDF, with physical page dimensions in response headers.
- `POST /api/sanitize`: quarantines spans that triggered findings in a sanitized semantic representation; it does not modify the source PDF.
- `POST /api/audit-report`: HTML audit report.
- `POST /api/generate-test-document`: synthetic research PDF returned as base64 with ground truth.
- `POST /api/run-experiment`: generates synthetic scenarios and evaluates detector outcomes.

The `/experiments` page generates matched clean/attack PDF samples and compares PHYSICAL ONLY, SEMANTIC ONLY, and PHYSICAL + SEMANTIC on the same documents. Metrics and confusion counts are calculated from those generated runs and labeled SYNTHETIC DATASET. Parameters include scenario, sample count, font size, RGB text/background, position, and payload.

Uploads are held in memory for the request and are never sent to external services. The local backend accepts up to 20 MiB; Vercel mode caps PDFs at 4 MiB to stay below the platform’s 4.5 MB function request-body limit. Password-protected, malformed, empty, and image-only PDFs return explicit errors; image-only documents need OCR, which is not implemented. Background estimation returns `unavailable` because page regions can be nonuniform or contain images and overlays; near-white text remains supporting evidence only. PDF rewriting, OCR, persistence, and real-resume validation are not implemented. No sample resume PDFs were present in the repository.

## Detection notes

The local rule engine flags sub-2 pt or very small relative text, near-white font colors, low opacity where PyMuPDF exposes it, page-edge/off-page geometry, and a small regex set of prompt-injection phrases. These are suspicious indicators, not proof of malicious intent. The document score uses the strongest span score rather than summing repeated spans. Rule weights are explicit in `backend/main.py` and are research heuristics, not validated probabilities. Page overlays transform unrotated PyMuPDF text rectangles through the page rotation matrix; portrait, landscape, unusual dimensions, and 90/180/270-degree rotations are covered by `python -m pytest -q` coordinate tests.
