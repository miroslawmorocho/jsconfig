function initVersionChecker(config){

  if(window.__vcInitialized) return;
  window.__vcInitialized = true;

  console.log("🔥 VC SENSOR INICIADO");

  let lastDataVersion = null;
  let lastCodeVersion = null;

  async function check(){

    try{

      // 🔥 CODE
      const codeRes = await fetch(config.codeVersionUrl, { cache: "no-store" });
      const code = String((await codeRes.json()).commit);

      if(lastCodeVersion && lastCodeVersion !== code){
        console.log("💥 CODE CAMBIO DETECTADO");
        LaunchCore.emit("code:update");
      }

      lastCodeVersion = code;

      // 🔥 DATA
      const dataRes = await fetch(config.versionUrl, { cache: "no-store" });
      const data = String((await dataRes.json()).version);

      if(lastDataVersion && lastDataVersion !== data){
        console.log("🆕 DATA CAMBIO DETECTADO");
        LaunchCore.emit("data:update");
      }

      lastDataVersion = data;

    }catch(e){
      console.warn("VC error", e);
    }

  }

  LaunchCore.timing.schedule(
    check,
    config.checkInterval,
    "vc-loop"
  );

  check();
}

window.initVersionChecker = initVersionChecker;