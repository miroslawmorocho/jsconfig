LaunchCore.register("capture", async function(){

  const root = LaunchCore.root;

  // 🔥 query params
  const params = new URLSearchParams(window.location.search);
  const country = params.get("country") || "";
  const tz = params.get("tz") || "";

  // 🔥 pedir al worker
  const data = await LaunchCore.fetchWorker(
    `/captura?country=${country}&tz=${tz}`
  );

  if(!data){
    console.warn("No data from worker");
    return;
  }

  // 🔥 inyectar HTML dinámico
  root.innerHTML = `
    <div id="evento-info">
      ${data.capturaHtml}
    </div>
  `;

  // 🔥 cargar CSS de la página
  const { project, product } = LaunchCore.config;
  const base = LaunchCore.paths.projects;

  await LaunchCore.loadCSS(
    `${base}${project}/${product}/capture.css`
  );

});