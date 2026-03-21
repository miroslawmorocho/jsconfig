function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER FILE CARGADO");

  let currentVersion = null;
  let visibilityInitialized = false;

  function fechaHumana(){
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");

    return (
      d.getFullYear() +
      pad(d.getMonth()+1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes())
    );
  }

  function buildUrl(){
    return location.origin + location.pathname + "?v=" + fechaHumana();
  }

  async function confirmarConWorker(nuevaVersion){

    console.log("⏳ [VC] Confirmando con worker...");

    try {

      const res = await fetch(config.workerUrl + "/status", {
        cache: "no-store"
      });

      const data = await res.json();

      console.log("🛰️ [VC] Worker version:", data.version);

      if(data.version === nuevaVersion){

        console.log("✅ [VC] Worker OK → reload");

        if(config.autoReload){
          location.href = buildUrl();
        }

      } else {
        console.log("⌛ [VC] Worker aún no sincronizado");
      }

    } catch(e){
      console.warn("❌ [VC] Error worker", e);
    }
  }

  let checking = false;

  async function check(){

    console.log("🔍 [VC] Check...");

    if(checking){
      console.log("⛔ VC busy");
      return;
    }

    checking = true;

    try {

      // 🔥 GITHUB PRIMERO
      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaVersion = data.version;

      const savedVersion = localStorage.getItem("lc_version");

      console.log("📦 Local:", savedVersion);
      console.log("🌐 GitHub:", nuevaVersion);

      if(!currentVersion){

        currentVersion = nuevaVersion;
        localStorage.setItem("lc_version", nuevaVersion);

        if(savedVersion && savedVersion !== nuevaVersion){

          console.log("🧟 Usuario volvió → versión vieja");

          LaunchCore.scheduler.programar(
            "vc-confirm",
            ()=> confirmarConWorker(nuevaVersion),
            config.confirmDelay
          );

        }

        LaunchCore.scheduler.programar(
          "vc-check",
          check,
          config.checkInterval
        );

        return;
      }

      if(currentVersion !== nuevaVersion){

        console.log("🆕 Nueva versión detectada");
        console.log(
          `⏳ Nueva versión detectada. Confirmando en ${Math.round(config.confirmDelay / 60000)} min...`
        );

        const eta = new Date(Date.now() + config.confirmDelay);

        console.log(
          "⏳ Confirmación programada para:",
          eta.toLocaleTimeString()
        );

        LaunchCore.scheduler.programar(
          "vc-confirm",
          ()=> confirmarConWorker(nuevaVersion),
          config.confirmDelay
        );

      }

      currentVersion = nuevaVersion;
      localStorage.setItem("lc_version", nuevaVersion);

    } finally {
      checking = false;
    }

    LaunchCore.scheduler.programar(
      "vc-check",
      check,
      config.checkInterval
    );

  }

  async function init(){

    console.log("🚀 [VC] INIT");

    try {

      // 🔥 PRIMERA DECISIÓN → WORKER MANDA
      const res = await fetch(config.workerUrl + "/status", {
        cache: "no-store"
      });

      const status = await res.json();

      console.log("📡 [VC] STATUS:", status);

      if(status.eventoActivo){

        console.log("🚫 Evento ACTIVO → VC en pausa...");

        const delay = status.siguienteCambioMs || 60000;

        LaunchCore.scheduler.programar(
          "vc-init",
          init,
          delay
        );

        return;

      }

      console.log("✅ Evento CERRADO → activar version checker");

      // 🔥 SOLO visibility + primer check
      if(!visibilityInitialized){
        LaunchCore.visibility.init(check, config.checkInterval);
        visibilityInitialized = true;
      }

      check();

    } catch(e){
      console.warn("❌ [VC] Error init", e);
    }

  }

  init();
}

window.initVersionChecker = initVersionChecker;