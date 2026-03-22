function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER INICIADO");

  let currentVersion = null;
  let checking = false;

  /* =====================================================
     HELPERS
  ===================================================== */

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

  /* =====================================================
     CONFIRMAR CON WORKER
     (evita reload antes de que KV esté actualizado)
  ===================================================== */

  async function confirmarConWorker(nuevaVersion){

    console.log("⏳ [VC] Confirmando con worker...");

    try {

      const res = await fetch(config.workerUrl + "/status", {
        cache: "no-store"
      });

      const data = await res.json();

      console.log("🛰️ [VC] Worker version:", data.version);

      if(data.version === nuevaVersion){

        console.log("✅ [VC] Worker sincronizado");

        if(config.autoReload){

          console.log("♻️ Soft refresh (sin reload)");

          // 🔥 PRIORIDAD: refrescar engine sin recargar
          if(window.initLaunchEngine){

            console.log("🧨 Forzando fetch sin cache");

            LaunchCore.forceFresh = true;

            window.initLaunchEngine(true);

          } else {
            location.href = buildUrl();
          }

        }

      } else {
        console.log("⌛ [VC] Worker aún no listo");
      }

    } catch(e){
      console.warn("❌ [VC] Error worker", e);
    }

  }

  /* =====================================================
     CHECK PRINCIPAL
  ===================================================== */

  async function check(){

    if(checking){
      console.log("⛔ VC busy");
      return;
    }

    checking = true;

    try {

      console.log("🔍 [VC] Check...");

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaVersion = data.version;

      const savedVersion = localStorage.getItem("lc_version");

      console.log("📦 Local:", savedVersion);
      console.log("🌐 GitHub:", nuevaVersion);

      /* =====================================================
         PRIMERA EJECUCIÓN
      ===================================================== */
      if(!currentVersion){

        currentVersion = nuevaVersion;
        localStorage.setItem("lc_version", nuevaVersion);

        // 🔥 usuario volvió con versión vieja
        if(savedVersion && savedVersion !== nuevaVersion){

          console.log("🧟 Usuario con versión vieja → actualizar");

          LaunchCore.scheduler.programar(
            "vc-confirm",
            ()=> confirmarConWorker(nuevaVersion),
            config.confirmDelay
          );

        }

        return;
      }

      /* =====================================================
         NUEVA VERSIÓN DETECTADA
      ===================================================== */
      if(currentVersion !== nuevaVersion){

        console.log("🆕 Nueva versión detectada");

        LaunchCore.scheduler.programar(
          "vc-confirm",
          ()=> confirmarConWorker(nuevaVersion),
          config.confirmDelay
        );

      }

      currentVersion = nuevaVersion;
      localStorage.setItem("lc_version", nuevaVersion);

    } catch(e){
      console.warn("❌ [VC] Error check", e);
    } finally {
      checking = false;
    }

  }

  /* =====================================================
     INIT
  ===================================================== */

  function init(){

    console.log("🚀 [VC] INIT");

    // 🔥 visibility inteligente
    LaunchCore.visibility.init(check, config.checkInterval);

    // 🔥 primer check inmediato
    check();

    // 🔥 loop constante (backup del visibility)
    LaunchCore.scheduler.programar(
      "vc-check-loop",
      function loop(){
        check();
        LaunchCore.scheduler.programar(
          "vc-check-loop",
          loop,
          config.checkInterval
        );
      },
      config.checkInterval
    );

  }

  init();
}

window.initVersionChecker = initVersionChecker;