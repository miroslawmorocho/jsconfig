LaunchCore.globals.carousel = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  const container = document.getElementById("pricing-carousel");

  if(!container) return;

  const html = await fetch(BASE+"formulasymoldes/resina/carousel.html").then(r=>r.text());
  container.innerHTML = html;

  await LaunchCore.loadCSS(BASE+"modules/carousel/carousel.css");
  await LaunchCore.loadScript(BASE+"modules/carousel/carousel.js");

};