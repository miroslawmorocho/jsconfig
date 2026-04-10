LaunchCore.register("bridge", {

  init: async function(){

    const root = document.getElementById("launch-engine-root");

    const { project, product, page } = LaunchCore.config;
    const base = LaunchCore.paths.projects;

    const url = `${base}${project}/${product}/${page}`;

    // 🔥 CSS
    await LaunchCore.loadCSS(url + ".css");
    await LaunchCore.use("darkmode");
    
    // 🔥 HTML
    const html = await fetch(url + ".html").then(r => r.text());
    root.innerHTML = html;

    // JS
    await LaunchCore.loadScript(url + ".js");

  },

  render: async function(data){

    // 🔥 reutilizamos TODO tu engine actual
    await initLaunchEngine(data);

  }

});