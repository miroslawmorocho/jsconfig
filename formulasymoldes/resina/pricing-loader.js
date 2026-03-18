(async function(){

const BASE = "https://miroslawmorocho.github.io/jsconfig/";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init(){

  /* =========================
     DARK MODE (GLOBAL)
  ========================= */

  await LaunchCore.loadCSS(BASE+"modules/darkmode/darkmode.css");

  const darkHTML = await fetch(BASE+"modules/darkmode/darkmode.html").then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", darkHTML);

  await cargarScript(BASE+"modules/darkmode/darkmode.js");


  /* =========================
     CAROUSEL
  ========================= */

  const carouselContainer = document.getElementById("pricing-carousel");

  if(carouselContainer){

    const html = await fetch(BASE+"formulasymoldes/resina/carousel.html").then(r=>r.text());
    carouselContainer.innerHTML = html;

    await LaunchCore.loadCSS(BASE+"modules/carousel/carousel.css");
    await cargarScript(BASE+"modules/carousel/carousel.js");
  }


  /* =========================
     PRICING (WORKER)
  ========================= */

  const pricingRoot = document.getElementById("pricing-root");

  if(pricingRoot){
  
    /* 1. insertar HTML base */
    const html = await fetch(BASE+"formulasymoldes/resina/pricing.html").then(r=>r.text());
    pricingRoot.innerHTML = html;
  
    /* 2. cargar estilos */
    await LaunchCore.loadCSS(BASE+"formulasymoldes/resina/pricing.css");
  
    /* 3. cargar lógica */
    await cargarScript(BASE+"formulasymoldes/resina/pricing.js");
  
  }


  /* =========================
     SCROLL FIX (#comprar)
  ========================= */

  await cargarScript(BASE+"modules/scroll/scroll.js");

}


/* =========================
   HELPERS (ANTI DUPLICADOS)
========================= */

function cargarScript(src){
  return new Promise((resolve)=>{

    if(document.querySelector(`script[src="${src}"]`)){
      resolve();
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;

    document.body.appendChild(s);

  });
}

function cargarCSS(href){
  return new Promise((resolve)=>{

    if(document.querySelector(`link[href="${href}"]`)){
      resolve();
      return;
    }

    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = resolve;

    document.head.appendChild(l);

  });
}

})();
