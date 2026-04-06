let lastCapturaHTML = null;

LaunchCore.register("capture", {

  init: async function(){
    const { project, product, page } = LaunchCore.config;
    const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;
    await LaunchCore.loadCSS(url + ".css");
  },

  render: async function(data){

    const root = LaunchCore.root;
    const nuevoHTML = data?.captura.capturaHtml || "";

    // 🧠 SOLO render si cambió
    if (lastCapturaHTML !== nuevoHTML) {

      root.innerHTML = `
        <div id="evento-info">
          ${nuevoHTML}
        </div>
      `;

      lastCapturaHTML = nuevoHTML;
    }

  }

});