export function initVersionChecker(config) {

  let currentVersion = null;

  function eventoActivo() {
    const ahora = Date.now();
    return ahora >= config.aperturaEvento && ahora <= config.cierreEvento;
  }

  async function check() {

    // 🔥 SOLO SI NO HAY EVENTO
    if (eventoActivo()) return;

    try {

      const res = await fetch(config.versionUrl, {
        cache: "no-cache"
      });

      const data = await res.json();

      if (currentVersion && currentVersion !== data.version) {

        if (config.autoReload) {
          location.reload();
        } else {
          console.log("Nueva versión disponible");
        }

      }

      currentVersion = data.version;

    } catch (e) {
      console.warn("Error version check", e);
    }
  }

  // intervalo
  setInterval(check, config.checkInterval);

  // cuando vuelve a la pestaña
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      check();
    }
  });
}