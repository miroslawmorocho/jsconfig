function initVersionChecker(config) {

  if (window.__vcInitialized) {
    console.log("⛔ VC ya inicializado");
    return;
  }

  window.__vcInitialized = true;

  console.log("🔥 VERSION CHECKER INICIADO");

  let currentDataVersion = null;
  let currentCodeVersion = null;
  let checking = false;
  let pendingDataVersion = null;
  let lastRenderedVersion = null;
  let confirming = false;
  const DEBUG = true; // 🔴 cámbialo a true cuando quieras debug

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
     DEBUG LOG PERSISTENTE
  ===================================================== */

  function logVC(msg, data = null){

    if(!DEBUG) return; // 🔥 si debug está apagado → no hace nada

    const log = {
      time: new Date().toISOString(),
      msg,
      data
    };

    console.log(msg, data || "");

    let logs = JSON.parse(sessionStorage.getItem("vc_logs") || "[]");
    logs.push(log);

    sessionStorage.setItem("vc_logs", JSON.stringify(logs));
  }

  function renderDebugPanel(){

    if(document.getElementById("vc-debug")) return;

    const div = document.createElement("div");

    div.id = "vc-debug";
    div.style = `
      position:fixed;
      bottom:0;
      left:0;
      width:100%;
      max-height:200px;
      overflow:auto;
      background:black;
      color:#0f0;
      font-size:10px;
      z-index:9999;
      padding:5px;
    `;

    document.body.appendChild(div);

    setInterval(()=>{
      const logs = JSON.parse(sessionStorage.getItem("vc_logs") || "[]");
      div.innerHTML = logs
        .slice(-20)
        .map(l => `${l.time} → ${l.msg}`)
        .join("<br>");
    }, 1000);
  }

  /* =====================================================
      🔥 CONFIRMAR CON WORKER (DATA REAL)
  ===================================================== */

  async function confirmarConWorker(versionToConfirm){

    if(confirming){
      logVC("⛔ confirm en progreso, skip");
      return;
    }

    confirming = true;

    logVC("⏳ Confirmando con worker...", versionToConfirm);

    try {

      const data = await LaunchCore.fetchWorker("/status", true);

      logVC("🛰️ Worker version", data?.version);

      if(String(data?.version) === String(versionToConfirm)){

        // ✅ DATA REAL CONFIRMADA
        currentDataVersion = String(versionToConfirm);
        localStorage.setItem("lc_data_version", String(versionToConfirm));

        // 🔥 SOLO AQUÍ se limpia pending
        localStorage.removeItem("lc_pending_version");

        logVC("✅ Worker sincronizado");

        if(lastRenderedVersion !== String(versionToConfirm)){

          logVC("🎨 Renderizando nueva versión");

          const endpoint = LaunchCore.config.endpoint || "";
          const freshData = await LaunchCore.fetchWorker(endpoint, true);

          // 🔥 1. SINCRONIZAR ESTADO GLOBAL
          if(freshData && typeof freshData.eventoCerrado !== "undefined"){
            LaunchCore.state.eventoCerrado = freshData.eventoCerrado;
            console.log("🧠 [VC] estado actualizado:", freshData.eventoCerrado);
          }

          // 🔥 2. SINCRONIZAR TIMING REAL (SIN RESETS)
          if(freshData?.siguienteActualizacionMs){

            const existingNext = Number(localStorage.getItem("lc_next_update") || 0);

            // 👉 SOLO si no existe o ya expiró
            if(!existingNext || Date.now() >= existingNext){

              const nextTime = Date.now() + freshData.siguienteActualizacionMs;
              localStorage.setItem("lc_next_update", nextTime);

              console.log("⏰ [VC] nuevo next_update sincronizado");
            } else {
              console.log("⏰ [VC] se respeta timing existente");
            }

          }

          // 💣 3. MATAR scheduler viejo
          LaunchCore.scheduler.cancelar("bridge-main");

          // 💣 4. RESET ejecución
          currentExecution = null;
          
          // 🚀 5. RENDER LIMPIO
          if(window.initLaunchEngine){

            LaunchCore.run({
              force: true,
              externalData: freshData
            });

          } else {

            logVC("⚠️ fallback reload");
            location.reload();

          }

          lastRenderedVersion = String(versionToConfirm);

        } else {
          logVC("😴 Ya renderizado, skip");
        }

      } else {
        logVC("⌛ Worker aún no actualizado");
      }

    } catch(e){
      console.warn("❌ [VC] Error worker", e);
    }

    finally {
      confirming = false; // 🔥 CLAVE ANTI DUPLICADOS
      pendingDataVersion = null;
    }

  }

  /* =====================================================
     🔥 CHECK DATA VERSION
  ===================================================== */

  async function checkDataVersion(){

    logVC("🔍 Checking DATA...");

    try {

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaDataVersion = String(data.version);
      
      const pending = localStorage.getItem("lc_pending_version");

      if(
        currentDataVersion === nuevaDataVersion &&
        !pending
      ){
        logVC("😴 DATA sin cambios");
        return;
      }

      const savedDataVersion = localStorage.getItem("lc_data_version");

      logVC("📦 Local DATA", savedDataVersion);
      logVC("🌐 GitHub DATA", nuevaDataVersion);

      /* =====================================================
         PRIMERA VEZ
      ===================================================== */

      if(!currentDataVersion){

        // 🔥 SOLO confiar en localStorage (estado REAL confirmado)
        currentDataVersion = savedDataVersion || null;
        logVC("🧠 currentDataVersion INIT", currentDataVersion);

        // 👉 SI hay pending → retomar SIEMPRE
        const pending = localStorage.getItem("lc_pending_version");

        if(pending){
          logVC("🔥 retomando pending en primera carga", pending);
          confirmarConWorker(pending);
          return;
        }

        // 👉 SI no hay pending pero GitHub es distinto → iniciar flujo
        if(savedDataVersion !== nuevaDataVersion){

          logVC("🆕 Primera carga detecta cambio → iniciar confirmación");

          pendingDataVersion = nuevaDataVersion;
          localStorage.setItem("lc_pending_version", nuevaDataVersion);

          LaunchCore.scheduler.cancelar("vc-confirm");

          LaunchCore.timing.schedule(
            () => confirmarConWorker(nuevaDataVersion),
            config.confirmDelay,
            "vc-confirm"
          );
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */
      // 🔥 SIEMPRE reemplazar pendiente
      if(pendingDataVersion && pendingDataVersion !== nuevaDataVersion){
        logVC("♻️ Reemplazando pendiente vieja", pendingDataVersion);
      }
      pendingDataVersion = nuevaDataVersion;
      localStorage.setItem("lc_pending_version", nuevaDataVersion);

      logVC("🆕 Nueva DATA detectada", nuevaDataVersion);

      // 🔥 cancelar confirmación anterior
      LaunchCore.scheduler.cancelar("vc-confirm");

      // 🔥 programar NUEVA confirmación
      LaunchCore.timing.schedule(
        () => confirmarConWorker(nuevaDataVersion),
        config.confirmDelay,
        "vc-confirm"
      );
      
    } catch(e){
      console.warn("❌ [VC] Error DATA version", e);
    }

  }

  /* =====================================================
     🔥 CHECK CODE VERSION
  ===================================================== */

  async function checkCodeVersion(){

    logVC("🧠 Checking CODE...");

    try {

      const res = await fetch(config.codeVersionUrl, {
        cache: "no-store"
      });

      const data = await res.json();

      const nuevaCodeVersion = String(data.commit);
      const savedCodeVersion = localStorage.getItem("lc_code_version");

      logVC("💾 Local CODE", savedCodeVersion);
      logVC("🌐 GitHub CODE", nuevaCodeVersion);

      /* =====================================================
         PRIMERA VEZ
      ===================================================== */

      if(!currentCodeVersion){

        currentCodeVersion = nuevaCodeVersion;
        localStorage.setItem("lc_code_version", nuevaCodeVersion);

        if(savedCodeVersion && savedCodeVersion !== nuevaCodeVersion){
          logVC("💥 Código actualizado → reload");          
          window.location.replace(buildUrl());
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */

      if(currentCodeVersion !== nuevaCodeVersion){

        logVC("💥 Nuevo deploy → reload");

        localStorage.setItem("lc_code_version", nuevaCodeVersion);        
        window.location.replace(buildUrl());
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
      logVC("⛔ VC busy");
      return;
    }

    checking = true;

    try {

      await checkCodeVersion();   // HARD reload si cambia
      await checkDataVersion();   // soft refresh si cambia

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

    const pending = localStorage.getItem("lc_pending_version");

    if(pending){
      pendingDataVersion = pending;

      logVC("🔥 retomando confirmación pendiente (init)", pending);

      confirmarConWorker(pending);
    }

    if (DEBUG) {
      sessionStorage.removeItem("vc_logs");
      renderDebugPanel();
    } // 🔥 DEBUG VISUAL

    logVC("🚀 VC INIT");

    LaunchCore.visibility.init(check, config.checkInterval);

    check(); // primer check

    // 🔥 loop backup (cada X tiempo)
    function loop(){
      check();
      LaunchCore.timing.schedule(
        loop,
        config.checkInterval,
        "vc-check-loop"
      );
    }

    LaunchCore.timing.schedule(
      loop,
      config.checkInterval,
      "vc-check-loop"
    );

  }

  init();
}

window.initVersionChecker = initVersionChecker;