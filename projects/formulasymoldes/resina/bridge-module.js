LaunchCore.register("bridge", async function(){

  const root = document.getElementById("launch-engine-root");

  const base = LaunchCore.paths.projects;
  const route = "formulasymoldes/resina/";
  const page = root.dataset.page
  const url = base + route + page;
  // const html = await fetch(base + "formulasymoldes/resina/bridge.html").then(r => r.text());
  const html = await fetch(url).then(r => r.text());

  root.innerHTML = html;

  //await LaunchCore.loadCSS(base + "formulasymoldes/resina/bridge.css");
  //await LaunchCore.loadScript(base + "formulasymoldes/resina/bridge.js");

  await LaunchCore.loadCSS(url + ".css");
  await LaunchCore.loadScript(url + ".js");

});