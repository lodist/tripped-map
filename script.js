// ========== OPEN IMAGE MASK ==========
function openImageMask() {
    document.getElementById('image-mask').style.display = 'flex';
}

// Close mask if user clicks outside
document.getElementById('image-mask').addEventListener('click', function (event) {
    if (event.target.id === 'image-mask') {
        document.getElementById('image-mask').style.display = 'none';
    }
});

// ========== HANDLE IMAGE UPLOAD ==========
function handleImage(event) {
    const file = event.target.files[0];
    processImage(file);
}

// ========== HANDLE DRAG & DROP ==========
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.style.border = '2px dashed #007BFF';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.border = '2px dashed #ccc';
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.style.border = '2px dashed #ccc';
    const file = event.dataTransfer.files[0];
    processImage(file);
});

// ========== PROCESS IMAGE ==========
function processImage(file) {
    if (!file) return;
    document.getElementById('image-mask').style.display = 'none';
    const reader = new FileReader();
    reader.onload = function (e) {
        let img = new Image();
        img.src = e.target.result;
        img.onload = function () {
            predict(img);
        };
    };
    reader.readAsDataURL(file);
}

// ========== MODEL LOADING ==========
let models = [];
let modelsLoaded = false;
const modelUrls = [
    "https://pub-92765923660e431daff3170fbef6471d.r2.dev/mushroom_classification_model_0.tflite",
    "https://pub-92765923660e431daff3170fbef6471d.r2.dev/mushroom_classification_model_1.tflite",
    "https://pub-92765923660e431daff3170fbef6471d.r2.dev/mushroom_classification_model_2.tflite",
    "https://pub-92765923660e431daff3170fbef6471d.r2.dev/mushroom_classification_model_3.tflite"
];

async function ensureTFLiteLoaded() {
    return new Promise((resolve, reject) => {
        let checkInterval = setInterval(() => {
            if (tflite && tflite.loadTFLiteModel) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 200);
        setTimeout(() => {
            clearInterval(checkInterval);
            reject("❌ TFLite failed to load in time.");
        }, 5000);
    });
}

async function loadModels() {
    console.log("📢 Starting model loading process...");
    try {
        await ensureTFLiteLoaded();
    } catch (error) {
        console.error(error);
        alert(error);
        return;
    }
    try {
        for (let url of modelUrls) {
            console.log(`📥 Fetching model: ${url}`);
            let model = await tflite.loadTFLiteModel(url);
            console.log(`✅ Model loaded: ${url}`, model);
            if (!model || typeof model.predict !== "function") {
                console.error(`❌ Model at ${url} is not valid.`);
                alert(`❌ Model at ${url} failed to load.`);
                return;
            }
            models.push(model);
        }
        modelsLoaded = true;
        console.log("✅ All models loaded successfully!");
    } catch (error) {
        console.error("❌ Error loading models:", error);
        alert("❌ Failed to load models. Check CORS, network, and file integrity.");
    }
}

loadModels();

// ========== IMAGE PREPROCESSING ==========
function preprocessImage(image) {
    return tf.browser.fromPixels(image)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .expandDims();
}

// ========== PREDICTION ==========
async function predict(image) {
    if (!modelsLoaded) {
        alert("⏳ Please wait... Models are still loading.");
        return;
    }
    if (Object.keys(CLASS_NAMES).length === 0) {
        alert("⏳ Please wait... Class names are still loading.");
        return;
    }
    let tensor = preprocessImage(image);
    let allPredictions = [];
    for (let model of models) {
        let outputTensor = await model.predict(tensor);
        let predictions = await outputTensor.data();
        allPredictions.push(predictions);
    }
    let combinedPredictions = {};
    let totalScores = 0;
    allPredictions.forEach((predictions) => {
        predictions.forEach((prob, classIndex) => {
            combinedPredictions[classIndex] = (combinedPredictions[classIndex] || 0) + prob;
            totalScores += prob;
        });
    });
    Object.keys(combinedPredictions).forEach((key) => {
        combinedPredictions[key] /= totalScores;
    });
    let sortedPredictions = Object.entries(combinedPredictions).sort((a, b) => b[1] - a[1]);
    displayResults(sortedPredictions);
}

// ========== DISPLAY RESULTS ==========
function displayResults(predictions) {
    let resultDiv = document.getElementById('result');
    resultDiv.innerHTML = "";
    let classIndex = predictions[0][0];
    let prob = predictions[0][1].toFixed(2);
    let className = CLASS_NAMES[classIndex] || `Unknown Class ${classIndex}`;
    let p = document.createElement("p");
    p.innerText = `🍄 ${className} (Confidence: ${prob})`;
    resultDiv.appendChild(p);
}
