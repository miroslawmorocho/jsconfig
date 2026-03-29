function initVersionChecker(config){

  if(window.__vcInitialized) {
    console.log("⛔ VC ya inicializado");
    return;
  }

  window.__vcInitialized = true;

  console.log("🔥 VC SENSOR INICIADO");
  console.log("⚙️ VC config:", config);

  let lastDataVersion = null;
  let lastCodeVersion = null;
  let checking = false;

  /* =====================================================
     DEBUG SIMPLE
  ===================================================== */

  function log(msg, data){
    console.log(`🛰️ VC → ${msg}`, data || "");
  }

  /* =====================================================
     CHECK
  ===================================================== */

  async function check(){

    if(checking){
      log("⛔ busy");
      return;
    }

    checking = true;

    const now = new Date().toLocaleTimeString();
    log("check @" + now);

    try{

      // 🔥 CODE
      const codeRes = await fetch(config.codeVersionUrl, { cache: "no-store" });
      const code = String((await codeRes.json()).commit);

      log("code", code);

      if(lastCodeVersion && lastCodeVersion !== code){
        log("💥 CODE CAMBIÓ");
        LaunchCore.emit("code:update");
      }

      lastCodeVersion = code;

      // 🔥 DATA (GitHub)
      const dataRes = await fetch(config.versionUrl, { cache: "no-store" });
      const data = String((await dataRes.json()).version);

      // 🔥 versión actual en cache REAL
      const currentVersion = LaunchCore.storage.get("lc_data_version", {
                              source: "vc:currentVersion"
      });

      const lastDetected = LaunchCore.storage.get("vc_last_detected", {
                            source: "vc:lastDetected"
      });

      log("📦 current (cache)", currentVersion);
      if(lastDetected) {log("🧠 last detected", lastDetected);}
      
      // 🔥 evitar emitir si ya tenemos esta versión
      if(String(currentVersion) !== String(data)){

        if(String(lastDetected) === String(data)){
          log("♻️ versión ya detectada pero no confirmada → reintentando");
        } else {
          log("🟡 DATA CAMBIO DETECTADO");
          LaunchCore.storage.set("vc_last_detected", data, {
            source: "vc:detected"
          });
        }

        LaunchCore.emit("data:detected", {
          version: data,
          confirmDelay: config.confirmDelay
        });

      }

      lastDataVersion = data;

    }catch(e){
      console.warn("⚠️ VC error", e);
    }

    checking = false;

    if(pendingForcedCheck){
      pendingForcedCheck = false;
      log("🔁 ejecutando check pendiente");
      check();
    }
  }

  /* =====================================================
     LOOP
  ===================================================== */

  console.log("⏱️ intervalo:", config.checkInterval);

  setInterval(check, config.checkInterval);

  check(); // primer disparo

  let pendingForcedCheck = false;

  window.__vcCheckNow = function(){

    if(checking){
      pendingForcedCheck = true;
      log("⏳ busy → en cola");
      return;
    }

    log("🚀 forced check");
    check();
  };
}