let lastCapturaHTML = null;

LaunchCore.register("capture", {

  init: async function(){
    const { project, product, page } = LaunchCore.config;
    const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;
    await LaunchCore.loadCSS(url + ".css");
  },

  render: async function(data){

    const root = LaunchCore.root;

    const captura = data?.captura || {};
    const evento = data?.evento || {};

    let htmlExtra = "";

    // SIEMPRE mostrar algo si hay próxima clase
    if (evento.proximaClase) {

      htmlExtra = `
        <div class="mensaje-dormir">
          ${evento.textoCapturaDurmiendo}
        </div>
      `;

    // SOLO cuando ya no hay clases → repetición
    } else if (evento.capturaRepeticiones) {

      htmlExtra = `
        <div class="mensaje-repeticiones">
          ${evento.capturaRepeticiones}
        </div>
      `;
    }

    // ===== HTML BASE =====
    const baseHTML = captura.capturaHtml || "";

    const nuevoHTML = `
      <div id="evento-info">
        ${baseHTML}
        ${htmlExtra}
      </div>
    `;

    // ===== RENDER INTELIGENTE =====
    if (lastCapturaHTML !== nuevoHTML) {
      root.innerHTML = nuevoHTML;
      lastCapturaHTML = nuevoHTML;
    }
  }

});