LaunchCore.register("capture", async function(){

  const root = LaunchCore.root;
  const { project, product, page } = LaunchCore.config;

  const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;

  await LaunchCore.loadCSS(url + ".css");

  /* =====================================================
     ENGINE (igual filosofía que bridge)
  ===================================================== */

  let currentExecution = null;

  window.initLaunchEngine = async function(force = false, externalData = null, forceFetch = false){

    if (!force && !LaunchCore.timing.shouldRun()) {
      console.log("😴 Esperando al CORE...");
      return;
    }

    if (currentExecution) {
      console.warn("⛔ Ya hay ejecución en capture");
      return currentExecution;
    }

    currentExecution = (async () => {

      try {

        console.log("🚀 [CAPTURE] Fetching worker...");

        let data;

        if(externalData){
          console.log("⚡ Usando data externa");
          data = externalData;
        } else {
          data = await LaunchCore.fetchWorker("/captura", forceFetch);
        }

        if(!data) return;

        root.innerHTML = `
          <div id="evento-info">
            ${data.capturaHtml}
          </div>
        `;

        // 🔥 si el worker envía timing → lo usamos
        if (data.siguienteActualizacionMs) {
          LaunchCore.timing.setNext(data.siguienteActualizacionMs);
        }

      } catch(e){
        console.warn("💥 Error capture:", e);
      } finally {
        currentExecution = null;
      }

    })();

    return currentExecution;
  };

  /* =====================================================
     INIT
  ===================================================== */

  LaunchCore.onReady(() => {
    window.initLaunchEngine();
  });

});