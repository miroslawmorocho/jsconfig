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
     🔥 CONFIRMAR CON WORKER (DATA)
  ===================================================== */

  async function confirmarConWorker(nuevaDataVersion){

    console.log("⏳ [VC] Confirmando con worker...");

    try {

      LaunchCore.forceFresh = true;

      const data = await LaunchCore.fetchWorker("/status");

      console.log("🛰️ [VC] Worker version:", data?.version);

      if(data?.version === nuevaDataVersion){

        console.log("✅ [VC] Worker sincronizado");

        if(config.autoReload){

          console.log("♻️ Refresh DATA (sin cache)");

          LaunchCore.forceFresh = true;

          const freshData = await LaunchCore.fetchWorker("");

          if(window.initLaunchEngine){
            window.initLaunchEngine(true, freshData);
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
     🔥 CHECK DATA VERSION
  ===================================================== */

  async function checkDataVersion(){

    console.log("🔍 [VC] Checking DATA version...");

    const res = await fetch(config.versionUrl, {
      cache: "no-store"
    });

    const data = await res.json();
    const nuevaDataVersion = data.version;

    const savedDataVersion = localStorage.getItem("lc_data_version");

    console.log("📦 Data Local:", savedDataVersion);
    console.log("🌐 Data GitHub:", nuevaDataVersion);

    // 🔥 PRIMERA VEZ
    if(!currentDataVersion){

      currentDataVersion = nuevaDataVersion;
      localStorage.setItem("lc_data_version", nuevaDataVersion);

      if(savedDataVersion && savedDataVersion !== nuevaDataVersion){

        console.log("🧟 Usuario volvió → refrescar DATA");

        confirmarConWorker(nuevaDataVersion);
      }

      return;
    }

    // 🔥 CAMBIO DETECTADO
    if(currentDataVersion !== nuevaDataVersion){

      console.log("🆕 Nueva DATA detectada");

      pendingDataVersion = nuevaDataVersion;

      LaunchCore.scheduler.programar(
        "vc-confirm",
        ()=> {
          confirmarConWorker(pendingDataVersion);
        },
        config.confirmDelay
      );

    }

    currentDataVersion = nuevaDataVersion;
    localStorage.setItem("lc_data_version", nuevaDataVersion);
  }

  /* =====================================================
     🔥 CHECK CODE VERSION
  ===================================================== */

  async function checkCodeVersion(){

    console.log("🧠 [VC] Checking CODE version...");

    const res = await fetch(config.codeVersionUrl, {
      cache: "no-store"
    });

    const data = await res.json();
    const nuevaCodeVersion = data.commit;

    const savedCodeVersion = localStorage.getItem("lc_code_version");

    console.log("💾 Code Local:", savedCodeVersion);
    console.log("🌐 Code GitHub:", nuevaCodeVersion);

    // 🔥 PRIMERA VEZ
    if(!currentCodeVersion){

      currentCodeVersion = nuevaCodeVersion;
      localStorage.setItem("lc_code_version", nuevaCodeVersion);

      if(savedCodeVersion && savedCodeVersion !== nuevaCodeVersion){

        console.log("💥 Código actualizado → HARD RELOAD");

        location.href = buildUrl();
      }

      return;
    }

    // 🔥 CAMBIO DETECTADO
    if(currentCodeVersion !== nuevaCodeVersion){

      console.log("💥 Nuevo deploy detectado → HARD RELOAD");

      localStorage.setItem("lc_code_version", nuevaCodeVersion);

      location.href = buildUrl();
      return;
    }

    currentCodeVersion = nuevaCodeVersion;
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

      await checkCodeVersion();   // 🔥 PRIORIDAD 1
      await checkDataVersion();   // 🔥 PRIORIDAD 2

    } catch(e){
      console.warn("❌ [VC] Error check", e);
    } finally {
      checking = false;
    }

  }

  window.initVersionCheckerCheck = check;

  /* =====================================================
     INIT
  ===================================================== */

  function init(){

    console.log("🚀 [VC] INIT");

    LaunchCore.visibility.init(check, config.checkInterval);

    check();

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