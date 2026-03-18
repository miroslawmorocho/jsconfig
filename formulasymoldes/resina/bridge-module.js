LaunchCore.register("bridge", async function(){

  const root = document.getElementById("launch-engine-root");

  const base = "https://miroslawmorocho.github.io/jsconfig/formulasymoldes/resina/";

  const html = await fetch(base + "bridge.html").then(r => r.text());

  root.innerHTML = html;

  await LaunchCore.loadCSS(base + "bridge.css");
  await LaunchCore.loadScript(base + "bridge.js");

});