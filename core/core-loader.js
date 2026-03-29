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

let isRunning = false;
let cacheInvalidated = false;

LaunchCore.events = {};


/* =====================================================
   STORAGE LAYER PRO (WITH SOURCE TRACKING)
===================================================== */

LaunchCore.storage = {

  get(key, options = {}){

    const { parse = false, source = "unknown" } = options;

    const value = localStorage.getItem(key);

    console.log("📥 STORAGE GET:", {
      key,
      value,
      source
    });

    if(parse && value){
      try{
        return JSON.parse(value);
      }catch(e){
        console.warn("❌ STORAGE PARSE ERROR:", key);
        return null;
      }
    }

    return value;
  },

  set(key, value, options = {}){

    const { stringify = false, source = "unknown" } = options;

    let finalValue = value;

    if(stringify){
      try{
        finalValue = JSON.stringify(value);
      }catch(e){
        console.warn("❌ STORAGE STRINGIFY ERROR:", key);
        return;
      }
    }

    localStorage.setItem(key, finalValue);

    console.log("💾 STORAGE SET:", {
      key,
      value: finalValue,
      source
    });

  },

  remove(key, options = {}){

    const { source = "unknown" } = options;

    localStorage.removeItem(key);

    console.log("🗑️ STORAGE REMOVE:", {
      key,
      source
    });

  }

};


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

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    let attempt = 0;

    while(attempt < MAX_RETRIES){

      try{

        let query = window.location.search;

        let url = BASE_WORKER_URL.replace(/\/$/, "") +
                  endpoint +
                  query;

        if(force){
          url += (url.includes("?") ? "&" : "?") + "_=" + Date.now();
        }

        console.log(`🌐 FETCH intento ${attempt + 1}:`, url);

        const options = force
          ? { cache: "no-store" }
          : {};

        const res = await fetch(url, options);

        if(!res.ok){
          throw new Error("HTTP " + res.status);
        }

        const data = await res.json();

        return data;

      }catch(e){

        console.warn(`⚠️ fetch intento ${attempt + 1} falló`, e);

        attempt++;

        if(attempt >= MAX_RETRIES){
          console.error("💀 fetch falló definitivamente");
          return null;
        }

        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }

    }

  };

  /* =====================================================
    SCHEDULER (REPROGRAMACIÓN)
  ===================================================== */

  LaunchCore.scheduler = (function(){

    let timers = {};

    function programar(key, fn, delay, options = {}){

      const { ignoreClosed = false } = options;

      cancelar(key); // 🔥 SIEMPRE limpiar antes

      if(!key){
        console.warn("Scheduler requiere key");
        return;
      }

      const MAX_DELAY = 2147483647;

      const targetTime = Date.now() + delay;

      function tick(){

        const now = Date.now();
        const remaining = targetTime - now;

        if(remaining <= 0){
          
          delete timers[key];

          // 🚫 no correr si tab oculta
          if(document.hidden){
            console.log("😴 skip scheduled (tab hidden)");
            return;
          }

          // 🚫 no correr si evento cerrado EXCEPTO VC que puede reabrir
          if(LaunchCore.state?.eventoCerrado && !ignoreClosed){
            console.log("🚫 skip scheduled (evento cerrado)");
            return;
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

      console.log("🧨 Scheduler cancelado:", key);
    }

    return {
      programar,
      cancelar // 👈 CLAVE
    };

  })();



  /* =====================================================
    VISIBILITY CONTROL (GLOBAL)
  ===================================================== */

  LaunchCore.visibility = (function(){

    let initialized = false;
    let callbacks = [];     // 🔥 FALTABA
    let lastCheck = 0;      // 🔥 FALTABA
    let minInterval = 2000; // 🔥 default (30s)


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
   DATA NORMALIZER (CORE MANDA)
===================================================== */

LaunchCore.normalize = function(raw){

  const page = LaunchCore.config.page;

  if(!raw) return null;

  const control = {
    siguienteActualizacionMs: raw.siguienteActualizacionMs,
    version: raw?.status?.version // 🔥 NUEVO
  };

  let data = {};

  switch(page){

    case "bridge":
      data = raw.evento || {};
      break;

    case "captura":
      data = raw.captura || {};
      break;

    case "pricing":
      data = raw.pricing || {};
      break;

    case "status": // 😏 opcional
      data = raw.status || {};
      break;

    default:
      console.warn("⚠️ Página no reconocida en normalizer:", page);
      data = {};
  }

  return {
    data,
    control
  };

};



/* =====================================================
    SMART VERSION CHECK
===================================================== */

LaunchCore.smartCheckNow = function(){

  console.log("🧠 smart check → ping VC");

  if(window.__vcCheckNow){
    window.__vcCheckNow();
  }

};



/* =====================================================
    CONFIRMAR VERSION DEL WORKER
===================================================== */

LaunchCore.getWorkerVersion = async function(){

  const res = await LaunchCore.fetchWorker(
    LaunchCore.config.endpoint,
    true
  );

  const normalized = LaunchCore.normalize(res);

  return {
    version: normalized?.control?.version,
    raw: res,                // 🔥 ORO: ya tienes la data
    normalized              // 🔥 doble oro
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
    ENGINE STATE (FUENTE DE VERDAD DEL FRONT)
===================================================== */

LaunchCore.buildEngineState = function(state){

  const now = Date.now();

  LaunchCore.engineState = {
    hasCache: !!state.cached,
    hasNextUpdate: !!state.nextUpdate,
    isExpired: now >= state.nextUpdate,
    hasPendingVersion: !!LaunchCore.storage.get("lc_pending_version", {source: "buildEngineState:hasPendingVersion"}),
    isClosed: LaunchCore.state?.eventoCerrado || false
  };

};



/* =====================================================
    CORE STATE READER
===================================================== */

LaunchCore.readCacheState = function(){

  const cached = LaunchCore.storage.get("lc_data", {source: "readCacheState:cached"});

  return {
    cached,
    nextUpdate: Number(LaunchCore.storage.get("lc_next_update", {source: "readCacheState:nextUpdate"}) || 0),
    cachedVersion: LaunchCore.storage.get("lc_data_version", {source: "readCacheState:cachedVersion"}),
    now: Date.now()
  };

};


/* =====================================================
    CACHE RENDER ENGINE
===================================================== */

LaunchCore.renderFromCache = async function(rawCached){

  const { data, control } = LaunchCore.normalize(rawCached);

  await LaunchCore.render(data);

  return control;

};


/* =====================================================
    NEXT UPDATE SCHEDULER
===================================================== */

LaunchCore.scheduleNext = function(nextTime){

  const now = Date.now();

  let delay = nextTime - now;

  if(delay > 0 && !isNaN(delay)){

    const safeDelay = Math.max(delay, 5000);

    LaunchCore.scheduler.programar(
      "core-main",
      () => LaunchCore.execute("scheduler"),
      safeDelay
    );

  }

};


/* =====================================================
    DATA COMMIT
===================================================== */

LaunchCore.commitData = function(raw){

  if(!raw){
    console.warn("❌ intentando guardar raw null → abort");
    return;
  }

  const normalized = LaunchCore.normalize(raw);

  if(!normalized){
    console.warn("⚠️ normalize devolvió null en commit");
    return;
  }

  const { data } = normalized;

  if(data?.eventoCerrado !== undefined){
    LaunchCore.state.eventoCerrado = data.eventoCerrado;
  }

  if(raw?.siguienteActualizacionMs){

    const delay = Number(raw.siguienteActualizacionMs);
    const nextTime = Date.now() + delay;

    LaunchCore.storage.set("lc_next_update", nextTime, {source: "commitData"});

  }

  LaunchCore.storage.set("lc_data", raw, {stringify: true, source: "commitData"});

  const { control } = LaunchCore.normalize(raw);

  if(control?.version){
    LaunchCore.storage.set("lc_data_version", String(control.version), {source: "commitData"});
  }

};


/* =====================================================
    DECISION ENGINE
===================================================== */

LaunchCore.decide = function(state, options){

  const es = LaunchCore.engineState;

  if(options.externalData){
    return "EXTERNAL";
  }

  // 🧠 🔥 NUEVO: ESTADO FINAL
  if(es.isClosed){
    return "CACHE";
  }

  if(!es.hasCache){
    return "FETCH";
  }

  if(!es.hasNextUpdate){
    return "FETCH";
  }

  if(es.isExpired){
    return "FETCH";
  }

  return "CACHE";

};



/* =====================================================
    GLOBAL EXECUTION ENGINE
===================================================== */

LaunchCore.run = async function(options = {}, source = "unknown") {

  if(isRunning) return;
  isRunning = true;

  try {

    // 1. LEER ESTADO BASE
    const state = LaunchCore.readCacheState();

    // 🔥 SI HAY CACHE → sincronizar estado ANTES de decidir
    if(state.cached){
      try{
        const raw = JSON.parse(state.cached);
        const normalized = LaunchCore.normalize(raw);

        if(normalized?.data?.eventoCerrado !== undefined){
          LaunchCore.state.eventoCerrado = normalized.data.eventoCerrado;
        }

      }catch(e){
        console.warn("❌ error pre-sync cache");
      }
    }

    // 2. CONSTRUIR ESTADO REAL
    LaunchCore.buildEngineState(state);

    console.log("🧠 DEBUG STATE:", {
      cached: !!state.cached,
      eventoCerrado: LaunchCore.state.eventoCerrado,
      nextUpdate: state.nextUpdate
    });

    // 3. DECIDIR QUÉ HACER
    const decision = LaunchCore.decide(state, options);

    let raw = null;
    let nextUpdate = state.nextUpdate;

    console.log("🎯 DECISION:", decision);

    /* =========================================
       CACHE FLOW
    ========================================= */

    if(decision === "CACHE"){

    if(!state.cached){
      console.warn("⚠️ cache vacío, forzando fetch");
      isRunning = false;
      return LaunchCore.execute("cache-miss", { forceFetch: true });
    }

    let raw;

    try{
      raw = JSON.parse(state.cached);
    }catch(e){
      console.warn("❌ cache corrupto");
      isRunning = false;
      return LaunchCore.execute("cache-corrupt", { forceFetch: true });
    }

    if(!raw){
      console.warn("⚠️ cache null, forzando fetch");
      isRunning = false;
      return LaunchCore.execute("cache-null", { forceFetch: true });
    }

    // 🔥 AHORA SÍ normalizamos (ya existe raw)
    const normalized = LaunchCore.normalize(raw);

    if(!normalized){
      console.warn("⚠️ normalize devolvió null, run.cache");
      isRunning = false;
      return;
    }

    const { data } = normalized;

    // 🔥 sincronizar estado REAL del backend
    if(data?.eventoCerrado !== undefined){
      LaunchCore.state.eventoCerrado = data.eventoCerrado;
    }

    await LaunchCore.renderFromCache(raw);

    LaunchCore.scheduleNext(state.nextUpdate);

    isRunning = false;
    return;
  }

    /* =========================================
       EXTERNAL FLOW (VC)
    ========================================= */

    if(decision === "EXTERNAL"){

      raw = options.externalData;

    } else {

      /* =========================================
         FETCH FLOW
      ========================================= */

      raw = await LaunchCore.fetchWorker(
        LaunchCore.config.endpoint,
        options.forceFetch
      );

    }

    if(!raw){
      console.warn("⚠️ sin data (ni cache ni fetch)");
      return;
    }

    /* =========================================
       COMMIT (FUENTE DE VERDAD)
    ========================================= */

    LaunchCore.commitData(raw);

    const updatedState = LaunchCore.readCacheState();

    nextUpdate = updatedState.nextUpdate;

    /* =========================================
       RENDER
    ========================================= */

    const normalized = LaunchCore.normalize(raw);

    if(!normalized){
      console.warn("⚠️ normalize devolvió null, run:render");
      isRunning = false;
      return;
    }

    const { data } = normalized;

    // 🔥 SINCRONIZAR ESTADO GLOBAL
    if(data?.eventoCerrado !== undefined){
      LaunchCore.state.eventoCerrado = data.eventoCerrado;
    }

    await LaunchCore.render(data);

    /* =========================================
       SCHEDULE
    ========================================= */

    LaunchCore.scheduleNext(nextUpdate);

  } catch(e){
    console.error("❌ error en run:", e);
  }

  isRunning = false;

};



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

LaunchCore.on("data:detected", ({ version, confirmDelay }) => {

  console.log("🧠 CORE: cambio detectado", version);

  // 1. guardar versión pendiente
  LaunchCore.storage.set("lc_pending_version", version, {source: "data:detected"});

  // 2. cancelar confirmaciones anteriores
  LaunchCore.scheduler.cancelar("vc-confirm");

  const currentVersion = Number(
    LaunchCore.storage.get("lc_data_version", {source: "data:detected"}) || 0
  );

  const now = Date.now();
  const margin = 5 * 60 * 1000;

  let delay;

  if(now > currentVersion + margin){
    console.log("🚀 confirm inmediato (versión vieja)");
    delay = 0;
  } else {
    delay = confirmDelay || 60000;
  }

  const nextConfirm = Date.now() + delay;
  LaunchCore.storage.set("vc_next_confirm", nextConfirm, {source: "data:detected"});

  console.log("⏳ confirm en", delay);

  // 3. programar confirmación
  LaunchCore.scheduler.programar(
    "vc-confirm",
    async () => {

      console.log("🧠 CORE: confirmando contra WORKER...");

      const pending = LaunchCore.storage.get("lc_pending_version", {source: "data:detected"});
      if(!pending) return;

      const result = await LaunchCore.getWorkerVersion();

      const workerVersion = result?.version;

      console.log("🛰️ worker version:", workerVersion);

      if(String(workerVersion) === String(pending)){

        console.log("✅ DATA CONFIRMADA");

        // limpiar pendientes
        LaunchCore.storage.remove("lc_pending_version", {source: "data:detected confirmed"});
        LaunchCore.storage.remove("vc_last_detected", {source: "data:detected confirmed"});
        LaunchCore.storage.remove("vc_next_confirm", {source: "data:detected confirmed"});


        // 🔥 USAR TU INFRAESTRUCTURA
        LaunchCore.commitData(result.raw);

        // 🔥 ejecutar con external (sin fetch)
        LaunchCore.execute("vc-confirm", {
          externalData: result.raw
        });

      } else {

        console.log("⌛ worker aún no actualizado");

      }

    },
    delay,
    { ignoreClosed: true } // 🔥 CLAVE
  );

});


LaunchCore.on("code:update", async () => {

  console.log("💥 CORE: CODE UPDATE DETECTADO");

  try {

    if(!LaunchCore.config.codeVersionUrl){
      console.warn("⚠️ codeVersionUrl no definido");
      return;
    }

    const res = await fetch(LaunchCore.config.codeVersionUrl, {
      cache: "no-store"
    });

    const data = await res.json();
    const newVersion = String(data.commit);

    const currentVersion = LaunchCore.storage.get("lc_code_version", {source: "code:update"});

    console.log("💾 local code:", currentVersion);
    console.log("🌐 github code:", newVersion);

    // 🧠 MISMA VERSIÓN → NO HACER NADA
    if(currentVersion === newVersion){
      console.log("😴 misma versión, no reload");
      return;
    }

    // 🔥 guardar nueva versión
    LaunchCore.storage.set("lc_code_version", newVersion, {source: "code:update"});

    // 🔥 delegar reload
    LaunchCore.reloadWithVersion();

  } catch(e){
    console.warn("❌ error en code:update", e);
  }

});

    /* =====================================================
       🔥 URL VERSIONADA HUMANA (TU JOYA)
    ===================================================== */

LaunchCore.reloadWithVersion = function(){

  function fechaHumana(){
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");

    return (
      d.getFullYear() +
      pad(d.getMonth()+1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes())
    );
  }

  const url =
    location.origin +
    location.pathname +
    "?v=" + fechaHumana();

  console.log("🚀 recargando con nueva versión...");

  window.location.replace(url);

};



/* =====================================================
   RECOVER PENDING CONFIRM
===================================================== */

LaunchCore.recoverPendingConfirm = function(){

  const savedConfirm = Number(LaunchCore.storage.get("vc_next_confirm", {source: "recoverPendingConfirm"}) || 0);

  if(!savedConfirm || savedConfirm <= Date.now()){
    return;
  }

  const delay = savedConfirm - Date.now();

  console.log("⏳ retomando confirm en", delay);

  LaunchCore.scheduler.programar(
    "vc-confirm",
    async () => {

      const pending = LaunchCore.storage.get("lc_pending_version", {source: "recoverPendingConfirm"});
      if(!pending) return;

      const result = await LaunchCore.getWorkerVersion();

      if(String(result?.version) === String(pending)){

        console.log("✅ DATA CONFIRMADA (recovery)");

        LaunchCore.storage.remove("lc_pending_version", {source: "recoverPendingConfirm"});

        // 🔥 USAR INFRAESTRUCTURA MODERNA
        LaunchCore.commitData(result.raw);

        LaunchCore.execute("vc-recovery", {
          externalData: result.raw
        });

      }

    },
    delay,
    { ignoreClosed: true } // 🔥 CLAVE
  );

};



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
    console.error("LaunchCore: Falta #launch-engine-root");
    return;
  }

  // CONFIG
  LaunchCore.config.project = root.dataset.project;
  LaunchCore.config.product = root.dataset.product;
  LaunchCore.config.page = root.dataset.page;

  if(!LaunchCore.config.project || !LaunchCore.config.product || !LaunchCore.config.page){
    console.error("LaunchCore: Faltan atributos data-*");
    return;
  }

  const { project, product, page } = LaunchCore.config;

  LaunchCore.config.endpoint = "/";

  const base = LaunchCore.paths.projects + `${project}/${product}/`;
  const moduleUrl = base + page + "-module.js";

  try{

    // GLOBALS
    await LaunchCore.globals.flag();

    // MODULE
    await LaunchCore.loadScript(moduleUrl);

    const module = LaunchCore.modules[page];

    if(!module){
      console.warn("Módulo no registrado:", page);
      return;
    }

    if(module.init){
      await module.init();
    }

    // VISIBILITY
    LaunchCore.visibility.init(() => {
      console.log("👁️ visibility → smart check");
      LaunchCore.smartCheckNow();
    });

    // 🔥 RECOVERY LIMPIO
    LaunchCore.recoverPendingConfirm();

    // VERSION CHECKER
    await LaunchCore.use("versionChecker");

    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // 🚀 PRIMER RUN
    LaunchCore.execute("init", {
      force: false
    });
    LaunchCore.smartCheckNow();

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

  const codeVersionUrl = LaunchCore.paths.base + "version.json";

  // 💥 HACERLO GLOBAL
  LaunchCore.config.codeVersionUrl = codeVersionUrl;

  window.initVersionChecker({
    versionUrl: dataVersionUrl, // worker data version
    codeVersionUrl, // versión de código estático de Github
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