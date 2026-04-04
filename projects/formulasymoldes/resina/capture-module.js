LaunchCore.register("capture", {

  init: async function(){

    const root = LaunchCore.root;
    const { project, product, page } = LaunchCore.config;

    const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;

    // CSS
    await LaunchCore.loadCSS(url + ".css");

  },

  render: async function(data){

    const root = LaunchCore.root;

    // 🔥 SOLO PINTA
    root.innerHTML = `
      <div id="evento-info">
        ${data?.captura.capturaHtml || ""}
      </div>
    `;

  }

});