window.LaunchCore = window.LaunchCore || {};

LaunchCore.paths = {
  base: "https://miroslawmorocho.github.io/jsconfig/",
  components: "https://miroslawmorocho.github.io/jsconfig/components/",
  projects: "https://miroslawmorocho.github.io/jsconfig/projects/"
};

LaunchCore.config = {
  project: null,
  product: null,
  page: null
};

(function(){

  /* =====================================================
    CONFIG BASE
  ===================================================== */

  const BASE_WORKER_URL = "https://launch-engine.miroslaw-mm.workers.dev";

  /* =====================================================
    CORE GLOBAL
  ===================================================== */

  LaunchCore.globals = LaunchCore.globals || {};

  /* =====================================================
    HELPERS (CSS / JS)
  ===================================================== */

  LaunchCore.loadScript = function(src){
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
  };

  LaunchCore.loadCSS = function(href){
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
  };

  /* =====================================================
    FETCH WORKER (UNIFICADO)
  ===================================================== */

  LaunchCore.fetchWorker = async function(endpoint = ""){

    try{

      const url = BASE_WORKER_URL + endpoint + window.location.search;

      const res = await fetch(url);

      if(!res.ok) throw new Error("Worker error");

      return await res.json();

    }catch(e){

      console.warn("LaunchCore fetch error:", e);
      return null;

    }

  };

  /* =====================================================
    SCHEDULER (REPROGRAMACIÓN)
  ===================================================== */

  LaunchCore.scheduler = (function(){

    let timeout = null;

    function programar(fn, delay){

      if(timeout){
        clearTimeout(timeout);
      }

      if(!delay) return;

      // mínimo
      if(delay < 2000) delay = 2000;

      // jitter (hasta 20%)
      const jitter = delay * 0.2 * Math.random();
      delay += jitter;

      timeout = setTimeout(()=>{
        fn();
      }, delay);

    }

    return {
      programar
    };

  })();

  /* =====================================================
    VISIBILITY CONTROL (GLOBAL)
  ===================================================== */

  LaunchCore.visibility = (function(){

    let lastCheck = 0;
    let minInterval = 60000; // default 1 min
    let callbacks = [];

    function init(fn, interval){

      callbacks.push(fn);

      if(interval){
        minInterval = interval;
      }

      document.addEventListener("visibilitychange", () => {

        if(document.hidden) return;

        const now = Date.now();

        if(now - lastCheck < minInterval){
          return;
        }

        callbacks.forEach(fn => {
          try {
            fn();
          } catch(e){
            console.warn("Visibility callback error:", e);
          }
        });

        lastCheck = now;

      });

    }

    function updateInterval(newInterval){
      if(newInterval){
        minInterval = newInterval;
      }
    }

    return {
      init,
      updateInterval
    };

  })();

  /* =====================================================
    COUNTDOWN (GLOBAL)
  ===================================================== */

  LaunchCore.countdown = (function(){

    let interval = null;
    let targetTime = null;

    const DOM = {
      days: () => document.getElementById("days"),
      hours: () => document.getElementById("hours"),
      minutes: () => document.getElementById("minutes"),
      seconds: () => document.getElementById("seconds")
    };

    function start(target){

      stop();

      targetTime = Number(target);

      function update(){

        const now = Date.now();
        const diff = targetTime - now;

        if(diff <= 0){
          stop();
          return;
        }

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        if(DOM.days()) DOM.days().textContent = String(d).padStart(2,"0");
        if(DOM.hours()) DOM.hours().textContent = String(h).padStart(2,"0");
        if(DOM.minutes()) DOM.minutes().textContent = String(m).padStart(2,"0");
        if(DOM.seconds()) DOM.seconds().textContent = String(s).padStart(2,"0");

      }

      update();
      interval = setInterval(update, 1000);

    }

    function stop(){

      if(interval){
        clearInterval(interval);
        interval = null;
      }

    }

    return {
      start,
      stop
    };

  })();

  /* =====================================================
    READY (espera a que responda el worker y carga el div
    donde se inyecta la tabla de precios de pricing)
  ===================================================== */

  LaunchCore.onReady = function(fn){

    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", fn);
    }else{
      fn();
    }

  };

})();

/* =====================================================
   MODULE REGISTRY (AUTO INIT)
===================================================== */

LaunchCore.modules = {};

LaunchCore.register = function(name, fn){
  LaunchCore.modules[name] = fn;
};

LaunchCore.init = async function(){

  const root = document.getElementById("launch-engine-root");
  LaunchCore.root = root;

  if(!root){
    console.error(
      "LaunchCore: Falta #launch-engine-root en el HTML del frontend.\n" +
      "Debes agregar:\n" +
      '<div id="launch-engine-root" data-project="..." data-product="..." data-page="..."></div>'
    );
    return;
  }

  // 🔥 guardar config global
  LaunchCore.config.project = root.dataset.project;
  LaunchCore.config.product = root.dataset.product;
  LaunchCore.config.page = root.dataset.page;

  if(!LaunchCore.config.project || !LaunchCore.config.product || !LaunchCore.config.page){
    console.error(
      "LaunchCore: Faltan atributos data-* en #launch-engine-root",
      LaunchCore.config
    );
    return;
  }

  const { project, product, page } = LaunchCore.config;

  const base = LaunchCore.paths.projects + `${project}/${product}/`;

  const moduleUrl = base + page + "-module.js";

  try{

    // 🔥 cargar CSS globales base
    await LaunchCore.globals.flag();

    // 🔥 cargar módulo dinámicamente
    await LaunchCore.loadScript(moduleUrl);

    const module = LaunchCore.modules[page];

    if(!module){
      console.warn("Módulo no registrado:", page);
      return;
    }

    await module();

    await LaunchCore.use("versionChecker");
    console.log("🔥 LLAMANDO VERSION CHECKER...");

  }catch(e){
    console.error("Auto-init error:", e);
  }

};

/* =====================================================
   MÓDULOS GLOBALES (darkmode, carousel, etc.)
===================================================== */
LaunchCore.use = async function(name){

  const fn = LaunchCore.globals[name];

  if(!fn){
    console.warn("Global no encontrado:", name);
    return;
  }

  return await fn();

};

LaunchCore.globals.darkmode = async function(){

  const darkmodePath = "modules/darkmode/darkmode"
  await LaunchCore.loadCSS(LaunchCore.paths.base + darkmodePath + ".css");

  const darkHTML = await fetch(
    LaunchCore.paths.base + darkmodePath + ".html"
  ).then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", darkHTML);

  await LaunchCore.loadScript(LaunchCore.paths.base + darkmodePath + ".js");

};

LaunchCore.globals.carousel = async function(){

  const carouselPath = "modules/carousel/carousel";
  const container = document.getElementById("pricing-carousel");

  if(!container) return; // 🔥 importante

  //const root = LaunchCore.root;
  const { project, product, page } = LaunchCore.config;

  const html = await fetch(
    LaunchCore.paths.projects + `${project}/${product}/carousel.html`
    // Esto debemos estandarizar de alguna forma. La idea es que el
    // carrusel corresponde EXACTAMENTE al path que se genera aquí
    // https://miroslawmorocho.github.io/jsconfig/projects/formulasymoldes/resina/carousel.html
    // es decir, es distinto de la FUNCIÓN carousel que vive en "modules"
    // Este html es EXCLUSIVO del PROYECTO. Y se usa solamente dentro de la carta de ventas!
  ).then(r=>r.text());

  container.innerHTML = html;

  await LaunchCore.loadCSS(LaunchCore.paths.base + carouselPath + ".css");
  await LaunchCore.loadScript(LaunchCore.paths.base + carouselPath + ".js");

};

LaunchCore.globals.scroll = async function(){

  const scrollPath = "modules/scroll/scroll"
  await LaunchCore.loadScript(LaunchCore.paths.base + scrollPath + ".js");

};

LaunchCore.globals.versionChecker = async function(){

  const { project, product } = LaunchCore.config;

  const url = LaunchCore.paths.projects +
    `${project}/${product}/launch-config.json`;

  const config = await fetch(url).then(r=>r.json());

  await LaunchCore.loadScript(
    LaunchCore.paths.base + "modules/version-checker/version-checker.js"
  );

  window.initVersionChecker({
    versionUrl: url,
    workerUrl: "https://launch-engine.miroslaw-mm.workers.dev",
    cierreEvento: config.cierreEvento,
    modoCierre: config.modoCierre,
    checkInterval: 60000, // PRODUCCIÓN 15*60*1000, // 15 min
    confirmDelay: 3 * 60 * 1000,
    autoReload: true
  });

};


LaunchCore.globals.flag = async function(){

  await LaunchCore.loadCSS(
    LaunchCore.paths.components + "flag.css"
  );

};