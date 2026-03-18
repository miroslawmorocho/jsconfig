LaunchCore.globals.darkmode = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  await LaunchCore.loadCSS(BASE+"modules/darkmode/darkmode.css");

  const html = await fetch(BASE+"modules/darkmode/darkmode.html").then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", html);

  await LaunchCore.loadScript(BASE+"modules/darkmode/darkmode.js");

};