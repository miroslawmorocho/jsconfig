LaunchCore.register("pricing", async function(){

const root = LaunchCore.root;

  const { project, product, page } = LaunchCore.config;

  const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;

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
  await LaunchCore.use("versionChecker");

  // 🔥 lógica propia
  await LaunchCore.loadScript(url + ".js");

});