// =========================
// ===== IMAGE UPLOAD/REMOVE =======
// =========================
const popupFileLabel = document.getElementById("popupFileLabel");
const imagePreview = document.getElementById("image-preview");
const fileInput = document.getElementById("fileInput");
const removeImageBtn = document.getElementById("removeImage");

popupFileLabel.addEventListener("click", (e) => {
    fileInput.value = "";
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
        if (!imagePreview.src) {
            if (imagePreview.style.display === "none") {
                imagePreview.style.display = "";
            }
            if (imagePreview.getAttribute("style") && imagePreview.getAttribute("style").trim() === "display: none") {
                imagePreview.removeAttribute("style");
            }
        }
        showImageFile(file, true);
    } else {
        showImageFile(null, false);
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
        imagePreview.style.display = "block";
    } else {
        imagePreview.src = "";
        imagePreview.style.display = "none";
    }
})();

if (removeImageBtn) {
    removeImageBtn.addEventListener("click", () => {
        imagePreview.src = "";
        imagePreview.style.display = "none";
        localStorage.removeItem("persistedImageData");
        fileInput.value = "";
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
const liveFeedVideo = document.getElementById("live-feed");
const rotateCameraBtn = document.getElementById("rotateCameraBtn");

navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        liveFeedVideo.srcObject = stream;
    })
    .catch((error) => {
        console.error("Error accessing the camera: ", error);
    });

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
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        fontSize: "1rem",
        fontWeight: "bold",
        padding: "1rem 1.5rem",
        borderRadius: "1.5rem",
        zIndex: 10000,
        opacity: "0",
        transition: "opacity 0.2s",
        pointerEvents: "none",
        textAlign: "center"
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

rotateCameraBtn.addEventListener("click", () => {
    console.log("Rotating camera");
    (async function () {
        if (!window.availableVideoDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            window.availableVideoDevices = devices.filter(device => device.kind === "videoinput");
            window.currentVideoDeviceIndex = 0;
        }

        if (window.availableVideoDevices.length < 1) return;

        window.currentVideoDeviceIndex = (window.currentVideoDeviceIndex + 1) % window.availableVideoDevices.length;
        const nextDevice = window.availableVideoDevices[window.currentVideoDeviceIndex];
        const nextDeviceId = nextDevice.deviceId;

        showToast(nextDevice.label || "Unknown Camera");

        if (liveFeedVideo.srcObject) {
            liveFeedVideo.srcObject.getTracks().forEach(track => track.stop());
        }

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: nextDeviceId } } });
            liveFeedVideo.srcObject = newStream;
        } catch (e) {
            console.error("Failed to switch camera:", e);
        }
    })();
});