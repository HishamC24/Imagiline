let deferredPrompt;
const installBtn = document.getElementById("install-btn");

// Detect if app is already installed (PWA mode)
const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

if (!isStandalone) {
    installBtn.style.display = "none"; // start hidden

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = "block";
    });

    installBtn.addEventListener("click", async () => {
        installBtn.style.display = "none";

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const outcome = await deferredPrompt.userChoice;
            console.log("Install choice:", outcome);
            deferredPrompt = null;
        }
    });
} else {
    installBtn.style.display = "none";
}

// Register service worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then(() => console.log("Service worker registered"))
            .catch((err) => console.error("Service worker error:", err));
    });
}
