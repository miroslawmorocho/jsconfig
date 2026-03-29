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
   2. CORE UTILS (storage, helpers, fetch, scheduler)
===================================================== */

// ===== STORAGE LAYER PRO (WITH SOURCE TRACKING) =====
LaunchCore.storage = {

  get(key, options = {}){

    const { parse = false, source = "unknown" } = options;

    const value = localStorage.getItem(key);

    /*console.log("📥 STORAGE GET:", {
      key,
      value,
      source
    });*/

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

    /*console.log("💾 STORAGE SET:", {
      key,
      value: finalValue,
      source
    });*/

  },

  remove(key, options = {}){

    const { source = "unknown" } = options;

    localStorage.removeItem(key);

    /*console.log("🗑️ STORAGE REMOVE:", {
      key,
      source
    });*/

  }

};



(function(){

  const BASE_WORKER_URL = "https://launch-engine.miroslaw-mm.workers.dev";
  
  // ===============  EVENT BUS ==========================
  
  LaunchCore.on = function(event, fn){
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  };


  LaunchCore.emit = function(event, data){
    (this.events[event] || []).forEach(fn => fn(data));
  };


  
  // ===========  CORE GLOBAL ============================
  
  LaunchCore.globals = LaunchCore.globals || {};



  // ============  CARGAR JS ===============

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



  // ============  CARGAR CSS ===============

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


  
  // ============  FETCH WORKER (UNIFICADO) ===============
  
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

  

  // ===========  SCHEDULER (REPROGRAMACIÓN) =============
  
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

          fn();
          return;
        }

        if(document.hidden && !options.allowHidden){
          console.log("😴 skip scheduled (tab hidden)");
          
          // 🔥 REPROGRAMAR
          timers[key] = setTimeout(tick, 5000);
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


  
  // =========  VISIBILITY CONTROL (GLOBAL) ==============
  
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

  

  // =============  COUNTDOWN (GLOBAL) ===================
  
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



  // ===== READY (espera a que responda el worker y carga el div
  // donde se inyecta la tabla de precios de pricing) ==========
  
  LaunchCore.onReady = function(fn){

    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", fn);
    }else{
      fn();
    }

  };

})();



/* =====================================================
   3. CORE ENGINE (normalize, commit, decision, run)
===================================================== */

// =========== CONTENEDOR DE FASES ===================

LaunchCore.phase = {};



// ================ FASE DE DECISIÓN ======================

LaunchCore.phase.decide = function(ctx, options){

  const decision = LaunchCore.decide(ctx.state, options);

  console.log("🎯 DECISION:", decision);

  if(decision === "FETCH"){
    LaunchCore.setState("UPDATING");
  }

  ctx.decision = decision;
};



// ================== FASE DE EJECUCIÓN ===================

LaunchCore.phase.execute = async function(ctx, options){

  const result = await LaunchCore.executeFlow(
    ctx.decision,
    ctx.state,
    options
  );

  if(!result || !result.raw){
    console.warn("⚠️ sin resultado");
    return;
  }

  ctx.result = result;
};



// ============ FASE NORMALIZACIÓN =====================

LaunchCore.phase.process = function(ctx){

  const normalized = LaunchCore.normalize(ctx.result.raw);

  if(!normalized){
    console.warn("⚠️ normalize devolvió null");
    return;
  }

  const { data } = normalized;

  if(data?.eventoCerrado !== undefined){
    LaunchCore.state.eventoCerrado = data.eventoCerrado;

    if(data.eventoCerrado === true){
      LaunchCore.setState("CLOSED");
    }
  }

  ctx.data = data;
};



// ============ FASE DE RENDERIZACIÓN ==================

LaunchCore.phase.render = async function(ctx){

  // 🔥 evitar doble render innecesario
  if(ctx.bootstrapped && ctx.decision === "CACHE"){
    console.log("⏭ skip render (ya bootstrap)");
    return;
  }

  await LaunchCore.render(ctx.data);

  if(LaunchCore.machine.state !== "CLOSED"){
    LaunchCore.setState("READY");
  }

};



// ========= FASE DE PROGRAMACIÓN (SCHEDULE) ===========

LaunchCore.phase.schedule = function(ctx){

  LaunchCore.scheduleNext(ctx.result.nextUpdate);

};



// =========== FASE DE RENDER INMEDIATO DESDE CACHÉ ===========

LaunchCore.phase.bootstrap = async function(ctx){

  const state = ctx.state;

  if(!state.cached) return;

  try{

    const raw = JSON.parse(state.cached);
    const { data } = LaunchCore.normalize(raw);

    await LaunchCore.render(data);

    ctx.bootstrapped = true;

    console.log("⚡ bootstrap → render desde cache");

  }catch(e){
    console.warn("❌ bootstrap error");
  }

};



// ======== FASE DE SINCRONIZACIÓN (NO HAY CACHÉ) ==========

LaunchCore.phase.sync = function(ctx){

  const state = ctx.state;

  if(!state.cached) return;

  try{

    const raw = JSON.parse(state.cached);
    const normalized = LaunchCore.normalize(raw);

    if(normalized?.data?.eventoCerrado !== undefined){
      LaunchCore.state.eventoCerrado = normalized.data.eventoCerrado;
    }

    console.log("🔄 sync estado desde cache");

  }catch(e){
    console.warn("❌ error en phase.sync");
  }

};



// ========= FASE DE CONSTRUCCIÓN DEL ESTADO ===========

LaunchCore.phase.buildEngineState = function(ctx){
  LaunchCore.buildEngineState(ctx.state);
};



// =========   DATA NORMALIZER (CORE MANDA) ============

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



// ===============  DATA COMMIT ========================

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

  console.log("📦 siguienteActualizacionMs:", raw?.siguienteActualizacionMs, data?.siguienteActualizacionMs);

  if(data?.eventoCerrado !== undefined){
    LaunchCore.state.eventoCerrado = data.eventoCerrado;
  }

  if(raw?.siguienteActualizacionMs !== undefined){

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



// =============== CORE STATE READER ===================

LaunchCore.readCacheState = function(){

  const cached = LaunchCore.storage.get("lc_data", {source: "readCacheState:cached"});

  return {
    cached,
    nextUpdate: Number(LaunchCore.storage.get("lc_next_update", {source: "readCacheState:nextUpdate"}) || 0),
    cachedVersion: LaunchCore.storage.get("lc_data_version", {source: "readCacheState:cachedVersion"}),
    now: Date.now()
  };

};



// =========  ENGINE STATE (FUENTE DE VERDAD DEL FRONT) ===========

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



// ==============  DECISION ENGINE =====================

LaunchCore.decide = function(state, options){

  const es = LaunchCore.engineState;

  if(options.externalData){
    return "EXTERNAL";
  }

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



// ================  EXECUTION FLOW ====================

LaunchCore.executeFlow = async function(decision, state, options){

  let raw = null;

  switch(decision){

    case "CACHE": {

      const parsed = JSON.parse(state.cached);

      await LaunchCore.renderFromCache(parsed);

      return {
        nextUpdate: state.nextUpdate,
        raw: parsed
      };
    }

    case "FETCH": {

      raw = await LaunchCore.fetchWorker(
        LaunchCore.config.endpoint,
        options.forceFetch
      );

      if(!raw) throw new Error("FETCH_FAILED");

      LaunchCore.commitData(raw);

      return {
        raw,
        nextUpdate: LaunchCore.readCacheState().nextUpdate
      };
    }

    case "EXTERNAL": {

      raw = options.externalData;

      LaunchCore.commitData(raw);

      return {
        raw,
        nextUpdate: LaunchCore.readCacheState().nextUpdate
      };
    }

  }

};



// ============  GLOBAL EXECUTION ENGINE ================

LaunchCore.run = async function(options = {}, source = "unknown") {

  if(isRunning) return;
  isRunning = true;

  try {

    // 🔥 INPUT (FASE 0 realmente)
    const state = LaunchCore.readCacheState();

    // 🔥 CONTEXTO GLOBAL DEL PIPELINE
    const ctx = { state };

    // 🔥 FASES
    await LaunchCore.phase.bootstrap(ctx);

    LaunchCore.phase.sync(ctx);

    LaunchCore.phase.buildEngineState(ctx);

    LaunchCore.phase.decide(ctx, options);

    await LaunchCore.phase.execute(ctx, options);

    if(!ctx.result) return;

    LaunchCore.phase.process(ctx);

    await LaunchCore.phase.render(ctx);

    LaunchCore.phase.schedule(ctx);

  } catch(e){

    console.error("❌ error en run:", e);

    if(e.message === "FETCH_FAILED"){
      console.warn("🔁 reintentando con forceFetch");
      return LaunchCore.execute("retry-fetch", { forceFetch: true });
    }

  }

  isRunning = false;

};



/* =====================================================
   4. CORE HELP FUNCTIONS
===================================================== */

// ==============  NEXT UPDATE SCHEDULER ===============

LaunchCore.scheduleNext = function(nextTime){

  const now = Date.now();

  let delay = nextTime - now;

  if(delay <= 0 || isNaN(delay)){
    console.warn("💀 INVALID DELAY → NO SCHEDULE", delay);
  }

  if(delay > 0 && !isNaN(delay)){

    const safeDelay = Math.max(delay, 5000);

    console.log("🧪 scheduleNext debug:", {
      nextTime,
      now,
      delay,
      safeDelay
    });

    LaunchCore.scheduler.programar(
      "core-main",
      () => LaunchCore.execute("scheduleNext"),
      safeDelay
    );

  }

};



// ================   EXECUTION SOURCE ==================

LaunchCore.execute = function(source = "unknown", options = {}){

  console.log("🧠 EXECUTE desde:", source);

  return LaunchCore.run(options, source);
};



// ============  SMART VERSION CHECK ===================

LaunchCore.smartCheckNow = function(){

  console.log("🧠 smart check → ping VC");

  if(window.__vcCheckNow){
    window.__vcCheckNow();
  }

};



// =============  CONFIRMAR VERSION DEL WORKER ================

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



// ==========  RENDER MACHINE ==================

LaunchCore.render = async function(data){

  const page = LaunchCore.config.page;
  const module = LaunchCore.modules[page];

  if(!module){
    console.warn("No hay módulo para render:", page);
    return;
  }

  await module.render(data);

};



// ============ CACHE RENDER ENGINE ===============

LaunchCore.renderFromCache = async function(rawCached){

  const { data, control } = LaunchCore.normalize(rawCached);

  await LaunchCore.render(data);

  return control;

};



/* =====================================================
   5. MACHINE (BOOT / READY / UPDATING / CLOSED)
===================================================== */

// ============  ESTADOS DEL SISTEMA ===================

LaunchCore.machine = {
  state: "BOOT", // estado actual

  STATES: {
    BOOT: "BOOT",
    READY: "READY",
    UPDATING: "UPDATING",
    WARNING: "WARNING",
    CLOSED: "CLOSED"
  }
};



// ================= FIJAR ESTADOS ====================

LaunchCore.setState = function(newState){

  const prev = LaunchCore.machine.state;

  if(prev === newState) return;

  console.log(`🧠 STATE: ${prev} → ${newState}`);

  LaunchCore.machine.state = newState;

  LaunchCore.emit("state:change", {
    from: prev,
    to: newState
  });

};



// ============HACIENDO FUNCIONAR A LOS ESTADOS ===============

LaunchCore.on("state:change", ({from, to}) => {

  console.log("🎛 reaccionando a estado:", to);

  switch(to){

    case "BOOT":
      // nada o logs
      break;

    case "READY":
      // UI activa
      break;

    case "UPDATING":
      // mostrar loading si quieres
      break;

    case "WARNING":
    // mostrar loading si quieres
    break;

    case "CLOSED":
      console.log("🚫 sistema cerrado");
      break;
  }

});



/* =====================================================
   6. EVENT SYSTEM (on, emit, handlers)
===================================================== */

// ================ DATA UPDATE ========================

LaunchCore.on("data:detected", ({ version, confirmDelay }) => {

  const currentPending = LaunchCore.storage.get("lc_pending_version", {
    source: "data:detected"
  });

  if(String(currentPending) === String(version)){
    console.log("♻️ misma versión pendiente → NO reprogramar");
    return;
  }

  console.log("🧠 CORE: cambio detectado", version);

  // 1. guardar versión pendiente
  LaunchCore.storage.set("lc_pending_version", version, {source: "data:detected"});

  // 2. cancelar confirmaciones anteriores
  LaunchCore.scheduler.cancelar("vc-confirm");

  const detectedAt = Number(
    LaunchCore.storage.get("vc_last_detected", {source: "data:detected"}) || 0
  );

  const now = Date.now();
  const margin = 5 * 60 * 1000;

  let delay;

  if(now > detectedAt + margin){
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
    { ignoreClosed: true, allowHidden: true } // 🔥 CLAVE
  );

});



// ================== CODE UPDATE ==========================

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
   9. ORCHESTRATOR (init)
===================================================== */

LaunchCore.init = async function(){

  LaunchCore.setState("BOOT");

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
    LaunchCore.setState("WARNING");
  }

  LaunchCore.setState("READY");

};








/* =====================================================
   7. GLOBAL MODULES (darkmode, carousel, etc.)
===================================================== */

// ========== ACTIVADOR DE FUNCIONES GLOBALES ==========

LaunchCore.use = async function(name){

  const fn = LaunchCore.globals[name];

  if(!fn){
    console.warn("Global no encontrado:", name);
    return;
  }

  return await fn();

};



// ================== MODO OSCURO ====================

LaunchCore.globals.darkmode = async function(){

  const darkmodePath = "modules/darkmode/darkmode"
  await LaunchCore.loadCSS(LaunchCore.paths.base + darkmodePath + ".css");

  const darkHTML = await fetch(
    LaunchCore.paths.base + darkmodePath + ".html"
  ).then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", darkHTML);

  await LaunchCore.loadScript(LaunchCore.paths.base + darkmodePath + ".js");

};



// ====================== CARRUSEL ==========================

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



// =============== SCROLL (PÁGINA PRICING) ===================

LaunchCore.globals.scroll = async function(){

  const scrollPath = "modules/scroll/scroll"
  await LaunchCore.loadScript(LaunchCore.paths.base + scrollPath + ".js");

};



// ===================VERSION CHECKER =======================

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



// ================= CSS DE BANDERAS ======================

LaunchCore.globals.flag = async function(){

  await LaunchCore.loadCSS(
    LaunchCore.paths.components + "flag.css"
  );

};



// =================  VERSION IN URL ======================

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



/* =====================================================
   8. OTRAS FUNCIONES
===================================================== */

// =========== URL VERSIONADA HUMANA =================

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



// ============== MODULE REGISTRY (AUTO INIT) ===================

LaunchCore.modules = {};


LaunchCore.register = function(name, fn){
  LaunchCore.modules[name] = fn;
};