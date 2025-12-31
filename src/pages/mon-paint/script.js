import { pokemonData } from '../../data/pokemonData.js';

// DOM Elements
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const btnBrush = document.getElementById('btnBrush');
const btnEraser = document.getElementById('btnEraser');
const btnStamp = document.getElementById('btnStamp');
const brushSettings = document.getElementById('brushSettings');
const stampSettings = document.getElementById('stampSettings');
const brushColorInput = document.getElementById('brushColor');
const brushSizeInput = document.getElementById('brushSize');
const stampScaleInput = document.getElementById('stampScale');
const stampScaleVal = document.getElementById('stampScaleVal');
const stampHueInput = document.getElementById('stampHue');
const stampList = document.getElementById('stampList');
const btnClear = document.getElementById('btnClear');
const btnSave = document.getElementById('btnSave');

// State
let currentTool = 'brush'; // brush, eraser, stamp
let isDrawing = false;
let brushColor = '#333333';
let brushSize = 5;
let stampScale = 1.0;
let stampHue = 0;
let selectedStampImg = null;

// Initialize Canvas
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// --- Tool Switching Logic ---
function setTool(tool) {
    currentTool = tool;

    // UI Updates
    btnBrush.classList.remove('active');
    btnEraser.classList.remove('active');
    btnStamp.classList.remove('active');

    if (tool === 'brush') {
        btnBrush.classList.add('active');
        brushSettings.classList.remove('hidden');
        stampSettings.classList.add('hidden');
        ctx.globalCompositeOperation = 'source-over';
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        btnEraser.classList.add('active');
        brushSettings.classList.remove('hidden'); // Eraser uses size
        stampSettings.classList.add('hidden');
        ctx.globalCompositeOperation = 'destination-out';
        canvas.style.cursor = 'cell';
    } else if (tool === 'stamp') {
        btnStamp.classList.add('active');
        brushSettings.classList.add('hidden');
        stampSettings.classList.remove('hidden');
        ctx.globalCompositeOperation = 'source-over';
        canvas.style.cursor = 'grab';
    }
}

btnBrush.onclick = () => setTool('brush');
btnEraser.onclick = () => setTool('eraser');
btnStamp.onclick = () => setTool('stamp');

// --- Settings Handling ---
brushColorInput.addEventListener('input', (e) => {
    brushColor = e.target.value;
});

brushSizeInput.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10);
});

stampScaleInput.addEventListener('input', (e) => {
    stampScale = parseFloat(e.target.value);
    stampScaleVal.textContent = stampScale.toFixed(1) + 'x';
});

stampHueInput.addEventListener('input', (e) => {
    stampHue = parseInt(e.target.value, 10);
});

// --- Stamp List Generation ---
function initStampList() {
    pokemonData.forEach((pokemon, index) => {
        const div = document.createElement('div');
        div.className = 'stamp-item';
        if (index === 0) div.classList.add('selected'); // Select first by default

        const img = document.createElement('img');
        img.src = pokemon.image;
        img.alt = pokemon.name;

        div.appendChild(img);
        div.onclick = () => {
            // Select logic
            document.querySelectorAll('.stamp-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedStampImg = img;
        };

        stampList.appendChild(div);

        // Ensure first image is selected initially
        if (index === 0) selectedStampImg = img;
    });
}

// --- Drawing Logic ---
function startPosition(e) {
    if (currentTool === 'stamp') {
        placeStamp(e);
    } else {
        isDrawing = true;
        draw(e);
    }
}

function endPosition() {
    isDrawing = false;
    ctx.beginPath(); // Reset path
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function draw(e) {
    if (!isDrawing) return;
    if (currentTool === 'stamp') return;

    const pos = getPos(e);

    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;

    // Ensure filter is off for drawing
    ctx.filter = 'none';

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    e.preventDefault(); // Prevent scrolling on touch
}

function placeStamp(e) {
    if (!selectedStampImg) return;

    const pos = getPos(e);

    // Original size
    const w = selectedStampImg.naturalWidth || 100;
    const h = selectedStampImg.naturalHeight || 100;

    // Scaled size
    const drawW = w * stampScale * 0.5; // Base scale down a bit as raw images might be large
    const drawH = h * stampScale * 0.5;

    // Centered
    const x = pos.x - drawW / 2;
    const y = pos.y - drawH / 2;

    // Apply Hue Filter
    if (stampHue !== 0) {
        ctx.filter = `hue-rotate(${stampHue}deg)`;
    } else {
        ctx.filter = 'none';
    }

    ctx.drawImage(selectedStampImg, x, y, drawW, drawH);
    ctx.filter = 'none'; // Reset immediately
}

// Event Listeners
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseleave', endPosition); // Stop drawing if mouse leaves

// Touch support
canvas.addEventListener('touchstart', startPosition);
canvas.addEventListener('touchend', endPosition);
canvas.addEventListener('touchmove', draw);

// --- Clear & Save ---
btnClear.onclick = () => {
    if (confirm('本当に全部消しますか？')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

btnSave.onclick = () => {
    // Determine user preference? Just download png.
    const link = document.createElement('a');
    link.download = 'my-pokemon-drawing.png';
    link.href = canvas.toDataURL();
    link.click();
};

// Initialize
initStampList();
setTool('brush');
