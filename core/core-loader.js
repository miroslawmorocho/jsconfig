/* =====================================================
    CONFIG BASE
  ===================================================== */

window.LaunchCore = window.LaunchCore || {};

LaunchCore.paths = {
  base: "https://miroslawmorocho.github.io/jsconfig/",
  components: "https://miroslawmorocho.github.io/jsconfig/components/",
  projects: "https://miroslawmorocho.github.io/jsconfig/projects/"
};

LaunchCore.config = {
  project: null,
  product: null,
  page: null,
  endpoint: ""
};

LaunchCore.state = {
  eventoCerrado: false
};

LaunchCore.forceFresh = false;
LaunchCore.lastFetchTime = 0;
LaunchCore.lastGlobalFetch = 0;

let isRunning = false;
let lastRunTime = 0;

LaunchCore.events = {};


(function(){

  const BASE_WORKER_URL = "https://launch-engine.miroslaw-mm.workers.dev";

  /* =====================================================
    EVENT BUS
  ===================================================== */

  LaunchCore.on = function(event, fn){
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  };


  LaunchCore.emit = function(event, data){
    (this.events[event] || []).forEach(fn => fn(data));
  };


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

  LaunchCore.fetchWorker = async function(endpoint = "", force = false){

    try{

      let query = window.location.search || "?v=" + Date.now();

      let url = BASE_WORKER_URL.replace(/\/$/, "") +
                endpoint +
                query;

      console.log("🌐 FETCH URL:", url);

      if(force){
        url += (url.includes("?") ? "&" : "?") + "_=" + Date.now();
      }

      const options = force
        ? { cache: "no-store" }
        : {};

      const res = await fetch(url, options);

      LaunchCore.lastFetchTime = Date.now();
      LaunchCore.lastGlobalFetch = Date.now(); // 🔥 NUEVO

      if(!res.ok) throw new Error("Worker error");

      const data = await res.json();

      // 🔥 REGISTRAR FETCH GLOBAL
      LaunchCore.lastFetchTime = Date.now();
      LaunchCore.lastGlobalFetch = Date.now(); // 🔥 NUEVO

      return data;

    }catch(e){
      console.warn("LaunchCore fetch error:", e);
      return null;
    }

  };

  /* =====================================================
    SCHEDULER (REPROGRAMACIÓN)
  ===================================================== */

  LaunchCore.scheduler = (function(){

    let timers = {};

    function programar(key, fn, delay){

      cancelar(key); // 🔥 SIEMPRE limpiar antes

      if(!key){
        console.warn("Scheduler requiere key");
        return;
      }

      const MAX_DELAY = 2147483647;

      const targetTime = Date.now() + delay;

      localStorage.setItem("lc_timer_" + key, targetTime);

      function tick(){

        const now = Date.now();
        const remaining = targetTime - now;

        if(remaining <= 0){
        localStorage.removeItem("lc_timer_" + key);
        delete timers[key];

        // 💣 VALIDACIÓN GLOBAL ANTES DE EJECUTAR
        if(key === "bridge-main"){

          // 🚫 no correr si tab oculta
          if(document.hidden){
            console.log("😴 skip scheduled (tab hidden)");
            return;
          }

          // 🚫 no correr si no toca aún
          if(!LaunchCore.timing.shouldRun()){
            console.log("😴 skip scheduled (too early)");
            return;
          }

          // 🚫 no correr si evento cerrado
          if(LaunchCore.state?.eventoCerrado){
            console.log("🚫 skip scheduled (evento cerrado)");
            return;
          }

        }

        fn();
        return;
      }

        const nextDelay = Math.min(remaining, MAX_DELAY);

        timers[key] = setTimeout(tick, nextDelay);
      }

      // 🔥 limpiar timer previo
      if(timers[key]){
        clearTimeout(timers[key]);
      }

      tick();
    }

    // 🔥 NUEVO: cancelar timer
    function cancelar(key){

      if(timers[key]){
        clearTimeout(timers[key]);
        delete timers[key];
      }

      localStorage.removeItem("lc_timer_" + key);

      console.log("🧨 Scheduler cancelado:", key);
    }

    return {
      programar,
      cancelar // 👈 CLAVE
    };

  })();



  /* =====================================================
    GLOBAL TIMING ENGINE (SINGLE SOURCE OF TRUTH)
  ===================================================== */

  LaunchCore.timing.shouldRun = function(){

    const next = Number(localStorage.getItem("lc_timer_core-main") || 0);

    if(!next){
      console.log("⏳ no hay timer");
      return true; // importante 👀
    }

    const now = Date.now();

    console.log("🧠 shouldRun?", {
      now,
      next,
      diff: next - now
    });

    return now >= next;
  };



  /* =====================================================
    VISIBILITY CONTROL (GLOBAL)
  ===================================================== */

  LaunchCore.visibility = (function(){

    let initialized = false;
    let callbacks = [];     // 🔥 FALTABA
    let lastCheck = 0;      // 🔥 FALTABA
    let minInterval = 30000; // 🔥 default (30s)


    function init(fn, interval){

      if(!initialized){

        document.addEventListener("visibilitychange", () => {

          if(document.hidden) return;

          const now = Date.now();

          if(now - lastCheck < minInterval){
            return;
          }

          callbacks.forEach(cb => cb());

          lastCheck = now;

        });

        initialized = true;
      }

      callbacks.push(fn);

      if(interval){
        minInterval = interval;
      }
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
    NORMALIZADOR
===================================================== */

/* =====================================================
   DATA NORMALIZER (CORE MANDA)
===================================================== */

LaunchCore.normalize = function(raw){

  const page = LaunchCore.config.page;

  if(!raw) return null;

  // 🔥 separar control global (CORE lo usa)
  const control = {
    siguienteActualizacionMs: raw.siguienteActualizacionMs
  };

  let data = {};

  switch(page){

    case "bridge":
      data = raw.evento || {};
      delete data.siguienteActualizacionMs; // por si viene duplicado
      break;

    case "captura":
      data = raw.captura || {};
      break;

    case "pricing":
      data = raw.pricing || {};
      break;

    default:
      console.warn("⚠️ Página no reconocida en normalizer:", page);
      data = {};
  }

  return {
    data,     // 👉 lo que usa la página
    control   // 👉 lo que usa la CORE
  };

};



/* =====================================================
    ESTADO DEL LANZAMIENTO (luego)
===================================================== */

/*LaunchCore.globalState = {
  eventoCerrado: raw.evento?.eventoCerrado || false,
  pricingEstado: raw.pricing?.estado || "unknown"
};*/



/* =====================================================
    RENDER MACHINE
===================================================== */

LaunchCore.render = async function(data){

  const page = LaunchCore.config.page;
  const module = LaunchCore.modules[page];

  if(!module){
    console.warn("No hay módulo para render:", page);
    return;
  }

  await module.render(data);

};



/* =====================================================
    GLOBAL EXECUTION ENGINE
===================================================== */

LaunchCore.run = async function(options = {}, source = "unknown") {

  console.log("🧠 RUN llamado");

  const {
    force = false,
    forceFetch = false
  } = options;

  console.log("🧠 RUN origen:", {
    source,
    ...options,
    time: Date.now()
  });

  const now = Date.now();

  const THROTTLE_TIME = 2000; // o lo que quieras

  if(!force && now - lastRunTime < THROTTLE_TIME){
    console.log("⛔ run throttle");
    return;
  }

  if(isRunning){
    console.log("⛔ run bloqueado (ya en ejecución)");
    return;
  }

  lastRunTime = now;
  isRunning = true;

  try {

    console.log("🚀 CORE fetching...");

    if(force){
      LaunchCore.timing.force();
    }

    const cached = localStorage.getItem("lc_data");

    if(cached){

      console.log("⚡ usando cache");

      const raw = JSON.parse(cached);

      const { data, control } = LaunchCore.normalize(raw);

      await LaunchCore.render(data);

      if(control?.siguienteActualizacionMs){
        console.log("🧠 scheduling desde cache...");

        LaunchCore.scheduler.programar(
          "core-main",
          () => LaunchCore.execute("scheduler"),
          control.siguienteActualizacionMs
        );
      }
    }

    if(!force && !LaunchCore.timing.shouldRun()){
      console.log("⏸ usando cache, no fetch");
      isRunning = false;
      return;
    }

    const raw = await LaunchCore.fetchWorker(
      LaunchCore.config.endpoint,
      forceFetch
    );

    if(!raw){
      console.warn("Sin data");
      return;
    }

    localStorage.setItem("lc_data", JSON.stringify(raw));

    // 🔥 NORMALIZAR
    const { data, control } = LaunchCore.normalize(raw);

    // 👉 render SOLO data limpia
    await LaunchCore.render(data);

    // 🧠 PROGRAMACIÓN CENTRALIZADA
    if(control?.siguienteActualizacionMs){

      let delay = control.siguienteActualizacionMs;

      // pequeño jitter para evitar sincronización masiva
      delay += Math.random() * 2000;

      // protección mínima
      delay = Math.max(delay, 5000);

      console.log("🧠 CORE scheduling in", delay);

      LaunchCore.scheduler.programar(
        "core-main",
        () => LaunchCore.execute("scheduler"),
        delay
      );

    } else {
      console.log("⛔ CORE: sin siguienteActualizacionMs");
    }

  } catch(e){
    console.error("❌ error en run:", e);
  }

  isRunning = false;
}


/* =====================================================
    EXECUTION SOURCE
===================================================== */

LaunchCore.execute = function(source = "unknown", options = {}){

  console.log("🧠 EXECUTE desde:", source);

  return LaunchCore.run(options, source);
};


/* =====================================================
    EVENT HANDLERS
===================================================== */

LaunchCore.on("data:update", () => {

  console.log("🧠 CORE: data update recibido");

  LaunchCore.timing.force();

  LaunchCore.execute("vc-data", {
    force: true,
    forceFetch: true
  });

});


LaunchCore.on("code:update", () => {

  console.log("🧠 CORE: code update recibido");

  location.reload();

});



/* =====================================================
   MODULE REGISTRY (AUTO INIT)
===================================================== */

LaunchCore.modules = {};


LaunchCore.register = function(name, fn){
  LaunchCore.modules[name] = fn;
};



/* =====================================================
   ORQUESTADOR (INIT)
===================================================== */

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
  
  /* =====================================================
    ENDPOINT POR PÁGINA
  ===================================================== */

  const endpointMap = {
    bridge: "/",
    capture: "/captura",
    pricing: "/pricing"
  };

  LaunchCore.config.endpoint = endpointMap[page] || "";
  console.log("🧠 endpoint seteado:", LaunchCore.config.endpoint);

  const base = LaunchCore.paths.projects + `${project}/${product}/`;

  const moduleUrl = base + page + "-module.js";

  try{

    LaunchCore.timing.initFromStorage();

    // 🔥 cargar CSS globales base
    await LaunchCore.globals.flag();

    // 🔥 cargar módulo dinámicamente
    await LaunchCore.loadScript(moduleUrl);
    
    const module = LaunchCore.modules[page];

    if(!module){
      console.warn("Módulo no registrado:", page);
      return;
    }

    if(module.init){
      await module.init();
    }

    // 🧠 VISIBILITY GLOBAL (CORE MANDA)
    LaunchCore.visibility.init(() => {

      console.log("👁️ CORE visibility wake");

      if(!LaunchCore.timing.shouldRun()){
        console.log("😴 visibility CORE skip (too early)");
        return;
      }

      LaunchCore.execute("visibility");

    }, 2000); // 🧠 Qué hace esto:
    // 👉 Cuando el usuario vuelve: Espera mínimo X segundos desde último check
    // Pregunta: shouldRun() Si toca → ejecuta

    await LaunchCore.use("versionChecker");
    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // 🚀 PRIMER DISPARO (BOOTSTRAP)
    console.log("🚀 CORE initial run");

    LaunchCore.execute("init", {
      force: false
    });

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

  const vCheckPath = "modules/version-checker/version-checker";

  const url = LaunchCore.paths.base + vCheckPath + ".js"
  
  const { project, product } = LaunchCore.config;

  const dataVersionUrl = LaunchCore.paths.projects +
  `${project}/${product}/launch-version.json`;

  await LaunchCore.loadScript(url);

  window.initVersionChecker({
    versionUrl: dataVersionUrl, // worker data version
    codeVersionUrl: LaunchCore.paths.base + "version.json", // versión de código estático de Github
    workerUrl: "https://launch-engine.miroslaw-mm.workers.dev",
    checkInterval: 1*60*1000, // PRODUCCIÓN 15*60*1000 o incluso 60*60*1000,
    confirmDelay: 1*60*1000, // PRODUCCIÓN 3 * 60 * 1000,
    autoReload: true
  });

};


LaunchCore.globals.flag = async function(){

  await LaunchCore.loadCSS(
    LaunchCore.paths.components + "flag.css"
  );

};



/* =====================================================
   VERSION IN URL
===================================================== */

document.addEventListener("click", function(e){

  const a = e.target.closest("a");
  if(!a) return;

  // 🔥 respetar comportamiento usuario (ctrl click etc)
  if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

  const href = a.getAttribute("href");
  if(!href || href.startsWith("#")) return;

  const url = new URL(a.href, window.location.origin);

  if(url.origin !== window.location.origin) return;

  if(url.searchParams.has("v")) return;

  const currentParams = new URLSearchParams(window.location.search);
  const v = currentParams.get("v");

  if(v){
    url.searchParams.set("v", v);

    e.preventDefault();

    // 🔥 HEREDAR target
    if(a.target === "_blank"){
      window.open(url.toString(), "_blank");
    } else {
      window.location.href = url.toString();
    }
  }

});