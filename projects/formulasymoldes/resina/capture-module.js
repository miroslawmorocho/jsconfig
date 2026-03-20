LaunchCore.register("capture", async function(){

  const root = LaunchCore.root;

  const { project, product, page } = LaunchCore.config;

  const url = LaunchCore.paths.projects + `${project}/${product}/${page}`;

  // 🔥 pedir al worker (SIN PARAMS)
  const data = await LaunchCore.fetchWorker("/captura");

  if(!data){
    console.warn("No data from worker");
    return;
  }

  await LaunchCore.loadCSS(url + ".css");

  // 🔥 inyectar HTML dinámico
  root.innerHTML = `
    <div id="evento-info">
      ${data.capturaHtml}
    </div>
  `;

});