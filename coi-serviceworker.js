/*! coi-serviceworker v0.1.6 - Custom JARVIS Implementation */
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error("JARVIS Core Fetch Error:", e))
        );
    });
} else {
    (() => {
        const scriptEl = document.currentScript;
        if (scriptEl) {
            navigator.serviceWorker.register(scriptEl.src).then(
                (registration) => {
                    registration.addEventListener("updatefound", () => {
                        console.log("JARVIS Security Matrix Loading... Reloading interface.");
                        window.location.reload();
                    });
                    if (registration.active && !navigator.crossOriginIsolated) {
                        console.log("JARVIS Security Matrix Activated. Reloading interface.");
                        window.location.reload();
                    }
                },
                (err) => console.error("JARVIS Security Matrix Failed to boot:", err)
            );
        }
    })();
}
