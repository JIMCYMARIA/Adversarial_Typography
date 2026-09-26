# Adversarial Typography

**PDF-level detection and sanitization research prototype for identifying hidden instructions and adversarial text in resumes and other PDF documents.**

Adversarial Typography analyzes PDF text at both the **physical** and **semantic** levels to identify suspicious typography, positioning, visibility, and prompt-injection patterns.

The project retains the existing **Vite/vanilla-JS document scanner** while providing a separate **React + Tailwind research lab** for controlled synthetic experiments. The backend uses **FastAPI** and **PyMuPDF** for local, CPU-based PDF analysis.

> **Research prototype:** Detection rules are heuristic indicators intended for experimentation and analysis. They do not establish malicious intent or provide a definitive security classification.

---

## Features

* **PDF-level text analysis**

  * Extracts actual PDF text spans and their physical properties.
  * Analyzes font size, color, opacity, position, and geometry.
  * Detects text near page boundaries or outside expected regions.

* **Semantic prompt-injection detection**

  * Identifies a small set of suspicious instruction patterns using regular expressions.
  * Combines semantic and physical indicators into an explainable risk score.

* **Document sanitization**

  * Quarantines spans that trigger detection rules.
  * Produces a sanitized semantic representation without modifying the original PDF.

* **Visual PDF rendering**

  * Renders individual PDF pages as PNG images.
  * Supports unusual page dimensions and page rotations.

* **Synthetic research laboratory**

  * Generates matched clean and adversarial PDF samples.
  * Compares:

    * **PHYSICAL ONLY**
    * **SEMANTIC ONLY**
    * **PHYSICAL + SEMANTIC**
  * Calculates detection metrics and confusion counts from the generated synthetic dataset.

* **Audit reporting**

  * Generates an HTML audit report containing detection findings and supporting evidence.

* **Local-first processing**

  * Uploaded documents are processed in memory.
  * Files are not sent to external services.

---

## Architecture

```text
                     ┌─────────────────────┐
                     │      PDF Input      │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │      FastAPI        │
                     │      Backend        │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
           ┌─────────────────┐     ┌─────────────────┐
           │    PyMuPDF      │     │ Semantic Rules  │
           │ Physical        │     │ Prompt-Injection│
           │ Analysis        │     │ Detection       │
           └────────┬────────┘     └────────┬────────┘
                    │                       │
                    └───────────┬───────────┘
                                ▼
                     ┌─────────────────────┐
                     │ Explainable Risk    │
                     │ & Findings          │
                     └──────────┬──────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             Analyze        Sanitize       Audit Report
```

---

## Run Locally

### 1. Install backend dependencies

From the project root:

```bash
python -m pip install -r requirements.txt
```

### 2. Start the FastAPI backend

```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Start the Vite frontend

In a second terminal:

```bash
npm install
npm run dev
```

The main document scanner is available at:

```text
/
```

The isolated React/Tailwind research laboratory is available at:

```text
/experiments
```

---

## Testing & Validation

Install development dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

Run the backend test suite:

```bash
python -m pytest -q
```

Build the frontend:

```bash
npm run build
```

The test suite includes coordinate and page-overlay validation for:

* Portrait pages
* Landscape pages
* Unusual page dimensions
* 90° rotations
* 180° rotations
* 270° rotations

---

## API

### `GET /api/health`

Returns the backend health status.

### `GET /api/config`

Returns relevant runtime configuration.

### `POST /api/analyze`

Analyzes an uploaded PDF.

**Request**

```text
multipart/form-data
file: <PDF>
```

**Analysis includes:**

* Extracted text spans
* Physical text properties
* Detection findings
* Baseline information
* Explainable risk score

---

### `POST /api/render-page`

Renders a selected PDF page as a PNG.

**Parameters**

```text
file: <PDF>
page_number: <integer>
```

The response also provides physical page dimensions through response headers.

---

### `POST /api/sanitize`

Creates a sanitized semantic representation by quarantining text spans that triggered detection findings.

> The original PDF is not modified.

---

### `POST /api/audit-report`

Generates an HTML audit report containing the analysis results and detection evidence.

---

### `POST /api/generate-test-document`

Generates a synthetic research PDF and returns it as base64 together with its corresponding ground-truth labels.

---

### `POST /api/run-experiment`

Generates synthetic scenarios and evaluates detector performance.

Supported parameters include:

* Scenario
* Sample count
* Font size
* RGB text/background values
* Text position
* Payload

The experiment compares:

| Detector                | Description                             |
| ----------------------- | --------------------------------------- |
| **PHYSICAL ONLY**       | Uses physical/typographic indicators    |
| **SEMANTIC ONLY**       | Uses semantic prompt-injection patterns |
| **PHYSICAL + SEMANTIC** | Combines both detection approaches      |

Results include detection metrics and confusion counts calculated from the generated synthetic dataset.

> **Dataset label:** `SYNTHETIC DATASET`

---

## Detection Methodology

Adversarial Typography currently uses a rule-based detector that combines **physical PDF characteristics** with **semantic indicators**.

### Physical Indicators

The detector can flag:

* Text below approximately **2 pt**
* Extremely small text relative to the surrounding document
* Near-white font colors
* Low-opacity text when opacity information is exposed by PyMuPDF
* Text positioned near page boundaries
* Text positioned outside expected page geometry

### Semantic Indicators

A small regular-expression rule set searches for suspicious prompt-injection patterns and instruction-like content.

These indicators are treated as **supporting evidence**, rather than definitive proof of malicious intent.

---

## Explainable Risk Scoring

The document-level risk score is derived from the **strongest detected span**, rather than simply summing repeated findings.

This prevents a document containing many repetitions of the same weak signal from automatically receiving an inflated score.

Rule weights are explicitly defined in:

```text
backend/main.py
```

The current weights are **research heuristics** and should not be interpreted as statistically validated probabilities.

---

## Page Geometry & Visualization

The document scanner supports PDF pages with:

* Portrait orientation
* Landscape orientation
* Unusual page dimensions
* 90° rotation
* 180° rotation
* 270° rotation

Page overlays transform unrotated PyMuPDF text rectangles using the page rotation matrix so that detected spans remain correctly aligned with their rendered page coordinates.

Coordinate handling is covered by the automated test suite.

---

## Security & Privacy

Documents are processed locally by the backend.

* Uploaded PDFs are held **in memory for the duration of the request**.
* Documents are **not sent to external services**.
* No persistent document storage is implemented.
* The local backend accepts files up to **20 MiB**.
* Vercel deployments cap PDF requests at **4 MiB** to remain within the platform's request-body constraints.

---

## Current Limitations

This project is currently a research prototype and has several known limitations.

### PDF Processing

* Password-protected PDFs are rejected.
* Malformed PDFs return explicit errors.
* Empty PDFs return explicit errors.
* Image-only PDFs require OCR, which is **not currently implemented**.

### Background Analysis

Background estimation currently returns:

```text
unavailable
```

because PDF pages can contain nonuniform backgrounds, images, overlays, and other graphical elements.

Near-white text is therefore treated as **supporting evidence**, rather than definitive evidence of hidden text.

### Sanitization

The current sanitization endpoint produces a **sanitized semantic representation**.

It does not rewrite the original PDF file.

### Other Limitations

The following are currently outside the project scope:

* PDF rewriting
* OCR
* Persistent document storage
* Real-resume validation
* Production-grade threat classification
* Statistically validated detection probabilities

No sample resume PDFs are currently included in the repository.

---

## Research Scope

The project is designed to investigate whether **physical PDF characteristics and semantic analysis can be combined to identify hidden or adversarial instructions embedded within documents**.

The synthetic experiment framework provides a controlled environment for comparing detection strategies under known ground-truth conditions.

Because the current dataset is synthetic and the detection rules are heuristic, experimental results should be interpreted as **prototype-level evidence rather than real-world performance guarantees**.

---

## Deployment

The application can be deployed as a single Vercel project.

### Backend

`api/index.py` exposes the existing FastAPI application as the Vercel entry point.

### Frontend

Vercel detects and builds the Vite frontend through `package.json`.

### Production Routing

Production requests use same-origin API routes:

```text
/api/...
```

During Vite development, the frontend defaults to:

```text
http://127.0.0.1:8000
```

The API URL can be overridden using:

```text
VITE_API_URL
```

With a linked Vercel project, `vercel dev` can serve the frontend and backend from a single local origin.

---

## Project Structure

```text
Adversarial_Typography/
│
├── backend/
│   └── main.py
│
├── api/
│   └── index.py
│
├── frontend/
│   └── ...
│
├── experiments/
│   └── ...
│
├── requirements.txt
├── requirements-dev.txt
├── package.json
├── vercel.json
└── README.md
```

---

## Status

**Research Prototype — Active Development**

The current implementation focuses on:

* PDF-level adversarial text detection
* Explainable physical and semantic indicators
* Synthetic evaluation
* Document sanitization
* Visual evidence through page overlays
* Local CPU-based processing
* Vercel-compatible deployment

Future work can extend the system toward OCR-based analysis, PDF rewriting, larger evaluation datasets, real-world resume validation, and more robust adversarial-document detection.
