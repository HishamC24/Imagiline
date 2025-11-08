
// =========================
// ===== PWA INSTALL =======
// =========================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}

let deferredPrompt = null;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = "";
});

installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installBtn.style.display = "none";
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
    installBtn.style.display = "none";
});


// =========================
// ===== IMAGE UPLOAD =======
// =========================
const popupFileLabel = document.getElementById("popupFileLabel");
const imagePreview = document.getElementById("image-preview");
const fileInput = document.getElementById("fileInput");

popupFileLabel.addEventListener("click", (e) => {
    if (!(video.src && video.style.display !== "none")) {
        fileInput.value = "";
    }
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
        showImageFile(file, true); // Show and save image to preview
    } else {
        showImageFile(null, false); // Clear preview if not an image
    }
});

function showImageFile(file, alsoSave = true) {
    if (!file) {
        imagePreview.style.display = "none";
        imagePreview.src = "";
        localStorage.removeItem("persistedImageData");
        return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
        imagePreview.src = event.target.result;
        imagePreview.style.display = "block";
        if (alsoSave) {
            try {
                localStorage.setItem("persistedImageData", event.target.result);
            } catch (e) {
            }
        }
    };
    reader.readAsDataURL(file);
}

(function restoreImageFromCache() {
    const cachedImage = localStorage.getItem("persistedImageData");
    if (cachedImage) {
        imagePreview.src = cachedImage;
        // imagePreview.style.display = "block";
    } else {
        // imagePreview.style.display = "none";
        imagePreview.src = "";
    }
})();




if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
    window.launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
            const imageFile = launchParams.files.find(f =>
                f.type.startsWith("image/")
            );
            if (imageFile) {
                showImageFile(imageFile, true);
            }
        }
    });
} else if (navigator.canShare && navigator.canShare({ files: [new File([], '')] })) {
    navigator.share = navigator.share || function () { };
}


// =========================
// ==== LIVE CAMERA FEED ====
// =========================
const liveFeedVideo = document.getElementById("live-feed");
const rotateCameraBtn = document.getElementById("rotateCameraBtn");

navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        liveFeedVideo.srcObject = stream;
    })
    .catch((error) => {
        console.error("Error accessing the camera: ", error);
    });


rotateCameraBtn.addEventListener("click", () => {
    console.log("Rotating camera");
    // Implements flipping/rotating through available cameras (devices)
    // We'll keep track of the active camera's deviceId and switch on each click
    (async function () {
        if (!window.availableVideoDevices) {
            // Query all video input devices once
            const devices = await navigator.mediaDevices.enumerateDevices();
            window.availableVideoDevices = devices.filter(device => device.kind === "videoinput");
            window.currentVideoDeviceIndex = 0;
        }

        // No camera devices
        if (window.availableVideoDevices.length < 1) return;

        // Move to next camera index
        window.currentVideoDeviceIndex = (window.currentVideoDeviceIndex + 1) % window.availableVideoDevices.length;
        const nextDeviceId = window.availableVideoDevices[window.currentVideoDeviceIndex].deviceId;

        // Stop any running video streams before switching
        if (liveFeedVideo.srcObject) {
            liveFeedVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        // Try to get stream from the next camera
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: nextDeviceId } } });
            liveFeedVideo.srcObject = newStream;
        } catch (e) {
            console.error("Failed to switch camera:", e);
        }
    })();
});