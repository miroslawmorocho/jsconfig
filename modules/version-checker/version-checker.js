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

      log("data", data);

      if(lastDataVersion && lastDataVersion !== data){
        log("🟡 DATA CAMBIO DETECTADO");
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
  }

  /* =====================================================
     LOOP
  ===================================================== */

  console.log("⏱️ intervalo:", config.checkInterval);

  setInterval(check, config.checkInterval);

  check(); // primer disparo
}