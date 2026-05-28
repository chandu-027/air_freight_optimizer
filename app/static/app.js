// App State
let manifest = [];
let presets = {};
let currentContainer = {
    id: "AKE-LD3-Standard",
    max_weight_capacity: 1588.0,
    length: 156.0,
    width: 153.0,
    height: 160.0,
    max_cog_deviation_pct: 15.0
};

// Preset Manifest Datasets for instant testing
const MANIFEST_PRESETS = {
    standard: [
        { id: "LFG-A1", weight: 220, length: 60, width: 50, height: 40, value: 3500, is_fragile: false },
        { id: "LFG-A2", weight: 180, length: 50, width: 50, height: 50, value: 2800, is_fragile: false },
        { id: "LFG-A3", weight: 310, length: 70, width: 60, height: 50, value: 4900, is_fragile: false },
        { id: "MED-B1", weight: 85,  length: 40, width: 30, height: 30, value: 9200, is_fragile: true },
        { id: "MED-B2", weight: 70,  length: 45, width: 35, height: 25, value: 7500, is_fragile: true },
        { id: "LFG-C1", weight: 150, length: 55, width: 45, height: 45, value: 2100, is_fragile: false },
        { id: "LFG-C2", weight: 110, length: 50, width: 40, height: 40, value: 1600, is_fragile: false },
        { id: "LFG-C3", weight: 240, length: 65, width: 55, height: 50, value: 3800, is_fragile: false },
        { id: "VAL-D1", weight: 45,  length: 30, width: 30, height: 20, value: 15000, is_fragile: true }
    ],
    heavyUnbalanced: [
        // Concentrated heavy weights that will exceed CoG tolerance if packed unchecked
        { id: "HWY-01", weight: 650, length: 80, width: 70, height: 60, value: 12000, is_fragile: false },
        { id: "HWY-02", weight: 580, length: 85, width: 65, height: 55, value: 10500, is_fragile: false },
        { id: "HWY-03", weight: 480, length: 75, width: 75, height: 50, value: 9800, is_fragile: false },
        { id: "DEL-01", weight: 30,  length: 40, width: 40, height: 30, value: 5000, is_fragile: true },
        { id: "DEL-02", weight: 25,  length: 35, width: 30, height: 25, value: 4500, is_fragile: true }
    ]
};

// DOM Elements
const uldPresetSelect = document.getElementById('uld-preset');
const customFieldsContainer = document.getElementById('custom-container-fields');
const cargoForm = document.getElementById('cargo-form');
const manifestBody = document.getElementById('manifest-list-body');
const btnOptimize = document.getElementById('btn-optimize');

// Tab Switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Metrics DOM
const metricVolume = document.getElementById('metric-volume');
const progressVolume = document.getElementById('progress-volume');
const metricWeight = document.getElementById('metric-weight');
const progressWeight = document.getElementById('progress-weight');
const metricValue = document.getElementById('metric-value');
const metricCount = document.getElementById('metric-count');
const metricCog = document.getElementById('metric-cog');
const metricCogDev = document.getElementById('metric-cog-dev');
const cardCogStatus = document.getElementById('card-cog-status');

// Tables
const packedTableBody = document.getElementById('packed-items-table-body');
const unpackedTableBody = document.getElementById('unpacked-items-table-body');

// Canvases
const canvasTop = document.getElementById('canvas-top');
const canvasSide = document.getElementById('canvas-side');
const canvasCog = document.getElementById('canvas-cog');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    fetchPresets();
    setupEventListeners();
    loadManifestPreset('standard');
    resetCanvases();
});

// Fetch standard presets from FastAPI Backend
async function fetchPresets() {
    try {
        const response = await fetch('/api/presets');
        if (response.ok) {
            presets = await response.json();
            updateContainerConfig();
        }
    } catch (e) {
        console.error("Failed to load ULD presets from server, using local fallbacks.", e);
        // Local fallback presets matching backend definition
        presets = {
            "LD3": { id: "AKE-LD3-Standard", max_weight_capacity: 1588.0, length: 156.0, width: 153.0, height: 160.0, max_cog_deviation_pct: 15.0 },
            "LD7": { id: "P1P-LD7-Pallet", max_weight_capacity: 4626.0, length: 318.0, width: 224.0, height: 162.0, max_cog_deviation_pct: 12.0 },
            "LD11": { id: "PLA-LD11-Pallet", max_weight_capacity: 3175.0, length: 318.0, width: 153.0, height: 162.0, max_cog_deviation_pct: 15.0 }
        };
        updateContainerConfig();
    }
}

function setupEventListeners() {
    // Preset Buttons
    document.getElementById('btn-preset-standard').addEventListener('click', () => loadManifestPreset('standard'));
    document.getElementById('btn-preset-heavy').addEventListener('click', () => loadManifestPreset('heavyUnbalanced'));
    document.getElementById('btn-preset-clear').addEventListener('click', clearManifest);

    // Preset ULD Select Trigger
    uldPresetSelect.addEventListener('change', () => {
        if (uldPresetSelect.value === 'custom') {
            customFieldsContainer.classList.remove('hidden');
        } else {
            customFieldsContainer.classList.add('hidden');
            updateContainerConfig();
        }
    });

    // Form Submissions
    cargoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addCargoFromForm();
    });

    // Run Optimization
    btnOptimize.addEventListener('click', runOptimizationSolver);

    // Tab Switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPane = document.getElementById(`view-container-${btn.dataset.view}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// Update current container dimensions based on selection
function updateContainerConfig() {
    const val = uldPresetSelect.value;
    if (val !== 'custom' && presets[val]) {
        currentContainer = { ...presets[val] };
    } else if (val === 'custom') {
        currentContainer = {
            id: "Custom-ULD",
            max_weight_capacity: parseFloat(document.getElementById('uld-weight').value) || 1500,
            length: parseFloat(document.getElementById('uld-length').value) || 150,
            width: parseFloat(document.getElementById('uld-width').value) || 150,
            height: parseFloat(document.getElementById('uld-height').value) || 150,
            max_cog_deviation_pct: parseFloat(document.getElementById('uld-cog-dev').value) || 15
        };
    }
}

// Preset Manifest loader
function loadManifestPreset(key) {
    if (MANIFEST_PRESETS[key]) {
        manifest = JSON.parse(JSON.stringify(MANIFEST_PRESETS[key])); // deep copy
        renderManifestTable();
    }
}

function clearManifest() {
    manifest = [];
    renderManifestTable();
}

// Dynamic item management
function addCargoFromForm() {
    const idVal = document.getElementById('cargo-id').value.trim() || `BOX-${manifest.length + 1}`;
    const weightVal = parseFloat(document.getElementById('cargo-weight').value);
    const lVal = parseFloat(document.getElementById('cargo-l').value);
    const wVal = parseFloat(document.getElementById('cargo-w').value);
    const hVal = parseFloat(document.getElementById('cargo-h').value);
    const valVal = parseFloat(document.getElementById('cargo-val').value) || 100;
    const isFragile = document.getElementById('cargo-fragile').checked;

    if (!weightVal || !lVal || !wVal || !hVal) {
        alert("Please specify Weight, Length, Width, and Height coordinates correctly.");
        return;
    }

    // Check duplicate ID
    if (manifest.some(item => item.id.toUpperCase() === idVal.toUpperCase())) {
        alert(`Cargo ID "${idVal}" already exists in manifest.`);
        return;
    }

    manifest.push({
        id: idVal,
        weight: weightVal,
        length: lVal,
        width: wVal,
        height: hVal,
        value: valVal,
        is_fragile: isFragile
    });

    renderManifestTable();
    cargoForm.reset();
}

function deleteCargoItem(index) {
    manifest.splice(index, 1);
    renderManifestTable();
}

// Render local list manifest
function renderManifestTable() {
    manifestBody.innerHTML = '';
    
    if (manifest.length === 0) {
        manifestBody.innerHTML = `<tr><td colspan="6" class="empty-placeholder">Manifest is empty. Add cargo boxes above.</td></tr>`;
        return;
    }

    manifest.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td>${item.weight} kg</td>
            <td>${item.length}×${item.width}×${item.height} cm</td>
            <td>$${item.value.toLocaleString()}</td>
            <td>
                <span class="badge ${item.is_fragile ? 'badge-fragile' : 'badge-solid'}">
                    ${item.is_fragile ? 'Fragile' : 'Solid'}
                </span>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-xs btn-delete" data-index="${index}">Delete</button>
            </td>
        `;
        manifestBody.appendChild(row);
    });

    // Delete buttons binder
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            deleteCargoItem(idx);
        });
    });
}

// Reset canvases to empty state
function resetCanvases() {
    const ctxTop = canvasTop.getContext('2d');
    const ctxSide = canvasSide.getContext('2d');
    const ctxCog = canvasCog.getContext('2d');

    [ctxTop, ctxSide].forEach(ctx => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(20, 20, ctx.canvas.width - 40, ctx.canvas.height - 40);
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'italic 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Awaiting Placement Run', ctx.canvas.width / 2, ctx.canvas.height / 2);
    });

    ctxCog.clearRect(0, 0, 340, 340);
    ctxCog.fillStyle = '#0b0f19';
    ctxCog.fillRect(0, 0, 340, 340);
    
    // Draw default target board
    ctxCog.strokeStyle = 'rgba(255,255,255,0.1)';
    ctxCog.beginPath();
    ctxCog.arc(170, 170, 130, 0, Math.PI * 2);
    ctxCog.stroke();
    
    ctxCog.beginPath();
    ctxCog.moveTo(170, 20); ctxCog.lineTo(170, 320);
    ctxCog.moveTo(20, 170); ctxCog.lineTo(320, 170);
    ctxCog.stroke();

    ctxCog.fillStyle = 'rgba(255,255,255,0.2)';
    ctxCog.font = 'italic 11px Inter';
    ctxCog.textAlign = 'center';
    ctxCog.fillText('CoG Target System Inactive', 170, 175);
}

// Call Optimization API and handle response
async function runOptimizationSolver() {
    if (manifest.length === 0) {
        alert("Manifest is empty. Please add items to pack.");
        return;
    }

    // Refresh custom container values in case user updated them
    updateContainerConfig();

    btnOptimize.disabled = true;
    btnOptimize.querySelector('span').innerText = 'Computing Layout...';

    try {
        const payload = {
            container: currentContainer,
            items: manifest
        };

        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Server optimizer error");
        }

        const result = await response.json();
        updateUIWithResult(result);

    } catch (e) {
        alert(`Optimization Failed: ${e.message}`);
    } finally {
        btnOptimize.disabled = false;
        btnOptimize.querySelector('span').innerText = 'Calculate Optimal Placement';
    }
}

// Populate Dashboard metrics and charts
function updateUIWithResult(result) {
    // 1. Metric cards
    metricVolume.innerText = `${result.volume_utilization_pct}%`;
    progressVolume.style.width = `${result.volume_utilization_pct}%`;
    
    metricWeight.innerText = `${result.weight_utilization_pct}%`;
    progressWeight.style.width = `${result.weight_utilization_pct}%`;
    if (result.weight_utilization_pct > 90) {
        progressWeight.style.background = 'var(--color-danger)';
    } else {
        progressWeight.style.background = 'linear-gradient(90deg, var(--accent-gold) 0%, #ffa922 100%)';
    }

    metricValue.innerText = `$${result.total_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    metricCount.innerText = `${result.packed_items.length} / ${manifest.length} Packed Successfully`;

    // Center of Gravity State indicator
    const cog = result.center_of_gravity;
    metricCogDev.innerText = `Dev: X ${cog.deviation_x_pct}% | Y ${cog.deviation_y_pct}%`;
    
    cardCogStatus.className = 'metric-card'; // clear classes
    if (cog.is_safe) {
        cardCogStatus.classList.add('safe');
        metricCog.innerText = 'BALANCED';
    } else {
        cardCogStatus.classList.add('danger');
        metricCog.innerText = 'UNBALANCED';
    }

    // 2. Load Packed & Unpacked tables
    packedTableBody.innerHTML = '';
    if (result.packed_items.length === 0) {
        packedTableBody.innerHTML = `<tr><td colspan="4" class="empty-placeholder">Zero items packed in this configuration.</td></tr>`;
    } else {
        result.packed_items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td><span class="text-success">(${Math.round(item.x)}, ${Math.round(item.y)}, ${Math.round(item.z)})</span></td>
                <td>${item.weight} kg</td>
                <td>
                    <span class="badge ${item.is_fragile ? 'badge-fragile' : 'badge-solid'}">
                        ${item.is_fragile ? 'Fragile' : 'Solid'}
                    </span>
                </td>
            `;
            packedTableBody.appendChild(row);
        });
    }

    unpackedTableBody.innerHTML = '';
    if (result.unpacked_items.length === 0) {
        unpackedTableBody.innerHTML = `<tr><td colspan="3" class="empty-placeholder">No rejection safety incidents occurred!</td></tr>`;
    } else {
        result.unpacked_items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.weight} kg</td>
                <td class="text-danger">${item.reason}</td>
            `;
            unpackedTableBody.appendChild(row);
        });
    }

    // 3. Render 3D/2D layouts & Center of Gravity targets
    renderLayouts(result);
}

function renderLayouts(result) {
    const uld = currentContainer;
    const packed = result.packed_items;
    const cog = result.center_of_gravity;

    // A. Canvas Top-Down (X-Y Plane)
    const ctxTop = canvasTop.getContext('2d');
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    ctxTop.fillStyle = '#03060c';
    ctxTop.fillRect(0, 0, canvasTop.width, canvasTop.height);

    // Padding parameters
    const pad = 20;
    const cw = canvasTop.width - (pad * 2);
    const ch = canvasTop.height - (pad * 2);

    // Scaling factors based on container dimensions
    const scaleX = cw / uld.length;
    const scaleY = ch / uld.width;
    const scale = Math.min(scaleX, scaleY);

    // Shift coordinates to center the drawing in canvas
    const offsetX = pad + (cw - (uld.length * scale)) / 2;
    const offsetY = pad + (ch - (uld.width * scale)) / 2;

    // Draw container boundary
    ctxTop.strokeStyle = '#64748b';
    ctxTop.lineWidth = 1.5;
    ctxTop.setLineDash([4, 4]);
    ctxTop.strokeRect(offsetX, offsetY, uld.length * scale, uld.width * scale);
    ctxTop.setLineDash([]);

    // Draw packed cargo items (Top-Down: X & Y axes)
    packed.forEach(item => {
        const rx = offsetX + (item.x * scale);
        const ry = offsetY + (item.y * scale);
        const rw = item.length * scale;
        const rh = item.width * scale;

        // Custom Lufthansa glassmorphic cargo color
        ctxTop.fillStyle = item.is_fragile ? 'rgba(255, 158, 0, 0.4)' : 'rgba(14, 165, 233, 0.4)';
        ctxTop.strokeStyle = item.is_fragile ? 'rgba(255, 158, 0, 0.8)' : 'rgba(14, 165, 233, 0.8)';
        ctxTop.lineWidth = 1;
        ctxTop.fillRect(rx, ry, rw, rh);
        ctxTop.strokeRect(rx, ry, rw, rh);

        // Box ID Label
        if (rw > 25 && rh > 14) {
            ctxTop.fillStyle = '#ffffff';
            ctxTop.font = 'bold 9px Space Mono';
            ctxTop.textAlign = 'center';
            ctxTop.textBaseline = 'middle';
            ctxTop.fillText(item.id, rx + (rw / 2), ry + (rh / 2));
        }
    });

    // B. Canvas Side-View (X-Z Plane)
    const ctxSide = canvasSide.getContext('2d');
    ctxSide.clearRect(0, 0, canvasSide.width, canvasSide.height);
    ctxSide.fillStyle = '#03060c';
    ctxSide.fillRect(0, 0, canvasSide.width, canvasSide.height);

    const scaleZ = ch / uld.height;
    const scaleSZ = Math.min(scaleX, scaleZ);

    const offsetSX = pad + (cw - (uld.length * scaleSZ)) / 2;
    const offsetSZ = pad + (ch - (uld.height * scaleSZ)) / 2;

    // Draw container boundary
    ctxSide.strokeStyle = '#64748b';
    ctxSide.lineWidth = 1.5;
    ctxSide.setLineDash([4, 4]);
    ctxSide.strokeRect(offsetSX, offsetSZ, uld.length * scaleSZ, uld.height * scaleSZ);
    ctxSide.setLineDash([]);

    // Draw packed cargo items (Side View: X & Z axes)
    // Note: Z=0 is at bottom of container. Canvas coordinates Y increase downwards.
    // So canvas Y = offsetSZ + (ULD Height - z_start - Box Height) * scale
    packed.forEach(item => {
        const rx = offsetSX + (item.x * scaleSZ);
        const rz = offsetSZ + (uld.height - item.z - item.height) * scaleSZ;
        const rw = item.length * scaleSZ;
        const rh = item.height * scaleSZ;

        ctxSide.fillStyle = item.is_fragile ? 'rgba(255, 158, 0, 0.4)' : 'rgba(14, 165, 233, 0.4)';
        ctxSide.strokeStyle = item.is_fragile ? 'rgba(255, 158, 0, 0.8)' : 'rgba(14, 165, 233, 0.8)';
        ctxSide.lineWidth = 1;
        ctxSide.fillRect(rx, rz, rw, rh);
        ctxSide.strokeRect(rx, rz, rw, rh);

        if (rw > 25 && rh > 14) {
            ctxSide.fillStyle = '#ffffff';
            ctxSide.font = 'bold 9px Space Mono';
            ctxSide.textAlign = 'center';
            ctxSide.textBaseline = 'middle';
            ctxSide.fillText(item.id, rx + (rw / 2), rz + (rh / 2));
        }
    });

    // C. Canvas Center of Gravity Tactical Radar Target
    const ctxCog = canvasCog.getContext('2d');
    ctxCog.clearRect(0, 0, 340, 340);
    ctxCog.fillStyle = '#03060c';
    ctxCog.fillRect(0, 0, 340, 340);

    const cx = 170;
    const cy = 170;
    const radius = 130;

    // Draw grid radar target lines
    ctxCog.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctxCog.lineWidth = 1;
    ctxCog.beginPath();
    ctxCog.arc(cx, cy, radius, 0, Math.PI * 2);
    ctxCog.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
    ctxCog.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
    ctxCog.stroke();

    ctxCog.beginPath();
    ctxCog.moveTo(cx - radius - 10, cy); ctxCog.lineTo(cx + radius + 10, cy);
    ctxCog.moveTo(cx, cy - radius - 10); ctxCog.lineTo(cx, cy + radius + 10);
    ctxCog.stroke();

    // Container boundary outline (proportional square inside circle representing container coordinates)
    const containerRatio = uld.width / uld.length;
    let containerWidth, containerHeight;
    if (uld.length >= uld.width) {
        containerWidth = radius * 1.6;
        containerHeight = containerWidth * containerRatio;
    } else {
        containerHeight = radius * 1.6;
        containerWidth = containerHeight / containerRatio;
    }

    ctxCog.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctxCog.lineWidth = 1.5;
    ctxCog.strokeRect(cx - (containerWidth / 2), cy - (containerHeight / 2), containerWidth, containerHeight);

    // Draw center crosshair target dot
    ctxCog.fillStyle = '#64748b';
    ctxCog.beginPath();
    ctxCog.arc(cx, cy, 3, 0, Math.PI * 2);
    ctxCog.fill();

    // Draw the safe Center of Gravity deviation limit box (dashed amber)
    const deviationLimitPct = uld.max_cog_deviation_pct / 100.0;
    const limitWidth = containerWidth * deviationLimitPct * 2;
    const limitHeight = containerHeight * deviationLimitPct * 2;

    ctxCog.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctxCog.lineWidth = 1.5;
    ctxCog.setLineDash([3, 3]);
    ctxCog.strokeRect(cx - (limitWidth / 2), cy - (limitHeight / 2), limitWidth, limitHeight);
    ctxCog.setLineDash([]);

    // Map calculated CoG position onto canvas
    // cog_x and cog_y relative to container center
    // Normalizing coord mapping: cog_x - center_x / container.length ranges from -0.5 to 0.5
    // Map -0.5 to 0.5 onto -containerWidth/2 to containerWidth/2
    const centerNormX = uld.length / 2.0;
    const centerNormY = uld.width / 2.0;

    const relX = (cog.cog_x - centerNormX) / uld.length;
    const relY = (cog.cog_y - centerNormY) / uld.width;

    const plotX = cx + (relX * containerWidth);
    const plotY = cy + (relY * containerHeight); // Canvas coordinates matches +y downwards, matching container topdown +y frontwards. Perfect match!

    // Draw CoG target point (Circle crosshair with pulsing radius if danger)
    const activeColor = cog.is_safe ? 'var(--color-success)' : 'var(--color-danger)';
    
    ctxCog.strokeStyle = activeColor;
    ctxCog.lineWidth = 2;
    ctxCog.beginPath();
    ctxCog.arc(plotX, plotY, 8, 0, Math.PI * 2);
    ctxCog.stroke();

    ctxCog.fillStyle = activeColor;
    ctxCog.beginPath();
    ctxCog.arc(plotX, plotY, 3, 0, Math.PI * 2);
    ctxCog.fill();

    ctxCog.beginPath();
    ctxCog.moveTo(plotX - 14, plotY); ctxCog.lineTo(plotX + 14, plotY);
    ctxCog.moveTo(plotX, plotY - 14); ctxCog.lineTo(plotX, plotY + 14);
    ctxCog.stroke();

    // Legend labeling inside Canvas
    ctxCog.fillStyle = '#94a3b8';
    ctxCog.font = '500 10px Outfit';
    ctxCog.textAlign = 'left';
    ctxCog.fillText(`Safety Limit: ±${uld.max_cog_deviation_pct}%`, cx - (containerWidth / 2), cy - (containerHeight / 2) - 10);
}
