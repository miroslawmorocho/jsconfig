LaunchCore.register("pricing", async function(){

  const root = document.getElementById("launch-engine-root");

  const base = "https://miroslawmorocho.github.io/jsconfig/formulasymoldes/resina/";

  const html = await fetch(base + "pricing.html").then(r => r.text());

  root.innerHTML = html;

  await LaunchCore.loadCSS(base + "pricing.css");
  await LaunchCore.loadScript(base + "pricing.js");

});