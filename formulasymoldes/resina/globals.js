LaunchCore.globals.darkmode = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  await LaunchCore.loadCSS(BASE+"modules/darkmode/darkmode.css");

  const darkHTML = await fetch(BASE+"modules/darkmode/darkmode.html").then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", darkHTML);

  await LaunchCore.loadScript(BASE+"modules/darkmode/darkmode.js");

};

LaunchCore.globals.carousel = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  const container = document.getElementById("pricing-carousel");

  if(!container) return; // 🔥 importante

  const html = await fetch(BASE+"formulasymoldes/resina/carousel.html").then(r=>r.text());
  container.innerHTML = html;

  await LaunchCore.loadCSS(BASE+"modules/carousel/carousel.css");
  await LaunchCore.loadScript(BASE+"modules/carousel/carousel.js");

};

LaunchCore.globals.scroll = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  await LaunchCore.loadScript(BASE+"modules/scroll/scroll.js");

};