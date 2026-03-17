(async function(){

const BASE = "https://miroslawmorocho.github.io/jsconfig/";

/* ===== CARGAR CSS GLOBAL ===== */
const css = document.createElement("link");
css.rel = "stylesheet";
css.href = BASE + "global.css";
document.head.appendChild(css);

/* ===== DETECCIÓN DE MÓDULOS ===== */

if(document.getElementById("darkToggle") || document.querySelector(".switch")){
  cargarScript(BASE+"modules/darkmode/darkmode.js");
  cargarCSS(BASE+"modules/darkmode/darkmode.css");
  cargarHTML(BASE+"modules/darkmode/darkmode.html", "body");
}

if(document.getElementById("pricing")){
  cargarScript(BASE+"formulasymoldes/resina/pricing.js");
  cargarCSS(BASE+"formulasymoldes/resina/pricing.css");
}

if(document.getElementById("pricing-carousel")){
  cargarScript(BASE+"modules/carousel/carousel.js");
  cargarCSS(BASE+"modules/carousel/carousel.css");
  cargarHTML(BASE+"formulasymoldes/resina/carousel.html", "#pricing-carousel");
}

if(window.location.hash === "#comprar"){
  cargarScript(BASE+"modules/scroll/scroll.js");
}

/* ===== HELPERS ===== */

function cargarScript(src){
  const s=document.createElement("script");
  s.src=src;
  document.body.appendChild(s);
}

function cargarCSS(href){
  const l=document.createElement("link");
  l.rel="stylesheet";
  l.href=href;
  document.head.appendChild(l);
}

async function cargarHTML(url, target){
  const html = await fetch(url).then(r=>r.text());
  document.querySelector(target).insertAdjacentHTML("beforeend", html);
}

})();
