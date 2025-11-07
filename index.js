
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
const imageUploadInput = document.getElementById("image-upload");
const imagePreview = document.getElementById("image-preview");

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
        imagePreview.style.display = "block";
    } else {
        imagePreview.style.display = "none";
        imagePreview.src = "";
    }
})();

if (imageUploadInput) {
    imageUploadInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        showImageFile(file, true);
    });
}

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
const liveFeed = document.getElementById("live-feed");
const video = document.getElementById("camera-video");
const startBtn = document.getElementById("start-camera");

startBtn.addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        startBtn.style.display = "none";

        const ctx = liveFeed.getContext("2d");

        function drawFrame() {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                liveFeed.width = video.videoWidth;
                liveFeed.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, liveFeed.width, liveFeed.height);
            }
            requestAnimationFrame(drawFrame);
        }
        drawFrame();
    } catch (err) {
        alert("Camera permission denied or not available.");
        console.error(err);
    }
});