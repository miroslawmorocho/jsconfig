LaunchCore.register("pricing", {

  init: async function(){

    const root = LaunchCore.root;

    const { project, product, page } = LaunchCore.config;

    const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;

    // CSS
    await LaunchCore.loadCSS(url + ".css");

    // HTML
    let html = "";
    try{
      html = await fetch(url + ".html").then(r=>r.text());
    }catch(e){
      console.error("Error cargando HTML:", e);
      return;
    }

    root.innerHTML = html;

    // globales
    await LaunchCore.use("darkmode");
    await LaunchCore.use("carousel");
    await LaunchCore.use("scroll");
    
    // lógica (TU archivo pricing.js)
    await LaunchCore.loadScript(url + ".js");

  },

  render: async function(data){

    // 🔥 AQUÍ SOLO PINTAS
    await cargarPricing(data);

  }

});