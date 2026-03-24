function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER INICIADO");

  let currentDataVersion = null;
  let currentCodeVersion = null;
  let checking = false;
  let pendingDataVersion = null;
  let lastRenderedVersion = null;

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

    logVC("⏳ Confirmando con worker...", versionToConfirm);

    try {

      const data = await LaunchCore.fetchWorker("/status", true);

      logVC("🛰️ Worker version", data?.version);

      if(String(data?.version) === String(versionToConfirm)){

        logVC("✅ Worker sincronizado");

        if(lastRenderedVersion !== String(versionToConfirm)){

          logVC("🎨 Renderizando nueva versión");

          const freshData = await LaunchCore.fetchWorker("", true);

          if(window.initLaunchEngine){
            currentExecution = null;
            window.initLaunchEngine(true, freshData);
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

      const now = Date.now();
      const versionTime = Number(nuevaDataVersion);

      // 🔥 ventana de seguridad (3 min)
      const SAFE_WINDOW = 3 * 60 * 1000;

      const yaDeberiaEstarLista = (now - versionTime) > SAFE_WINDOW;

      // 🔥 SI NO CAMBIÓ → NO HACER NADA
      if(currentDataVersion === nuevaDataVersion){
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

        currentDataVersion = nuevaDataVersion;
        localStorage.setItem("lc_data_version", nuevaDataVersion);

        if(savedDataVersion && savedDataVersion !== nuevaDataVersion){
          logVC("🧟 Usuario volvió → refresh inmediato");
          confirmarConWorker(nuevaDataVersion);
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */

      // 🔥 evitar duplicados
      if(pendingDataVersion === nuevaDataVersion){
        logVC("⏳ Confirmación ya en curso");
        return;
      }

      logVC("🆕 Nueva DATA detectada", nuevaDataVersion);

      pendingDataVersion = nuevaDataVersion;

      const versionToConfirm = nuevaDataVersion;

      if (yaDeberiaEstarLista) {

        logVC("⚡ Timestamp viejo → fetch inmediato");

        confirmarConWorker(nuevaDataVersion);

      } else {

        logVC("⏳ Timestamp reciente → esperar confirmDelay");

        LaunchCore.scheduler.programar(
          "vc-confirm",
          () => confirmarConWorker(nuevaDataVersion),
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
          //location.href = buildUrl();
          location.reload();
        }

        return;
      }

      /* =====================================================
         CAMBIO DETECTADO
      ===================================================== */

      if(currentCodeVersion !== nuevaCodeVersion){

        logVC("💥 Nuevo deploy → reload");

        localStorage.setItem("lc_code_version", nuevaCodeVersion);
        //location.href = buildUrl();
        location.reload();
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

    renderDebugPanel(); // 🔥 DEBUG VISUAL

    logVC("🚀 VC INIT");

    LaunchCore.visibility.init(check, config.checkInterval);

    check(); // primer check

    // 🔥 loop backup (cada X tiempo)
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