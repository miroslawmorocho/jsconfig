function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER INICIADO");

  let currentDataVersion = null;
  let currentCodeVersion = null; // 🔥 FALTA ESTO
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
      // 🔥 PRIMERO código estático (CRÍTICO)
      await checkCodeVersion();

      console.log("🔍 [VC] Check...");

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaDataVersion = data.version;
      const savedDataVersion = localStorage.getItem("lc_data_version");

      console.log("📦 Local:", savedDataVersion);
      console.log("🌐 Data:", nuevaDataVersion);

      /* =====================================================
         PRIMERA EJECUCIÓN
      ===================================================== */
      if(!currentDataVersion){

        currentDataVersion = nuevaDataVersion;
        localStorage.setItem("lc_data_version", nuevaDataVersion);

        // 🔥 usuario volvió con versión vieja
        if(savedDataVersion && savedDataVersion !== nuevaDataVersion){

          console.log("🧟 Usuario volvió → actualización inmediata");

          // 🔥 NO esperar delay
          confirmarConWorker(nuevaDataVersion);

          return;
        }

        return;
      }

      /* =====================================================
         NUEVA VERSIÓN DETECTADA
      ===================================================== */
      if(currentDataVersion !== nuevaDataVersion){

        console.log("🆕 Nuevos datos detectados");

        LaunchCore.scheduler.programar(
          "vc-confirm",
          ()=> confirmarConWorker(nuevaDataVersion),
          config.confirmDelay
        );

      }

      currentDataVersion = nuevaDataVersion;
      localStorage.setItem("lc_data_version", nuevaDataVersion);

    } catch(e){
      console.warn("❌ [VC] Error check", e);
    } finally {
      checking = false;
    }

  }

  // 🔥 EXPONER PARA QUE OTRAS PARTES LO PUEDAN LLAMAR
  window.initVersionCheckerCheck = check;


  /* =====================================================
     CHEQUEAR LA VERSIÓN DEL CÓDIGO ESTÁTICO EN GITHUB
                  (css js html etc.)
  ===================================================== */
  async function checkCodeVersion(){

    try {

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

        // 🔥 usuario volvió con código viejo
        if(savedCodeVersion && savedCodeVersion !== nuevaCodeVersion){

          console.log("💥 Código actualizado → HARD RELOAD");

          location.href = buildUrl(); // 🔥 F5 REAL
        }

        return;
      }

      // 🔥 CAMBIO DETECTADO
      if(currentCodeVersion !== nuevaCodeVersion){

        console.log("💥 Nuevo Github deploy detectado → HARD RELOAD");

        localStorage.setItem("lc_code_version", nuevaCodeVersion);

        location.href = buildUrl(); // 🔥 F5 REAL
        return;
      }

      currentCodeVersion = nuevaCodeVersion;

    } catch(e){
      console.warn("❌ [VC] Error code version", e);
    }

  }

  
  /* =====================================================
     INICIAR LA FUNCIÓN
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