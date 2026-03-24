function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER INICIADO");

  let currentDataVersion = null;
  let currentCodeVersion = null;
  let checking = false;
  let pendingDataVersion = null;

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
     🔥 CONFIRMAR CON WORKER (DATA REAL)
  ===================================================== */

  async function confirmarConWorker(nuevaDataVersion){

    console.log("⏳ [VC] Confirmando con worker...");

    try {

      // 🔥 forzar sin cache
      LaunchCore.forceFresh = true;

      const data = await LaunchCore.fetchWorker("/status");

      console.log("🛰️ [VC] Worker version:", data?.version);

      console.log("🔬 [VC] Compare:",
        typeof data?.version,
        data?.version,
        typeof nuevaDataVersion,
        nuevaDataVersion
      );

      // 🔥 comparación segura prueba
      if(String(data?.version) === String(nuevaDataVersion)){

        console.log("✅ [VC] Worker sincronizado");

        if(config.autoReload){

          console.log("♻️ Refresh DATA (sin cache)");

          // 🔥 traer data fresca REAL
          LaunchCore.forceFresh = true;
          const freshData = await LaunchCore.fetchWorker("");

          if(window.initLaunchEngine){
            window.initLaunchEngine(true, freshData);
          } else {
            console.warn("⚠️ initLaunchEngine no existe → fallback reload");
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
     🔥 CHECK DATA VERSION (GitHub launch-version.json)
  ===================================================== */

  async function checkDataVersion(){

    console.log("🔍 [VC] Checking DATA version...");

    try {

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();

      const nuevaDataVersion = String(data.version);
      const savedDataVersion = localStorage.getItem("lc_data_version");

      console.log("📦 Data Local:", savedDataVersion);
      console.log("🌐 Data GitHub:", nuevaDataVersion);

      /* =====================================================
         PRIMERA VEZ
      ===================================================== */

      if(!currentDataVersion){

        currentDataVersion = nuevaDataVersion;
        localStorage.setItem("lc_data_version", nuevaDataVersion);

        if(savedDataVersion && savedDataVersion !== nuevaDataVersion){

          console.log("🧟 Usuario volvió → refrescar DATA inmediata");

          confirmarConWorker(nuevaDataVersion);
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */

      if(currentDataVersion !== nuevaDataVersion){

        console.log("🆕 Nueva DATA detectada");

        pendingDataVersion = nuevaDataVersion;

        LaunchCore.scheduler.programar(
          "vc-confirm",
          () => confirmarConWorker(pendingDataVersion),
          config.confirmDelay
        );

      }

      currentDataVersion = nuevaDataVersion;
      localStorage.setItem("lc_data_version", nuevaDataVersion);

    } catch(e){
      console.warn("❌ [VC] Error DATA version", e);
    }

  }

  /* =====================================================
     🔥 CHECK CODE VERSION (version.json commit)
  ===================================================== */

  async function checkCodeVersion(){

    console.log("🧠 [VC] Checking CODE version...");

    try {

      const res = await fetch(config.codeVersionUrl, {
        cache: "no-store"
      });

      const data = await res.json();

      const nuevaCodeVersion = String(data.commit);
      const savedCodeVersionRaw = localStorage.getItem("lc_code_version");
      const savedCodeVersion = savedCodeVersionRaw
        ? String(savedCodeVersionRaw)
        : null;

      console.log("💾 Code Local:", savedCodeVersion);
      console.log("🌐 Code GitHub:", nuevaCodeVersion);

      console.log("🔬 CODE COMPARE:",
        nuevaCodeVersion === savedCodeVersion,
        JSON.stringify(nuevaCodeVersion),
        JSON.stringify(savedCodeVersion)
      );

      /* =====================================================
         PRIMERA VEZ
      ===================================================== */

      if(!currentCodeVersion){

        currentCodeVersion = nuevaCodeVersion;
        localStorage.setItem("lc_code_version", nuevaCodeVersion);

        if(savedCodeVersion && savedCodeVersion !== nuevaCodeVersion){

          console.log("💥 Código actualizado → HARD RELOAD");

          location.href = buildUrl();
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */

      if(currentCodeVersion !== nuevaCodeVersion){

        console.log("💥 Nuevo deploy detectado → HARD RELOAD");

        localStorage.setItem("lc_code_version", nuevaCodeVersion);

        location.href = buildUrl();
        return;
      }

      currentCodeVersion = nuevaCodeVersion;

    } catch(e){
      console.warn("❌ [VC] Error CODE version", e);
    }

  }

  /* =====================================================
     🔥 CHECK GENERAL
  ===================================================== */

  async function check(){

    if(checking){
      console.log("⛔ VC busy");
      return;
    }

    checking = true;

    try {

      // 🔥 ORDEN CRÍTICO
      await checkCodeVersion();   // HARD reload si cambia
      await checkDataVersion();   // soft refresh si cambia

    } catch(e){
      console.warn("❌ [VC] Error check", e);
    } finally {
      checking = false;
    }

  }

  // 🔥 EXPUESTO para visibility / pageshow
  window.initVersionCheckerCheck = check;

  /* =====================================================
     INIT
  ===================================================== */

  function init(){

    console.log("🚀 [VC] INIT");

    // 🔥 cuando usuario vuelve a la pestaña
    LaunchCore.visibility.init(check, config.checkInterval);

    // 🔥 primer check inmediato
    check();

    // 🔥 loop constante (backup)
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

// 🔥 global
window.initVersionChecker = initVersionChecker;