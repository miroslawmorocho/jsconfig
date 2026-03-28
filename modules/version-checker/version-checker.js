function initVersionChecker(config){

  if(window.__vcInitialized) return;
  window.__vcInitialized = true;

  console.log("🔥 VC SENSOR INICIADO");
  console.log("⚙️ VC config:", config);

  let lastDataVersion = null;
  let lastCodeVersion = null;

  async function check(){

    const now = new Date().toLocaleTimeString();
    console.log(`🛰️ VC check @ ${now}`);

    try{

      // 🔥 CODE VERSION (GitHub)
      const codeRes = await fetch(config.codeVersionUrl, { cache: "no-store" });
      const code = String((await codeRes.json()).commit);

      console.log("🧬 VC code version:", code);

      if(lastCodeVersion && lastCodeVersion !== code){
        console.log("💥 CODE CAMBIO DETECTADO");
        LaunchCore.emit("code:update");
      }

      lastCodeVersion = code;

      // 🔥 DATA VERSION (GitHub)
      const dataRes = await fetch(config.versionUrl, { cache: "no-store" });
      const data = String((await dataRes.json()).version);

      console.log("📦 VC data version:", data);

      if(lastDataVersion && lastDataVersion !== data){
        console.log("🟡 DATA CAMBIO DETECTADO (GitHub)");
        LaunchCore.emit("data:detected"); // 👈 IMPORTANTE (NO update directo)
      }

      lastDataVersion = data;

    }catch(e){
      console.warn("⚠️ VC error", e);
    }

  }

  console.log("⏱️ VC intervalo:", config.checkInterval);
  console.log("🛰️ VC activo (interval loop creado)");

  setInterval(check, config.checkInterval);

  check(); // primer disparo
}