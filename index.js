function updateOrientation() {
    let orientation = 0;
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
        orientation = window.screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
        orientation = window.orientation;
    } else {
        if (window.innerWidth > window.innerHeight) {
            orientation = 90;
        } else {
            orientation = 0;
        }
    }

    let val;
    if (orientation === 180 || orientation === -180) {
        val = "180";
    } else {
        let portrait = window.innerHeight >= window.innerWidth;
        if (portrait) {
            val = "0";
        } else {
            if (orientation === 90 || orientation === -270) {
                val = "-90";
            } else if (orientation === -90 || orientation === 270) {
                val = "90";
            } else {
                val = "-90";
            }
        }
    }
    document.getElementById("controls").setAttribute("orientation", val);
}

// Overlay/opacity globals
const overlayIds = ["overlayInvisible", "overlayVisible"];
const opacities = [0, 0.25, 0.5, 0.75];
window._imageOpacityControls = {
    opacities,
    currentOpacityIndex: 2 // Start at 0.5 (50%)
};

// Helper: Check if an image has been uploaded to imagePreview
function isImageUploaded() {
    const imagePreview = document.getElementById("imagePreview");
    return !!(imagePreview && imagePreview.src && imagePreview.src.length > 0 && !imagePreview.src.startsWith('blob:null')); // blob:null covers some browsers' reset state
}

// Set image opacity based on global currentOpacityIndex
function updateImageOpacity() {
    const imagePreview = document.getElementById("imagePreview");
    if (imagePreview) {
        imagePreview.style.opacity = opacities[window._imageOpacityControls.currentOpacityIndex];
    }
}

// Overhauled overlay visibility per instructions
function updateOverlayVisibility() {
    const overlayInvisible = document.getElementById("overlayInvisible");
    const overlayVisible = document.getElementById("overlayVisible");
    // If there's no image uploaded at all, ONLY show overlayInvisible
    if (!isImageUploaded()) {
        overlayInvisible.classList.remove("removed");
        overlayVisible.classList.add("removed");
        return;
    }
    // Otherwise, standard toggle based on opacity
    const opacities = window._imageOpacityControls.opacities;
    const currentOpacityIndex = window._imageOpacityControls.currentOpacityIndex;
    const currentOpacity = opacities[currentOpacityIndex];
    const val = currentOpacity;
    if (val === 0) {
        overlayInvisible.classList.remove("removed");
        overlayVisible.classList.add("removed");
    } else {
        overlayInvisible.classList.add("removed");
        overlayVisible.classList.remove("removed");
    }
}

// Setup overlay click cycling, respecting image existence
(function () {
    // Try to init from actual img style if available, but default to 50%
    const imagePreview = document.getElementById("imagePreview");
    const styleOpacity = parseFloat(window.getComputedStyle(imagePreview).opacity);
    const foundIdx = opacities.indexOf(styleOpacity);
    if (foundIdx !== -1) {
        window._imageOpacityControls.currentOpacityIndex = foundIdx;
    } else {
        window._imageOpacityControls.currentOpacityIndex = 2;
    }

    overlayIds.forEach((id) => {
        const overlay = document.getElementById(id);
        overlay.addEventListener("click", function (e) {
            // Don't cycle if there's no image uploaded - overlays are locked here
            if (!isImageUploaded()) return;
            window._imageOpacityControls.currentOpacityIndex = (window._imageOpacityControls.currentOpacityIndex + 1) % opacities.length;
            updateImageOpacity();
            updateOverlayVisibility();
        });
    });

    updateImageOpacity();
})();

// Run overlay/init setup
updateOverlayVisibility();
updateOrientation();
window.addEventListener('orientationchange', updateOrientation);
window.addEventListener('resize', updateOrientation);

const cameraPreview = document.getElementById("cameraPreview");

// =========================
// ==== IMAGE CAPTURE SETUP ====
// =========================
let imageCapture = null;

function setupImageCaptureFromStream(stream) {
    const track = stream.getVideoTracks?.()[0];
    if (!track) {
        imageCapture = null;
        return;
    }

    if ("ImageCapture" in window) {
        try {
            imageCapture = new ImageCapture(track);
        } catch (e) {
            console.warn("ImageCapture failed, falling back to canvas", e);
            imageCapture = null;
        }
    } else {
        imageCapture = null;
    }
}

// ======== CAMERA FLIP SUPPORT ========
let availableVideoDevices = [];
let currentVideoDeviceIndex = 0;
let isFrontCamera = false;

// Try to detect if a device is front camera based on its label.
// This is heuristic as getUserMedia constraints aren't always respected across browsers.
function detectIfFrontCamera(device) {
    if (!device || !device.label) return false;
    // Common cues in Android/iOS/PC, not perfect but standard
    // Also include "user" for web standard, though not always presented
    const label = device.label.toLowerCase();
    if (
        label.includes("front") ||
        label.includes("user") ||
        label.includes("facing") && !label.includes("back") && !label.includes("rear")
    ) {
        return true;
    }
    return false;
}

// To control camera flipping visually
function setCameraMirroring(frontCamera) {
    // Flip <video> via CSS transform (mirrors live preview for user)
    cameraPreview.style.transform = frontCamera ? 'scaleX(-1)' : '';
    // Optionally make canvas replication (blur background) match
    window._blurCanvasMirrored = !!frontCamera;
}

// Create and append the gridlines canvas (overlay for grid lines)
let gridLinesVisible = false;
const gridCanvas = document.createElement('canvas');
gridCanvas.id = "gridLinesOverlay";
Object.assign(gridCanvas.style, {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 2000,
    display: "none"
});
cameraPreview.parentNode.appendChild(gridCanvas);

function resizeGridCanvas() {
    gridCanvas.width = cameraPreview.clientWidth;
    gridCanvas.height = cameraPreview.clientHeight;
    gridCanvas.style.width = cameraPreview.clientWidth + "px";
    gridCanvas.style.height = cameraPreview.clientHeight + "px";
    if (gridLinesVisible) drawGridLines();
}

window.addEventListener("resize", resizeGridCanvas);

// Rule of thirds grid drawing
function drawGridLines() {
    const ctx = gridCanvas.getContext("2d");
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    ctx.save();
    ctx.strokeStyle = "rgba(256,256,256,0.75)";
    ctx.lineWidth = 2;

    const w = gridCanvas.width;
    const h = gridCanvas.height;

    // 2 verticals at 1/3 and 2/3
    for (let i = 1; i <= 2; i++) {
        const x = (w / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // 2 horizontals at 1/3 and 2/3
    for (let i = 1; i <= 2; i++) {
        const y = (h / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    ctx.restore();
}

function toggleGridLines() {
    gridLinesVisible = !gridLinesVisible;
    if (gridLinesVisible) {
        resizeGridCanvas();
        gridCanvas.style.display = "block";
        drawGridLines();
    } else {
        gridCanvas.style.display = "none";
    }
}

// Listen for the gridLinesToggle SVG click
document.getElementById("gridLinesToggle").addEventListener("click", toggleGridLines);

// On resize, redraw grid lines if enabled
window.addEventListener("resize", function () {
    if (gridLinesVisible) resizeGridCanvas();
});

// When preview video changes size (if responsive), keep grid overlay in sync
const cameraPreviewResizeObserver = new ResizeObserver(() => {
    if (gridLinesVisible) resizeGridCanvas();
});
cameraPreviewResizeObserver.observe(cameraPreview);

// =========================

// Toast function
function showToast(message) {
    let toast = document.getElementById("camera-toast");
    if (toast) toast.remove();

    toast = document.createElement("div");
    toast.id = "camera-toast";
    toast.textContent = message;
    Object.assign(toast.style, {
        position: "fixed",
        left: "50%",
        bottom: "1rem",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.25)",
        color: "#ffffff",
        height: "48px",
        // minWidth: "180px",
        borderRadius: "24px",
        zIndex: 10000,
        opacity: "0",
        transition: "opacity 0.25s",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0px 16px",
        fontFamily: "\"San Fransisco\", sans-serif"
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "1";
    }, 10);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 200);
    }, 3000);
}

async function getAvailableVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === "videoinput");
}

// Improved getUserMedia to set camera flipping
async function switchToCamera(deviceId) {
    if (cameraPreview.srcObject) {
        cameraPreview.srcObject.getTracks().forEach(track => track.stop());
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        cameraPreview.srcObject = stream;
        setupImageCaptureFromStream(stream);


        // After switching camera, set isFrontCamera flag
        // Find the device in our list
        let matchingDevice = null;
        for (const device of availableVideoDevices) {
            if (device.deviceId === deviceId) {
                matchingDevice = device;
                break;
            }
        }
        isFrontCamera = detectIfFrontCamera(matchingDevice);

        setCameraMirroring(isFrontCamera);
    } catch (e) {
        console.error("Failed to switch camera:", e);
    }
}

// Initial load: find and select default camera
(async function initializeCamera() {
    availableVideoDevices = await getAvailableVideoDevices();
    // Heuristics: try to find a front camera first
    let preferredIdx = 0;
    for (let i = 0; i < availableVideoDevices.length; ++i) {
        if (detectIfFrontCamera(availableVideoDevices[i])) {
            preferredIdx = i;
            break;
        }
    }
    currentVideoDeviceIndex = preferredIdx;
    const device = availableVideoDevices[currentVideoDeviceIndex];
    if (device) {
        isFrontCamera = detectIfFrontCamera(device);
        setCameraMirroring(isFrontCamera);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: device.deviceId } } });
            cameraPreview.srcObject = stream;
            setupImageCaptureFromStream(stream);

        } catch (error) {
            // fallback: try default
            navigator.mediaDevices.getUserMedia({ video: true })
                .then((stream) => {
                    cameraPreview.srcObject = stream;
                    setupImageCaptureFromStream(stream);

                })
                .catch((error) => {
                    console.error("Error accessing the camera: ", error);
                });
        }
    } else {
        // fallback: try default
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                cameraPreview.srcObject = stream;
                setupImageCaptureFromStream(stream);

            })
            .catch((error) => {
                console.error("Error accessing the camera: ", error);
            });
    }
})();

document.getElementById("rotateCamera").addEventListener("click", async () => {
    if (!availableVideoDevices.length) {
        availableVideoDevices = await getAvailableVideoDevices();
    }
    if (availableVideoDevices.length < 2) {
        console.log("no other cameras");
        return;
    }
    currentVideoDeviceIndex = (currentVideoDeviceIndex + 1) % availableVideoDevices.length;
    const nextDevice = availableVideoDevices[currentVideoDeviceIndex];
    showToast(nextDevice.label || "Unknown Camera");
    await switchToCamera(nextDevice.deviceId);
    setCameraMirroring(detectIfFrontCamera(nextDevice));
});

document.getElementById("imageUpload").addEventListener("click", async () => {
    // Create a hidden file input if not already present
    let fileInput = document.getElementById("hiddenImageFileInput");
    if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.id = "hiddenImageFileInput";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);
    }

    // When a file is selected, set imagePreview.src to the file's data URL
    fileInput.onchange = function (e) {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                // Set image for preview
                document.getElementById("imagePreview").src = evt.target.result;
                // Set opacity index to 50% always on upload
                window._imageOpacityControls.currentOpacityIndex = 2;
                updateImageOpacity();
                updateOverlayVisibility();
            };
            reader.readAsDataURL(file);
        } else {
            // Still update overlay in case of cancel
            updateOverlayVisibility();
        }
        // Reset input so selecting the same file again works
        fileInput.value = "";
    };

    fileInput.click();
});

// =========================
// ==== CANVAS REPLICATION ==
// =========================
const canvasBlur = document.getElementById("video-blur");
const ctxBlur = canvasBlur.getContext("2d");

// 1. Ensure the canvas internal resolution matches the display size
function resizeCanvas() {
    canvasBlur.width = window.innerWidth;
    canvasBlur.height = window.innerHeight;
}

// Listen for window resize to update canvas dimensions
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Initial call

// 2. The Render Loop
function renderCanvas() {
    // Stop drawing if video isn't running
    if (cameraPreview.paused || cameraPreview.ended) return;

    // Draw the video frame to fill the entire canvas
    // If this is a front camera, flip horizontally
    if (window._blurCanvasMirrored) {
        ctxBlur.save();
        ctxBlur.translate(canvasBlur.width, 0);
        ctxBlur.scale(-1, 1);
        ctxBlur.drawImage(cameraPreview, 0, 0, canvasBlur.width, canvasBlur.height);
        ctxBlur.restore();
    } else {
        ctxBlur.drawImage(cameraPreview, 0, 0, canvasBlur.width, canvasBlur.height);
    }

    // Schedule the next frame
    requestAnimationFrame(renderCanvas);
}

// 3. Start the loop when the video begins playing
cameraPreview.addEventListener("play", () => {
    renderCanvas();
});

// 4. Fallback: If video is already playing (autoplay), start immediately
if (!cameraPreview.paused && !cameraPreview.ended) {
    renderCanvas();
}

// =========================
// ==== SHUTTER FULL QUALITY (SENSOR RES) ====
// =========================
document.getElementById("shutter")?.addEventListener("click", async function () {
    // 1️⃣ Try true full-resolution capture first
    if (imageCapture && imageCapture.takePhoto) {
        try {
            const blob = await imageCapture.takePhoto();

            saveCapturedBlob(blob);
            return;
        } catch (e) {
            console.warn("takePhoto failed, falling back to canvas", e);
        }
    }

    // 2️⃣ Fallback: canvas capture (Safari / older browsers)
    fallbackCanvasCapture();
});

function saveCapturedBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getDateTimeFilename();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function fallbackCanvasCapture() {
    const video = cameraPreview;

    let width = video.videoWidth || video.clientWidth;
    let height = video.videoHeight || video.clientHeight;

    if (!width || !height) {
        showToast("Camera not ready");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (window._blurCanvasMirrored) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();
    } else {
        ctx.drawImage(video, 0, 0, width, height);
    }

    canvas.toBlob(
        (blob) => blob && saveCapturedBlob(blob),
        "image/jpeg",
        1.0
    );
}

function getDateTimeFilename() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    return `Photo_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.jpg`;
}
