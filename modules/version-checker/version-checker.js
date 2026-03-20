function initVersionChecker(config) {

  console.log("🔥 VERSION CHECKER FILE CARGADO");

  let currentVersion = null;
  let confirmTimeout = null;

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

  async function confirmarConWorker(nuevaVersion){

    console.log("⏳ [VC] Confirmando con worker...");

    try {

      const res = await fetch(config.workerUrl + "/status", {
        cache: "no-store"
      });

      const data = await res.json();

      console.log("🛰️ [VC] Worker version:", data.version);

      if(data.version === nuevaVersion){

        console.log("✅ [VC] Worker OK → reload");

        if(config.autoReload){
          location.href = buildUrl();
        }

      } else {
        console.log("⌛ [VC] Worker aún no sincronizado");
      }

    } catch(e){
      console.warn("❌ [VC] Error worker", e);
    }
  }

  async function check(){

    console.log("🔍 [VC] Check...");

    try {

      // 🔥 GITHUB PRIMERO
      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaVersion = data.version;

      const savedVersion = localStorage.getItem("lc_version");

      console.log("📦 Local:", savedVersion);
      console.log("🌐 GitHub:", nuevaVersion);

      if(!currentVersion){

        currentVersion = nuevaVersion;
        localStorage.setItem("lc_version", nuevaVersion);

        if(savedVersion && savedVersion !== nuevaVersion){

          console.log("🧟 Usuario volvió → versión vieja");

          confirmTimeout = setTimeout(()=>{
            confirmarConWorker(nuevaVersion);
          }, config.confirmDelay);

        }

        return;
      }

      if(currentVersion !== nuevaVersion){

        console.log("🆕 Nueva versión detectada");

        confirmTimeout = setTimeout(()=>{
          confirmarConWorker(nuevaVersion);
        }, config.confirmDelay);

      }

      currentVersion = nuevaVersion;
      localStorage.setItem("lc_version", nuevaVersion);

    } catch(e){
      console.warn("❌ [VC] Error", e);
    }
  }

  async function init(){

    console.log("🚀 [VC] INIT");

    try {

      // 🔥 PRIMERA DECISIÓN → WORKER MANDA
      const res = await fetch(config.workerUrl + "/status", {
        cache: "no-store"
      });

      const status = await res.json();

      console.log("📡 [VC] STATUS:", status);

      if(status.eventoActivo){

        console.log("🚫 Evento ACTIVO → version checker DESACTIVADO");
        return;

      }

      console.log("✅ Evento CERRADO → activar version checker");

      setInterval(check, config.checkInterval);
      LaunchCore.visibility.init(check, config.checkInterval);

      check();

    } catch(e){
      console.warn("❌ [VC] Error init", e);
    }

  }

  init();
}

window.initVersionChecker = initVersionChecker;