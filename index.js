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

navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        cameraPreview.srcObject = stream;
    })
    .catch((error) => {
        console.error("Error accessing the camera: ", error);
    });

// Keep track of available cameras and the current camera index
let availableVideoDevices = [];
let currentVideoDeviceIndex = 0;

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

async function switchToCamera(deviceId) {
    if (cameraPreview.srcObject) {
        cameraPreview.srcObject.getTracks().forEach(track => track.stop());
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        cameraPreview.srcObject = stream;
    } catch (e) {
        console.error("Failed to switch camera:", e);
    }
}

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
    // This stretches the video to cover the screen (useful for background effects)
    ctxBlur.drawImage(cameraPreview, 0, 0, canvasBlur.width, canvasBlur.height);

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