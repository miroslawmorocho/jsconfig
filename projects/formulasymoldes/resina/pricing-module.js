LaunchCore.register("pricing", async function(){

const root = LaunchCore.root;

  const BASE = LaunchCore.paths.projects;
  const {project, product, page} = LaunchCore.config;
  const url = `${BASE}${project}/${product}/${page}`;

  // 🔥 CSS primero
  await LaunchCore.loadCSS(url + ".css");

  // 🔥 HTML
  let html = "";
  try{
    html = await fetch(url + ".html").then(r=>r.text());
  }catch(e){
    console.error("Error cargando HTML:", e);
    return;
  }

  root.innerHTML = html;

  // 🔥 módulos globales
  await LaunchCore.use("darkmode");
  await LaunchCore.use("carousel");
  await LaunchCore.use("scroll");

  // 🔥 lógica propia
  await LaunchCore.loadScript(url + ".js");

});