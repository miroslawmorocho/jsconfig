function initVersionChecker(config) {

  let currentVersion = null;

  /* =====================================================
     HELPERS
  ===================================================== */

  function yaCerroLocal(cierreEvento){

    const fecha = new Date(cierreEvento);

    const cierreDia = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

    const hoy = new Date();

    const hoyDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    return hoyDia > cierreDia;
  }

  function eventoActivo(){

    const ahora = Date.now();

    if(config.modoCierre === "global"){
      const cierre = new Date(config.cierreEvento).getTime();
      return ahora < cierre;
    }

    if(config.modoCierre === "medianoche_local"){
      return !yaCerroLocal(config.cierreEvento);
    }

    return false;
  }

  function versionHumana(){
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
    return location.origin + location.pathname + "?v=" + versionHumana();
  }

  /* =====================================================
     CORE CHECK
  ===================================================== */

  async function check(){

    console.log("🔍 Version check ejecutándose");

    // 🔥 SOLO fuera de lanzamiento
    if(eventoActivo()){
      console.log("🚫 Evento activo → no se chequea versión");
      return;
    }

    try {

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();
      const nuevaVersion = data.version;

      const savedVersion = localStorage.getItem("lc_version");

      console.log("📦 LocalStorage:", savedVersion);
      console.log("🌐 GitHub:", nuevaVersion);

      /* =====================================================
         PRIMERA EJECUCIÓN (AL ENTRAR)
      ===================================================== */

      if(!currentVersion){

        currentVersion = nuevaVersion;

        // guardar siempre
        localStorage.setItem("lc_version", nuevaVersion);

        if(savedVersion && savedVersion !== nuevaVersion){

          console.log("🧟 Usuario regresó → versión vieja detectada");

          try {

            const confirm = await fetch(
              config.workerUrl + "/version-check"
            ).then(r=>r.json());

            if(confirm?.ready && confirm.version === nuevaVersion){

              console.log("✅ Worker sincronizado → recargando");

              if(config.autoReload){

                const newUrl = buildUrl();

                console.log("🔄 Redirect →", newUrl);

                location.href = newUrl;
              }

            } else {

              console.log("⏳ Worker aún no listo");

            }

          } catch(e){
            console.warn("❌ Error confirmando worker", e);
          }

        }

        return;
      }

      /* =====================================================
         CAMBIO EN VIVO (TAB ABIERTA)
      ===================================================== */

      if(currentVersion !== nuevaVersion){

        console.log("🆕 Nueva versión detectada en vivo");

        try {

          const confirm = await fetch(
            config.workerUrl + "/version-check"
          ).then(r=>r.json());

          if(confirm?.ready && confirm.version === nuevaVersion){

            console.log("✅ Sync OK → reload");

            if(config.autoReload){

              const newUrl = buildUrl();

              console.log("🔄 Redirect →", newUrl);

              location.href = newUrl;
            }

          } else {

            console.log("⏳ Esperando sincronización del worker");

          }

        } catch(e){
          console.warn("❌ Error confirmando versión", e);
        }

      }

      // 🔥 actualizar siempre
      currentVersion = nuevaVersion;
      localStorage.setItem("lc_version", nuevaVersion);

    } catch (e) {
      console.warn("❌ Error version check", e);
    }
  }

  /* =====================================================
     INIT
  ===================================================== */

  console.log("🚀 VersionChecker iniciado");

  // intervalo (controlado desde core)
  setInterval(check, config.checkInterval);

  // visibilidad (reusa tu core 🔥)
  LaunchCore.visibility.init(check, config.checkInterval);

  // primera ejecución
  check();
}

window.initVersionChecker = initVersionChecker;