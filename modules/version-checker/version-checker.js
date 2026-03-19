export function initVersionChecker(config) {

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

  /* =====================================================
     CORE CHECK
  ===================================================== */

  async function check(){

    // 🔥 SOLO corre fuera de lanzamiento
    if(eventoActivo()) return;

    try {

      const res = await fetch(config.versionUrl, {
        cache: "no-store"
      });

      const data = await res.json();

      const nuevaVersion = data.version;

      const savedVersion = localStorage.getItem("lc_version");

      /* =====================================================
         PRIMERA EJECUCIÓN (AL ENTRAR A LA PÁGINA)
      ===================================================== */

      if(!currentVersion){

        currentVersion = nuevaVersion;

        // guardar siempre versión actual
        localStorage.setItem("lc_version", nuevaVersion);

        // 🔥 CASO CRÍTICO: usuario volvió días después
        if(savedVersion && savedVersion !== nuevaVersion){

          console.log("🆕 Usuario regresó → nueva versión detectada");

          try {

            const confirm = await fetch(
              config.workerUrl + "/version-check"
            ).then(r=>r.json());

            if(confirm?.ready && confirm.version === nuevaVersion){

              console.log("✅ Worker sincronizado → recargando");

              if(config.autoReload){
                location.reload();
              }

            } else {

              console.log("⏳ Worker aún no listo");

            }

          } catch(e){
            console.warn("Error confirmando con worker", e);
          }

        }

        return;
      }

      /* =====================================================
         CAMBIO DURANTE SESIÓN (TAB ABIERTA)
      ===================================================== */

      if(currentVersion !== nuevaVersion){

        console.log("🆕 Nueva versión detectada (en vivo)");

        try {

          const confirm = await fetch(
            config.workerUrl + "/version-check"
          ).then(r=>r.json());

          if(confirm?.ready && confirm.version === nuevaVersion){

            console.log("✅ Sync OK → reload");

            if(config.autoReload){
              location.reload();
            }

          } else {

            console.log("⏳ Esperando sincronización del worker");

          }

        } catch(e){
          console.warn("Error confirmando versión", e);
        }

      }

      // 🔥 actualizar siempre
      currentVersion = nuevaVersion;
      localStorage.setItem("lc_version", nuevaVersion);

    } catch (e) {
      console.warn("Error version check", e);
    }
  }

  /* =====================================================
     INIT
  ===================================================== */

  // intervalo (usa el del core)
  setInterval(check, config.checkInterval);

  // cuando vuelve a la pestaña
  LaunchCore.visibility.init(check, config.checkInterval);

  // 🔥 ejecutar una vez al iniciar
  check();

}