# air_freight_optimizer
AeroPack 3D is a production‑grade air freight optimizer that solves 3D bin packing with aviation safety rules. It maximizes ULD space, enforces fragility and crush prevention, ensures vertical support, and monitors center of gravity with real‑time alerts. FastAPI backend + HTML5 Canvas UI, Docker‑ready.
=======
# ✈ AeroPack 3D: Air Freight Space & Weight Optimizer

AeroPack 3D is an enterprise-grade, high-performance **3D Bin Packing and Weight Balancer** microservice, custom-engineered for aviation cargo logistics (such as Lufthansa Cargo operations). It maximizes container volume utilization while satisfying critical physical, safety, and structural flight stability constraints in real time.

---

## 🚀 Key Production Features

1. **Optimal 3D Coordinate Bin Packing**: Computes precise starting coordinates `(x, y, z)` for every packed item, preventing dimensional overlap and boundary collisions.
2. **Aviation Center of Gravity (CoG) Envelopes**: Proactively verifies that the container's centroid weight center remains within standard safety boundaries (typically within $\pm 12-15\%$ of the geometric center) to prevent unbalancing.
3. **Crush Prevention & Support Checks**: Ensures boxes are physically stable—either sitting on the ULD floor (`z=0`) or fully supported by non-fragile items beneath them.
4. **Economic Yield Sorting**: Prioritizes higher-value commercial cargo via an economic sorting algorithm.
5. **Interactive Single Page Dashboard**: A dark-mode, glassmorphic UI served directly by FastAPI, featuring:
   - Dynamic cargo additions and manifest custom sets.
   - Dual-view 2D orthographic canvas rendering of packed boxes (Top-Down and Side-View).
   - A tactical aviation radar plot displaying the allowable stability envelope and real-time CoG crosshair.

---

## 📂 Project Architecture

```text
air_freight_optimizer/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entrypoint, standard ULD templates & static asset serving
│   ├── models.py            # Pydantic schemas validating input manifests and output solutions
│   ├── optimizer.py         # 3D FFDH coordinate packing engine & CoG envelope checker
│   └── static/
│       ├── index.html       # Semantic single page application markup
│       ├── styles.css       # Deep-navy & gold dark mode glassmorphic styling
│       └── app.js           # Client-side state manager and canvas visualizer
├── tests/
│   ├── __init__.py
│   └── test_optimizer.py    # Suite verifying boundaries, support stability, and CoG math
├── Dockerfile               # Production container configuration
├── requirements.txt         # Production and testing python dependencies
└── README.md                # System documentation
```

---

## 🛠 Setup & Local Installation

### Prerequisites
- Python 3.9 or higher installed.

### 1. Set Up Virtual Environment & Dependencies
Open a PowerShell terminal in the project directory:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Optimization Application
Launch the high-performance Uvicorn dev server:

```bash
uvicorn app.main:app --reload
```
Once started, open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🧪 Running Automated Tests
Run the comprehensive unit test suite to verify the physics engine and stability checks:

```bash
pytest -v
```

---

## 📦 Containerization & Deployment
To package and run the service inside a Docker container:

```bash
# Build the image
docker build -t aeropack-optimizer .

# Run the container
docker run -p 8000:8000 aeropack-optimizer
```
Access the application on `http://localhost:8000` or inspect raw OpenAPI endpoints on `http://localhost:8000/docs`.

---

## 🧠 Algorithmic Strategy & Stability Math

### Centroid Center of Gravity Calculation
The 3D Center of Gravity coordinates $(CoG_x, CoG_y, CoG_z)$ of the container are computed dynamically by weighting the centroids of each packed box:

$$CoG_x = \frac{\sum_{i} (w_i \cdot x_{i, center})}{\sum_{i} w_i}, \quad CoG_y = \frac{\sum_{i} (w_i \cdot y_{i, center})}{\sum_{i} w_i}$$

Where:
- $w_i$ is the weight of item $i$.
- $x_{i, center} = X_{start} + \frac{Length_i}{2}$ (the horizontal midpoint of the box).
- $y_{i, center} = Y_{start} + \frac{Width_i}{2}$ (the lateral midpoint of the box).

### Envelope Stability Enforcement
A flight configuration is marked **UNBALANCED** if:

$$\text{Deviation}_x = \frac{|CoG_x - \frac{L_{ULD}}{2}|}{L_{ULD}} \cdot 100 > \text{Max Deviation Allowed}$$

If a box violates this tolerance at all candidate placement points, it is dynamically excluded and logged as a safety incident, ensuring the container remains safely balanced.
>>>>>>> 6700763 (feat: initial commit of AeroPack 3D optimizer)
