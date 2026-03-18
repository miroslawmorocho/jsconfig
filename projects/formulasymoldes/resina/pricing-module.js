LaunchCore.register("pricing", async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/projects/";
  const root = document.getElementById("launch-engine-root");

  // 🔥 cargar HTML principal
  const html = await fetch(BASE+"formulasymoldes/resina/pricing.html").then(r=>r.text());
  root.innerHTML = html;

  // 🔥 módulos globales
  await LaunchCore.use("darkmode");
  await LaunchCore.use("carousel");
  await LaunchCore.use("scroll");

  // 🔥 estilos y lógica propia
  await LaunchCore.loadCSS(BASE+"formulasymoldes/resina/pricing.css");
  await LaunchCore.loadScript(BASE+"formulasymoldes/resina/pricing.js");
  console.log("📥 cargando script:", src);

});