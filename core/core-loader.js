/* =====================================================
    CONFIG BASE
  ===================================================== */

window.LaunchCore = window.LaunchCore || {};

//LaunchCore.config.workerUrl = "https://launch-engine.miroslaw-mm.workers.dev";

LaunchCore.paths = {
  base: "https://miroslawmorocho.github.io/jsconfig/",
  components: "https://miroslawmorocho.github.io/jsconfig/components/",
  projects: "https://miroslawmorocho.github.io/jsconfig/projects/",
  workerUrl: "https://launch-engine.miroslaw-mm.workers.dev"
};

LaunchCore.config = {
  project: null,
  product: null,
  page: null,
  endpoint: ""  
};

LaunchCore.events = {};
LaunchCore.currentDataVersion = 0;
LaunchCore.currentRunId = 0;
LaunchCore.currentScheduleOwner = 0;

let currentJob = null;
let queue = [];
let isRunning = false;

LaunchCore.state = {
  current: null,
  machine: "BOOT"
};




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

  /*let ongoingFetch = null;

  LaunchCore.fetchWorker = async function(endpoint = "", force = false){

    if (ongoingFetch) {
      console.log("🧠 reutilizando fetch en curso");
      return ongoingFetch;
    }

    ongoingFetch = (async () => {

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;

      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        try {

          let queryParams = new URLSearchParams(window.location.search);

          if (force && LaunchCore.vc?.version) {
            queryParams.set("v", LaunchCore.vc.version);
          }

          if (force) {
            queryParams.set("_", Date.now());
          }

          let url = BASE_WORKER_URL.replace(/\/$/, "") + endpoint;

          const queryString = queryParams.toString();
          if (queryString) {
            url += "?" + queryString;
          }

          console.log(`🌐 FETCH intento ${attempt + 1}:`, url);

          const options = force 
          ? { cache: "no-store" } 
          : {};

          const res = await fetch(url, options);

          if (!res.ok) {
            throw new Error("HTTP " + res.status);
          }

          const data = await res.json();

          return data;

        } catch (e) {

          console.warn(`⚠️ fetch intento ${attempt + 1} falló`, e);

          attempt++;

          if (attempt >= MAX_RETRIES) {
            console.error("💀 fetch falló definitivamente");
            return null;
          }

          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }

    })();

    try {
      return await ongoingFetch;
    } finally {
      ongoingFetch = null;
    }
  };*/

  

  // ===========  SCHEDULER (REPROGRAMACIÓN) =============
  
  /*LaunchCore.scheduler = (function(){

    let timers = {};

    function programar(key, fn, delay, options = {}){

      const ownerRunId = LaunchCore.currentRunId;

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

          if (ownerRunId !== LaunchCore.currentScheduleOwner) {
            console.log("⏱️ timer ignorado (schedule viejo)", {
              owner: ownerRunId,
              current: LaunchCore.currentScheduleOwner
            });
            return;
          }

          fn();
          return;
        }

        if(document.hidden && !options.allowHidden){
          console.log("😴 paused:", key);

          // 🔁 reintentar en corto
          let delay = 30000;
          timers[key] = setTimeout(tick, delay);

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
        console.trace("🧨 CANCEL LLAMADO:", key);
        clearTimeout(timers[key]);
        delete timers[key];
      }

    }

    return {
      programar,
      cancelar
    };

  })();*/


  
  // =========  VISIBILITY CONTROL (GLOBAL) ==============
  
  LaunchCore.visibility = (function(){

    let initialized = false;
    let callbacks = [];
    let lastCheck = 0;
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


// ============= FASES DEL RUN =========================

// =========== FASE 0: PRIMERA LECTURA =================

LaunchCore.phase.input = function(ctx){
  ctx.state = LaunchCore.readCacheState();
};



// ======= FASE DE SINCRONIZACIÓN CON WORKER ===========

LaunchCore.phase.sync = function(ctx, options){

  if(options.externalData){

    console.log("🧠 sync → externalData detectada");

  }

};



// ========= FASE DE CONSTRUCCIÓN DEL ESTADO ===========

LaunchCore.phase.buildEngineState = function(ctx){
  // 💀 eliminado — ahora manda normalize
};


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

    ctx.skipSchedule = true; // 🔥 CLAVE
    return;
  }

  ctx.result = result;
};



// ============ FASE DE PROCESAMIENTO =====================

LaunchCore.phase.process = function(ctx){

  const data = LaunchCore.normalize(ctx.result.raw, ctx.options);

  if(!data){
    console.warn("⚠️ normalize devolvió null");
    return;
  }

  // ✅ usar SOLO engineState
  if (data.status.launch === "closed") {

    if (LaunchCore.machine.state !== "CLOSED") {
      console.log("💀 CLOSE → activando estado CLOSED");
      LaunchCore.setState("CLOSED");
    }

    const key = `core-main-${LaunchCore.config.page}`;
    LaunchCore.scheduler.cancelar(key);

  } else {

    if (LaunchCore.machine.state === "CLOSED") {
      console.log("🌅 REOPEN: CLOSED → READY");
      LaunchCore.setState("READY");
    }

  }

  ctx.data = data.payload;
  ctx.meta = data.meta;
  ctx.timing = data.timing;
  ctx.status = data.status;

  console.log("🧠 process → system state actual:", LaunchCore.machine.state);

  LaunchCore.storage.set(
    "lc_next_update_global",
    String(ctx.timing.nextUpdate),
    { source: "process" }
  );

};



// ============ FASE DE RENDERIZACIÓN ==================

LaunchCore.phase.render = async function(ctx){

  if (ctx.decision === "CACHE") {
    console.log("⏭ skip render (bootstrap ya pintó)");
    return;
  }

  // 🔥 evitar doble render innecesario
  if(ctx.decision === "CACHE" &&
    !ctx.options?.forceProcess &&
    !ctx.options?.externalData
  ){
    console.log("⏭ skip render (ya bootstrap)");
    return;
  }

  await LaunchCore.render(ctx.data);

};



// ========= FASE DE PROGRAMACIÓN (SCHEDULE) ===========

LaunchCore.phase.schedule = function(ctx){

  const ownerRunId = LaunchCore.currentRunId;
  LaunchCore.currentScheduleOwner = ownerRunId;

  LaunchCore.scheduleNext(ctx.timing?.nextUpdate);

};






// =========   DATA NORMALIZER (CORE MANDA) ============

LaunchCore.normalize = function(input, options = {}) {

  // 🧠 CONTEXTO INYECTADO (PUREZA)
  const now = options.now || Date.now();
  const prev = options.previous || null;

  // 🧾 1. SOURCE (EXPLÍCITO)
  const source = options.source || "UNKNOWN";

  // 🛡 2. VALIDACIÓN BÁSICA
  if (!input || typeof input !== "object") {
    return {
      meta: { source, receivedAt: now, version: 0, isFresh: false },
      status: { launch: "open" },
      timing: {
        now,
        nextUpdate: Infinity,
        msRemaining: null,
        isExpired: false,
        isAlive: false
      },
      change: {
        isNewVersion: false,
        isNewTimeline: false,
        shouldUpdate: false
      },
      validity: {
        isValid: false,
        hasTiming: false,
        reason: "INVALID_INPUT"
      },
      payload: {
        pricing: {},
        evento: {},
        captura: {}
      }
    };
  }

  // 🔢 3. VERSION
  const version = Number(input?.status?.version) || 0;

  // 🚦 4. STATUS
  let launch = input?.pricing?.estado;

  if (launch !== "open" && launch !== "closed" && launch !== "pre") {
    launch = "open";
  }

  // ⏱ 5. TIMING (🔥 CORE)
  const delays = [
    Number(input?.siguienteActualizacionMs),
    Number(input?.evento?.siguienteActualizacionMs),
    Number(input?.pricing?.siguienteActualizacionMs)
  ].filter(d => Number.isFinite(d) && d > 0);

  let nextUpdate = Infinity;

  if (delays.length) {
    const delay = Math.min(...delays);
    nextUpdate = now + delay;
  }

  const isExpired = nextUpdate !== Infinity && now >= nextUpdate;

  const msRemaining = nextUpdate === Infinity
    ? null
    : nextUpdate - now;

  const isAlive = !isExpired && nextUpdate !== Infinity;

  const hasTiming = nextUpdate !== Infinity;

  // 📦 6. PAYLOAD
  const payload = {
    pricing: input?.pricing || {},
    evento: input?.evento || {},
    captura: input?.captura || {}
  };

  // 🌐 7. FRESHNESS
  const isFresh = (
    source === "FETCH" ||
    source === "VC" ||
    source === "BROADCAST"
  );

  // 🔄 8. CHANGE DETECTION
  let isNewVersion = true;
  let isNewTimeline = true;

  if (prev) {
    isNewVersion = version !== prev.meta?.version;
    isNewTimeline = nextUpdate !== prev.timing?.nextUpdate;
  }

  const shouldUpdate = isNewVersion || isNewTimeline;

  // 📡 9. VALIDITY
  const isValid = true; // estructura ya validada arriba

  // 🧱 10. OUTPUT FINAL
  return {
    meta: {
      source,
      receivedAt: now,
      version,
      isFresh
    },

    status: {
      launch
    },

    timing: {
      now,
      nextUpdate,
      msRemaining,
      isExpired,
      isAlive
    },

    change: {
      isNewVersion,
      isNewTimeline,
      shouldUpdate
    },

    validity: {
      isValid,
      hasTiming,
      reason: null
    },

    payload: input
  };
};



LaunchCore.handleEvent = function(raw, context = {}) {

  const previous = LaunchCore.state.current;

  // 🧠 1. NORMALIZE
  const normalized = LaunchCore.normalize(raw, {
    now: Date.now(),
    source: context.source || "UNKNOWN",
    previous
  });

  console.group("🧠 NORMALIZE DEBUG");

  console.log("📦 RAW (del worker):", raw);

  console.log("🧬 NORMALIZED COMPLETO:", normalized);

  console.log("📤 PAYLOAD QUE SE MANDA AL FRONT:", normalized.payload);

  console.log("📁 evento:", normalized.payload?.evento);
  console.log("💰 pricing:", normalized.payload?.pricing);
  console.log("📸 captura:", normalized.payload?.captura);

  console.groupEnd();

  // 🛑 2. VALIDITY CHECK
  if (!normalized.validity.isValid) {
    console.warn("🚫 data inválida → ignorada", normalized.validity.reason);
    return;
  }

  // 🔄 3. CHANGE CHECK
  if (!normalized.change.shouldUpdate) {
    console.log("⏭ data sin cambios → ignorada");
    return;
  }

  // 💾 4. UPDATE STATE
  LaunchCore.state.current = normalized;

  console.log("🧠 state actualizado", {
    version: normalized.meta.version,
    nextUpdate: normalized.timing.nextUpdate
  });

  // 🎨 5. RENDER
  if (LaunchCore.config?.page && LaunchCore.modules?.[LaunchCore.config.page]) {
    LaunchCore.render(normalized.payload);
  }

  // ⏱ 6. SCHEDULE
  if (normalized.timing.nextUpdate !== Infinity) {
    LaunchCore.scheduleNext(normalized.timing.nextUpdate);
  }

  // 💾 7. PERSIST (CACHE)
  try {
    localStorage.setItem("lc_data", JSON.stringify(raw));
    localStorage.setItem("lc_data_version", String(normalized.meta.version));
    localStorage.setItem("lc_next_update_global", String(normalized.timing.nextUpdate));
  } catch (e) {
    console.warn("❌ error guardando cache", e);
  }

};


// ================== FUENTES DE DATA ========================

let ongoingFetch = null;

LaunchCore.fetchWorker = async function(endpoint = "", force = false){

  if (ongoingFetch) {
    console.log("🧠 reutilizando fetch en curso");
    return ongoingFetch;
  }

  ongoingFetch = (async () => {

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {

        let queryParams = new URLSearchParams(window.location.search);

        // 🔥 version hint (si existe en state)
        const currentVersion = LaunchCore.state.current?.meta?.version;

        if (force && currentVersion) {
          queryParams.set("v", currentVersion);
        }

        if (force) {
          queryParams.set("_", Date.now());
        }

        let url = LaunchCore.paths.workerUrl.replace(/\/$/, "") + endpoint;

        const queryString = queryParams.toString();
        if (queryString) {
          url += "?" + queryString;
        }

        console.log(`🌐 FETCH intento ${attempt + 1}:`, url);

        const options = force 
          ? { cache: "no-store" } 
          : {};

        const res = await fetch(url, options);

        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        const raw = await res.json();

        console.log("✅ fetch OK");

        return raw;

      } catch (e) {

        console.warn(`⚠️ fetch intento ${attempt + 1} falló`, e);

        attempt++;

        if (attempt >= MAX_RETRIES) {
          console.error("💀 fetch falló definitivamente");
          return null;
        }

        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }

  })();

  try {
    return await ongoingFetch;
  } finally {
    ongoingFetch = null;
  }
};



async function fetchAndHandle(force = false) {
  const raw = await LaunchCore.fetchWorker("", force);

  if (!raw) return;

  LaunchCore.handleEvent(raw, { source: "FETCH" });
}



function loadCache() {
  try {
    const raw = JSON.parse(localStorage.getItem("lc_data"));

    if (raw) {
      LaunchCore.handleEvent(raw, { source: "CACHE" });
    }

  } catch (e) {
    console.warn("❌ cache corrupto", e);
  }
}




LaunchCore.channel = new BroadcastChannel("launch-core");

LaunchCore.channel.onmessage = function (event) {

  const msg = event.data;

  console.log("📡 broadcast recibido:", msg);

  if (!msg || typeof msg !== "object") {
    console.warn("💀 mensaje inválido");
    return;
  }

  // 🔄 DATA UPDATE
  if (msg.type === "DATA_UPDATED") {

    const raw = msg.raw;

    if (!raw) {
      console.warn("💀 broadcast sin raw");
      return;
    }

    console.log("🔄 otra pestaña actualizó → procesando");

    LaunchCore.handleEvent(raw, { source: "BROADCAST" });

    return;
  }

  // 💥 CODE UPDATE
  if (msg.type === "CODE_UPDATED") {

    console.log("💥 broadcast CODE → recargando");

    if (typeof LaunchCore.reloadWithVersion === "function") {
      LaunchCore.reloadWithVersion();
    }

    return;
  }

};




function onVersionCheck(raw) {
  LaunchCore.handleEvent(raw, { source: "VC" });
}



// ====================== NUEVO INIT =======================

LaunchCore.init = async function(){

  console.log("🚀 LaunchCore init");

  LaunchCore.on("data:detected", (payload) => {
    LaunchCore.vc.detect(payload);
  });

  LaunchCore.on("code:update", () => {
    console.log("💥 recargando por code update");
    location.reload();
  });

  try {

    // 🧱 1. ROOT
    const root = document.getElementById("launch-engine-root");
    LaunchCore.root = root;

    if (!root) {
      console.error("💀 Falta #launch-engine-root");
      return;
    }

    // ⚙️ 2. CONFIG
    LaunchCore.config.project = root.dataset.project;
    LaunchCore.config.product = root.dataset.product;
    LaunchCore.config.page = root.dataset.page;

    if (!LaunchCore.config.project || !LaunchCore.config.product || !LaunchCore.config.page) {
      console.error("💀 Faltan atributos data-*");
      return;
    }

    const { project, product, page } = LaunchCore.config;

    LaunchCore.config.endpoint = "/";

    // 📦 3. LOAD MODULE
    const base = LaunchCore.paths.projects + `${project}/${product}/`;
    const moduleUrl = base + page + "-module.js";

    await LaunchCore.globals.flag();
    await LaunchCore.loadScript(moduleUrl);

    const module = LaunchCore.modules[page];

    if (!module) {
      console.warn("⚠️ módulo no encontrado:", page);
      return;
    }

    if (module.init) {
      await module.init();
    }

    // 💾 4. CACHE (BOOTSTRAP)
    function loadCache() {
      try {
        const raw = JSON.parse(localStorage.getItem("lc_data"));

        if (raw) {
          console.log("🧊 cache encontrado → hidratando");
          LaunchCore.handleEvent(raw, { source: "CACHE" });
        }

      } catch (e) {
        console.warn("❌ cache corrupto", e);
      }
    }

    loadCache();

    // VERSION CHECKER
    await LaunchCore.use("versionChecker");

    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // REANUDANDO DATA CONFIRM SI LO HAY
    LaunchCore.vc.resume();

    LaunchCore.smartCheckNow();


    // 🌐 5. FETCH WRAPPER
    async function fetchAndHandle(force = false) {
      const raw = await LaunchCore.fetchWorker("", force);

      if (!raw) return;

      LaunchCore.handleEvent(raw, { source: "FETCH" });

      // 📡 sync tabs
      LaunchCore.channel.postMessage({
        type: "DATA_UPDATED",
        raw
      });
    }

    // 📡 6. BROADCAST
    LaunchCore.channel = new BroadcastChannel("launch-core");

    LaunchCore.channel.onmessage = function (event) {

      const msg = event.data;

      console.log("📡 broadcast recibido:", msg);

      if (!msg || typeof msg !== "object") return;

      if (msg.type === "DATA_UPDATED" && msg.raw) {
        LaunchCore.handleEvent(msg.raw, { source: "BROADCAST" });
      }

      if (msg.type === "CODE_UPDATED") {
        console.log("💥 recargando por broadcast");
        location.reload();
      }
    };

    // 👁 7. VISIBILITY (SIMPLIFICADO PERO INTELIGENTE)
    LaunchCore.visibility.init(() => {

      const now = Date.now();

      const state = LaunchCore.state.current;

      const pending = localStorage.getItem("lc_pending_version");

      // 🥇 1. VC MANDA (EXCEPCIÓN VÁLIDA)
      if (pending) {

        const nextConfirm = Number(
          localStorage.getItem("vc_next_confirm")
        );

        if (!nextConfirm || now >= nextConfirm) {
          console.log("⚡ visibility → confirm inmediato");
          LaunchCore.vc.confirm();
        }

        window.__vcCheckNow?.();
        return;
      }

      // 🧊 SIN STATE → FETCH
      if (!state) {
        console.log("⚡ sin state → fetch");

        LaunchCore.fetchWorker("", true).then(raw => {
          if (raw) {
            LaunchCore.handleEvent(raw, { source: "VISIBILITY" });
          }
        });

        return;
      }

      const { timing, status } = state;

      // 🥈 CLOSED → NO FETCH JAMÁS
      if (status.launch === "closed") {
        console.log("💀 closed → skip total");

        window.__vcCheckNow?.();
        return;
      }

      // 🥉 SIN TIMING → NO HACER NADA
      if (!timing?.nextUpdate) {
        console.log("💀 sin nextUpdate → skip");
        return;
      }

      // 🧊 AÚN VÁLIDO
      if (!timing.isExpired) {
        console.log("🧊 cache válido → skip");
        return;
      }

      // 🏁 EXPIRADO → FETCH
      console.log("⚡ expirado → fetch");

      LaunchCore.fetchWorker("", true).then(raw => {
        if (raw) {
          LaunchCore.handleEvent(raw, { source: "VISIBILITY" });
        }
      });

      window.__vcCheckNow?.();

    });

    // ⏱ 8. SCHEDULE INICIAL
    if (LaunchCore.state.current?.timing?.nextUpdate) {
      LaunchCore.scheduleNext(
        LaunchCore.state.current.timing.nextUpdate
      );
    }

    // 🚀 9. FETCH INICIAL (SI NO HAY CACHE VÁLIDO)
    if (!LaunchCore.state.current) {
      console.log("🌐 primer fetch");
      fetchAndHandle(false);
    }

    console.log("🔥 LaunchCore READY");

  } catch (e) {
    console.error("💀 init error:", e);
  }

};



LaunchCore.scheduler = (function(){

  const timers = {};

  function schedule(key, fn, delay, options = {}){

    if (!key) {
      console.warn("💀 scheduler requiere key");
      return;
    }

    cancel(key); // 🔥 siempre limpiar

    const MAX_DELAY = 2147483647;
    const targetTime = Date.now() + delay;

    function tick(){

      const now = Date.now();
      const remaining = targetTime - now;

      if (remaining <= 0) {
        delete timers[key];
        fn();
        return;
      }

      // 😴 tab oculta → pausar suavemente
      if (document.hidden && !options.allowHidden) {
        console.log("😴 paused:", key);

        timers[key] = setTimeout(tick, 30000);
        return;
      }

      const nextDelay = Math.min(remaining, MAX_DELAY);
      timers[key] = setTimeout(tick, nextDelay);
    }

    timers[key] = setTimeout(tick, Math.min(delay, MAX_DELAY));
  }

  function cancel(key){
    if (timers[key]) {
      clearTimeout(timers[key]);
      delete timers[key];
    }
  }

  return {
    schedule,
    cancel
  };

})();



LaunchCore.scheduleNext = function(nextUpdate){

  const current = LaunchCore.state.current;

  if (!current) {
    console.warn("💀 sin state → no schedule");
    return;
  }

  // 💀 sin timing válido → nada que hacer
  if (!current.timing.isAlive) {
    console.log("💀 no alive → no schedule");
    return;
  }

  const now = Date.now();
  const delay = nextUpdate - now;

  if (!Number.isFinite(delay)) {
    console.warn("💀 delay inválido");
    return;
  }

  const key = `core-main-${LaunchCore.config.page}`;

  // ⚡ vencido → fetch inmediato
  if (delay <= 0) {
    console.log("⚡ vencido → fetch inmediato");

    LaunchCore.fetchWorker("", true).then(raw => {
      if (raw) {
        LaunchCore.handleEvent(raw, { source: "FETCH" });
      }
    });

    return;
  }

  console.log("⏱ programando próximo fetch en", delay, "ms");

  LaunchCore.scheduler.schedule(
    key,
    () => {

      console.log("🚀 ejecutando fetch programado");

      LaunchCore.fetchWorker("", true).then(raw => {
        if (raw) {
          LaunchCore.handleEvent(raw, { source: "FETCH" });
        }
      });

    },
    Math.max(delay, 1000),
    { allowHidden: false }
  );

};

// ============== CONTENEDOR ===========================

LaunchCore.vc = {};

LaunchCore.vc.confirm = async function(){

  console.log("🧠 VC: confirmando...");

  const pending = localStorage.getItem("lc_pending_version");
  if (!pending) return;

  const currentVersion = LaunchCore.state.current?.meta?.version;

  if (String(currentVersion) === String(pending)) {
    console.log("🧊 ya tengo esta versión → limpiar");

    localStorage.removeItem("lc_pending_version");
    localStorage.removeItem("vc_last_detected");
    localStorage.removeItem("vc_next_confirm");

    return;
  }

  const result = await LaunchCore.fetchWorker("", true);
  if (!result) return;

  const workerVersion = String(result?.status?.version || 0);

  console.log("🛰️ worker version:", workerVersion);

  if (String(workerVersion) === String(pending)) {

    console.log("✅ DATA CONFIRMADA");

    localStorage.removeItem("lc_pending_version");
    localStorage.removeItem("vc_last_detected");
    localStorage.removeItem("vc_next_confirm");

    LaunchCore.handleEvent(result, { source: "VC" });

  } else {
    console.log("⌛ aún no lista");
  }

};



LaunchCore.vc.detect = function({ version, confirmDelay }){

  const currentPending = localStorage.getItem("lc_pending_version");

  if (String(currentPending) === String(version)) {

    const nextConfirm = Number(localStorage.getItem("vc_next_confirm"));
    const now = Date.now();

    if (!nextConfirm) {
      console.log("♻️ pending sin timer → reprogramando");

      LaunchCore.vc.scheduleConfirm({
        delay: confirmDelay || 60000
      });

    } else if (now >= nextConfirm) {

      console.log("⚡ confirm vencido → ejecutar YA");

      LaunchCore.vc.confirm();

    } else {

      console.log("♻️ pending activo → esperando");

    }

    return;
  }

  console.log("🧠 VC: cambio detectado", version);

  localStorage.setItem("lc_pending_version", version);

  const key = `vc-confirm-${LaunchCore.config.page}`;
  LaunchCore.scheduler.cancel(key);

  const detectedAt = Number(localStorage.getItem("vc_last_detected") || 0);

  const now = Date.now();
  const margin = 5 * 60 * 1000;

  let delay = (now > detectedAt + margin)
    ? 0
    : (confirmDelay || 60000);

  LaunchCore.vc.scheduleConfirm({ delay });

};



LaunchCore.vc.resume = function(){

  const pending = localStorage.getItem("lc_pending_version");
  if (!pending) return;

  const nextConfirm = Number(localStorage.getItem("vc_next_confirm"));
  if (!nextConfirm) return;

  let remaining = nextConfirm - Date.now();

  if (remaining <= 0) {
    console.log("⚡ VC expired → ejecutar confirm inmediato");
    LaunchCore.vc.confirm();
    return;
  }

  console.log("🔁 VC resume → delay:", remaining);

  LaunchCore.vc.scheduleConfirm({ delay: remaining });

};



LaunchCore.vc.scheduleConfirm = function({ delay }){

  const key = `vc-confirm-${LaunchCore.config.page}`;

  const nextTime = Date.now() + delay;

  localStorage.setItem("vc_next_confirm", String(nextTime));

  LaunchCore.scheduler.schedule(
    key,
    () => LaunchCore.vc.confirm(),
    delay,
    { allowHidden: true } // 🔥 importante
  );

};



// ==========  RENDER MACHINE ==================

LaunchCore.render = async function(data){

  const page = LaunchCore.config.page;
  const module = LaunchCore.modules[page];

  if(!module){
    console.warn("No hay módulo para render:", page);
    return;
  }

  console.group("🎨 RENDER DEBUG");

  console.log("📦 DATA FINAL QUE RECIBE EL FRONT:", data);
  console.log("📁 evento:", data?.evento);
  console.log("💰 pricing:", data?.pricing);

  console.groupEnd();

  await module.render(data);

  console.log("🎨 renderizando ",page);

};



// ============  SMART VERSION CHECK ===================

LaunchCore.smartCheckNow = function(){

  console.log("🧠 smart check → ping VC");

  if(window.__vcCheckNow){
    window.__vcCheckNow();
  }

};

















// ======= FUNCIÓN CENTRAL DE VALIDACIÓN ===============

LaunchCore.shouldAcceptData = function(newVersionRaw, options = {}){

  const newVersion = Number(newVersionRaw);

  if (!Number.isFinite(newVersion)) {
    console.warn("⚠️ versión inválida → ignorando", newVersionRaw);
    return false;
  }

  // 🔥 SI ES DATA DEL WORKER (timeline) → SIEMPRE ACEPTAR
  if (options.allowSameVersion) {
    console.log("⏱️ misma versión pero timeline → permitido");
    return true;
  }

  // 🧠 lógica normal (VC)
  if (newVersion <= LaunchCore.currentDataVersion) {
    console.log("🧊 data vieja ignorada", {
      incoming: newVersion,
      current: LaunchCore.currentDataVersion
    });
    return false;
  }

  console.log("🆕 data nueva aceptada", {
    incoming: newVersion,
    previous: LaunchCore.currentDataVersion
  });

  LaunchCore.currentDataVersion = newVersion;
  return true;
};



// ===============  DATA COMMIT ========================

LaunchCore.commitData = function(raw, options = {}){

  if(!raw){
    console.warn("❌ commitData sin raw");
    return;
  }

  try{

    // 🔥 SOLO persistimos raw
    LaunchCore.storage.set(
      "lc_data",
      raw,
      { stringify: true, source: "commitData" }
    );

    // 🔥 versión (opcional pero útil)
    const version = raw?.status?.version;
    if(version){
      LaunchCore.storage.set(
        "lc_data_version",
        String(version),
        { source: "commitData" }
      );
    }

  }catch(e){
    console.warn("❌ commitData error", e);
  }

};



// =============== CORE STATE READER ===================

LaunchCore.readCacheState = function(){

  const cached = LaunchCore.storage.get(
    "lc_data", {
      source: "readCacheState:cached"
    }
  );

  return{
    cached,
    nextUpdate: 0,
    cachedVersion: LaunchCore.storage.get(
      "lc_data_version", {
        source: "readCacheState:cachedVersion"
      }),
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
    hasPendingVersion: !!LaunchCore.storage.get(
      "lc_pending_version", {
        source: "buildEngineState:hasPendingVersion"
      }
    ),
    isClosed: LaunchCore.getLaunchStatus() === "closed"
  };

  console.log("🧠 engineState rebuilt:", {
    isClosed: LaunchCore.getLaunchStatus(),
    nextUpdate: state.nextUpdate
  });
  
};



// ==============  DECISION ENGINE =====================

LaunchCore.decide = function(state, options){

  // 🥇 prioridad absoluta
  if(options.externalData){
    return "EXTERNAL";
  }

  if(options.forceProcess){
    return "CACHE";
  }

  // 🧊 sin cache → fetch
  if(!state.cached){
    return "FETCH";
  }

  // ⏱️ sin nextUpdate → fetch
  if(!state.nextUpdate){
    return "FETCH";
  }

  // ⏰ expirado → fetch
  if(Date.now() >= state.nextUpdate){
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

      return {
        nextUpdate: state.nextUpdate,
        raw: parsed
      };
    }


    case "FETCH": {

      if(!LaunchCore.canFetch()){
      
        console.log("😴 skip fetch (hidden)");

        return {
          raw: null,
          nextUpdate: state.nextUpdate
        };
      }

      LaunchCore.setState?.("UPDATING");

      raw = await LaunchCore.fetchWorker(
        LaunchCore.config.endpoint,
        options.forceFetch
      );

      if(!raw){
        LaunchCore.setState?.("WARNING");
        throw new Error("FETCH_FAILED");
      }

      const accepted = LaunchCore.shouldAcceptData(
        raw?.status?.version,
        { allowSameVersion: true } // 🔥 CLAVE
      );

      if (!accepted) {
        console.log("🚫 FETCH descartado (data vieja)");
        return {
          raw: null,
        };
      }

      LaunchCore.commitData(raw);
      
      return {
        raw,
        nextUpdate: LaunchCore.readCacheState().nextUpdate
      };
    }


    case "EXTERNAL": {

      raw = options.externalData;

      const source = options.__source || (options.__fromBroadcast ? "BROADCAST" : "UNKNOWN");

      LaunchCore.commitData(raw, {
        __fromBroadcast: options.__fromBroadcast === true,
        __source: source
      });

      // 🔥 CLAVE: reconstruir estado con data NUEVA
      const newState = LaunchCore.readCacheState();
      LaunchCore.buildEngineState(newState);

      return {
        raw,
        nextUpdate: newState.nextUpdate
      };
    }

  }

};



// ============  GLOBAL EXECUTION ENGINE ================

LaunchCore.run = async function(options = {}, source = "unknown", runId) {

  if (runId !== LaunchCore.currentRunId) {
    console.log("☠️ run abortado (obsoleto)", {
       runId, current: LaunchCore.currentRunId
      }
    );

    return;
  }

  try {

    const ctx = { options };

    LaunchCore.phase.input(ctx);
    if (runId !== LaunchCore.currentRunId) return;

    LaunchCore.phase.sync(ctx, options);
    if (runId !== LaunchCore.currentRunId) return;

    LaunchCore.phase.buildEngineState(ctx);
    if (runId !== LaunchCore.currentRunId) return;
    
    LaunchCore.phase.decide(ctx, options);
    if (runId !== LaunchCore.currentRunId) return;

    await LaunchCore.phase.execute(ctx, options);
    if (runId !== LaunchCore.currentRunId) return;

    if(!ctx.result || ctx.skipSchedule){

      console.warn("🛑 run abortado (sin resultado o skip)");

      if(ctx.decision === "FETCH" && document.hidden){

        console.log("🧊 fetch pendiente → delegando a visibility");

        return; // 🔥 CORTAS EL LOOP
      }

      return;
    }

    LaunchCore.phase.process(ctx);
    
    if (runId !== LaunchCore.currentRunId) {
      console.log("🎨 render cancelado (run viejo)");
      return;
    }

    await LaunchCore.phase.render(ctx);    
    
    if (runId === LaunchCore.currentRunId) {
      LaunchCore.phase.schedule(ctx);
    } else {
      console.log("⏱️ schedule cancelado (run viejo)");
    }
    
    console.log("🔥 RENDER EJECUTADO", {
      decision: ctx.decision,
      force: ctx.options?.forceProcess,      
    });

  } catch(e){

    console.error("❌ error en run:", e);

    if(e.message === "FETCH_FAILED"){
      console.warn("🔁 reintentando con forceFetch");
      return LaunchCore.execute("retry-fetch", { forceFetch: true });
    }

  }

};



/* =====================================================
   4. CORE HELP FUNCTIONS
===================================================== */

// ==============  NEXT UPDATE SCHEDULER ===============

/*LaunchCore.scheduleNext = function(nextUpdate){

  // 💀 SI ESTÁ CERRADO → NO HACER NADA
  if (LaunchCore.machine.state === "CLOSED") {
    console.log("💀 CLOSED → no schedule");
    return;
  }

  const now = Date.now();

  let delay = nextUpdate - now;

  if(isNaN(delay)){
    console.warn("💀 INVALID DELAY → NO SCHEDULE", delay);
    return;
  }

  if(delay <= 0){
    console.log("⚡ vencido → ejecutar inmediato");

    LaunchCore.execute("scheduleNext", {
      forceFetch: true
    });

    return;
  }

  const key = `core-main-${LaunchCore.config.page}`;

  LaunchCore.scheduler.programar(
    key,
    () => LaunchCore.execute("scheduleNext"),
    Math.max(delay, 1000),
    { allowHidden: false }
  );

};*/



// ================   EXECUTION SOURCE ==================

/*LaunchCore.execute = function(source = "unknown", options = {}){

  if (LaunchCore.machine.state === "CLOSED" && !options.externalData) {
    console.log("💀 execute bloqueado (CLOSED)");
    return;
  }

  const type = getJobType(source, options);

  // evitamos que se disparen lógicas cruzadas que hacen fetch en hidden
  // visibility, schedulers, funciones llamando a esta, etc.
  if(type === "FETCH_FORCE" && document.hidden){
    console.log("🚫 execute: FETCH_FORCE bloqueado (hidden)");
    return;
  }

  console.log("🧠 ENQUEUE:", source, "| type:", type);

  // 🔥 REGLA 1: no duplicar FETCH_FORCE
  const alreadyQueued = queue.some(q => q.type === type);

  if(type === "FETCH_FORCE" && alreadyQueued){
    console.log("🚫 ya hay FETCH_FORCE en cola");
    return;
  }

  // 🔥 REGLA 2: si hay FETCH_FORCE, ignorar NORMAL
  const hasForce = queue.some(q => q.type === "FETCH_FORCE");

  // 🔥 REGLA 3: no duplicar contra el que ya corre
  if(currentJob && currentJob.type === type){
    console.log("🚫 mismo tipo ya corriendo");
    return;
  }

  if(type === "NORMAL" && hasForce){
    console.log("🚫 NORMAL ignorado (hay FETCH_FORCE)");
    return;
  }

  const runId = ++LaunchCore.currentRunId;
  LaunchCore.currentScheduleOwner = runId;
  queue.push({ source, options, type, runId });

  console.log("📦 queue:", queue.map(q => q.type));
  
  processQueue();
  
};*/



// =============== PROCESS QUEUE =======================

/*async function processQueue(){

  if(isRunning) return;
  if(queue.length === 0) return;

  const job = queue.shift();

  currentJob = job;
  isRunning = true;

  console.log("🚀 RUN:", job.source, "| type:", job.type);

  try{

    await LaunchCore.run(job.options, job.source, job.runId);

  }catch(e){
    console.error("❌ error en job:", job.source, e);
  }

  currentJob = null;
  isRunning = false;

  processQueue();
}*/



// ================= JOB TYPE ==========================

/*function getJobType(source, options){

  if(options?.forceFetch) return "FETCH_FORCE";

  if(source.startsWith("vc-confirm")) return "FETCH_FORCE";

  if(source === "visibility") return "NORMAL";

  if(source === "scheduleNext") return "NORMAL";

  return "NORMAL";
}*/





// =============  CONFIRMAR VERSION DEL WORKER ================

LaunchCore.getWorkerVersion = async function(){

  const res = await LaunchCore.fetchWorker(
    LaunchCore.config.endpoint,
    true
  );

  const normalized = LaunchCore.normalize(res);

  return {
    version: normalized?.meta?.version,
    raw: res,
    normalized
  };

};






// ======== FUNCIÓN VERIFICAR SI PUEDE FETCH =========

LaunchCore.canFetch = function(){

  if (LaunchCore.machine.state === "CLOSED") {
    console.log("💀 fetch bloqueado (CLOSED)");
    return false;
  }

  if (document.hidden) {
    console.log("🚫 fetch bloqueado (hidden)");
    return false;
  }

  return true;
};



// =============== FORMATEAR TIME ====================

function formatTime(ms){

  if(ms === Infinity) return "∞";
  if(ms <= 0) return "AHORA";

  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  const seconds = s % 60;
  const minutes = m % 60;
  const hours = h % 24;

  let parts = [];

  if(d > 0) parts.push(`${d}d`);
  if(h > 0 || d > 0) parts.push(`${hours}h`);
  if(m > 0 || h > 0 || d > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}



// ============== LEER LAUNCH STATUS ==================

LaunchCore.getLaunchStatus = function(){
  return LaunchCore.storage.get(
    "lc_launch_status", {
      source:"getLaunchStatus"
    }
  );
}



/* =====================================================
   BROADCAST CHANNEL
===================================================== */

/*LaunchCore.channel = new BroadcastChannel("launch-core");

LaunchCore.channel.onmessage = function (event) {
  const msg = event.data;

  console.log("📡 broadcast recibido:", msg);

  if (msg.type === "DATA_UPDATED") {
    console.log("🔄 otra pestaña actualizó → refrescando");

    try {
      const raw = msg.raw;

      if (!raw) {
        console.warn("💀 broadcast sin raw");
        return;
      }

      LaunchCore.execute("broadcast-update", {
        externalData: raw,
        __fromBroadcast: true
      });

    } catch (e) {
      console.error("❌ broadcast recalc error:", e);
      return;
    }
  }

  if (msg.type === "CODE_UPDATED") {
    console.log("💥 broadcast CODE → recargando");
    LaunchCore.reloadWithVersion();
  }
};*/



/* =====================================================
   CONFIRMACIÓN DE DATA DESDE EL WORKER (VC DATA CHECK)
===================================================== */

// ============== CONTENEDOR ===========================

/*LaunchCore.vc = {};*/



// ======== FUNCIÓN PARA PROGRAMAR CONFIRMACIÓN ========

/*LaunchCore.vc.scheduleConfirm = function({ delay }){

  const nextConfirm = Date.now() + delay;

  LaunchCore.storage.set(
    "vc_next_confirm", nextConfirm, {
      source: "scheduleConfirm"
    }
  );

  console.log("⏳ confirm en", delay);

  const key = `vc-confirm-${LaunchCore.config.page}`;

  LaunchCore.scheduler.programar(
    key,
    LaunchCore.vc.confirm,
    delay,
    { ignoreClosed: true, allowHidden: true }
  );
};*/



// ======= FUNCIÓN PARA CONFIRMAR DATA =================

/*LaunchCore.vc.confirm = async function(){

  console.log("🧠 VC: confirmando...");

  if(!LaunchCore.canFetch()){
    console.log("🚫 VC fetch bloqueado (hidden)");
    return;
  }

  const pending = LaunchCore.storage.get(
    "lc_pending_version", {
      source: "vc.confirm"
    }
  );
  
  if(!pending) return;

  const currentVersion = LaunchCore.storage.get(
    "lc_data_version", {
      source: "vc.confirm"
    }
  );

  if(String(currentVersion) === String(pending)){
    console.log("🧠 VC: ya tengo esta versión → skip fetch");

    LaunchCore.storage.remove("lc_pending_version", {source: "vc.confirm"});
    LaunchCore.storage.remove("vc_last_detected", {source: "vc.confirm"});
    LaunchCore.storage.remove("vc_next_confirm", {source: "vc.confirm"});

    return;
  }

  const result = await LaunchCore.getWorkerVersion();
  const workerVersion = result?.version;

  console.log("🛰️ worker version:", workerVersion);

  if(String(workerVersion) === String(pending)){

    console.log("✅ DATA CONFIRMADA");

    LaunchCore.storage.remove("lc_pending_version", {source: "vc.confirm"});
    LaunchCore.storage.remove("vc_last_detected", {source: "vc.confirm"});
    LaunchCore.storage.remove("vc_next_confirm", {source: "vc.confirm"});

    if (LaunchCore.__lastConfirmedVersion === workerVersion) {
      console.log("🧊 confirm duplicado → ignorado");
      return;
    }

    LaunchCore.__lastConfirmedVersion = workerVersion;

    const accepted = LaunchCore.shouldAcceptData(
      workerVersion
    );

    if (!accepted) return;

    LaunchCore.execute("vc-confirm", {
      externalData: result.raw,
      __source: "VC"
    });

  } else {
    console.log("⌛ aún no lista");
  }

};*/



// ======== FUNCIÓN PARA DETECTAR CAMBIOS ==============

/*LaunchCore.vc.detect = function({ version, confirmDelay }){

  const currentPending = LaunchCore.storage.get(
    "lc_pending_version", {
      source: "vc.detect"
    }
  );

  if(String(currentPending) === String(version)){

    const nextConfirm = Number(
      LaunchCore.storage.get("vc_next_confirm", {source:"vc.detect"})
    );

    const now = Date.now();

    if(!nextConfirm){
      console.log("♻️ pending sin timer → reprogramando");

      LaunchCore.vc.scheduleConfirm({
        delay: confirmDelay || 60000
      });

    }else if(now >= nextConfirm){

      console.log("⚡ confirm vencido → ejecutar YA");

      LaunchCore.vc.confirm();

    }else{

      console.log("♻️ pending activo → esperando");

    }

    return;
  }

  console.log("🧠 VC: cambio detectado", version);

  LaunchCore.storage.set("lc_pending_version", version, {source: "vc.detect"});

  const key = `vc-confirm-${LaunchCore.config.page}`;
  
  LaunchCore.scheduler.cancelar(key);

  const detectedAt = Number(
    LaunchCore.storage.get("vc_last_detected", {source: "vc.detect"}) || 0
  );

  const now = Date.now();
  const margin = 5 * 60 * 1000;

  let delay = (now > detectedAt + margin)
    ? 0
    : (confirmDelay || 60000);

  LaunchCore.vc.scheduleConfirm({ delay });
};*/



// ====== FUNCIÓN PARA REANUDAR CONFIRMACIÓN ===========

/*LaunchCore.vc.resume = function(){

  const pending = LaunchCore.storage.get(
    "lc_pending_version", {
      source: "vc.resume"
    }
  );
  
  if(!pending) return;

  const nextConfirm = Number(
    LaunchCore.storage.get("vc_next_confirm", {source: "vc.resume"})
  );

  if(!nextConfirm) return;

  let remaining = nextConfirm - Date.now();

  if(remaining <= 0){
    console.log("⚡ VC expired → ejecutar confirm inmediato");
    LaunchCore.vc.confirm();
    return;
  }

  let delay = remaining;

  console.log("🔁 VC resume → delay:", delay);

  LaunchCore.vc.scheduleConfirm({ delay });
};*/



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

LaunchCore.on("data:detected", LaunchCore.vc.detect);



// ================== CODE UPDATE ==========================

LaunchCore.on("code:update", async () => {

  console.log("💥 CORE: CODE UPDATE DETECTADO");

  // 🔥 avisar a otras pestañas que recarguen
  if(LaunchCore.channel){
    LaunchCore.channel.postMessage({
      type: "CODE_UPDATED"
    });
  }

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

/*LaunchCore.init = async function(){

  LaunchCore.setState("BOOT");
  console.log("🚀 BOOT: LaunchCore iniciado");

  const cachedVersion = LaunchCore.storage.get("lc_data_version",{source:"init"});
  LaunchCore.currentDataVersion = Number(cachedVersion) || 0;
  console.log("🧠 currentDataVersion (init):", LaunchCore.currentDataVersion);

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


    LaunchCore.visibility.init(() => {

      const now = Date.now();

      const nextUpdate = Number(
        LaunchCore.storage.get(
          "lc_next_update_global", {
            source: "visibility.init"
          }
        )
      );

      const pending = LaunchCore.storage.get(
        "lc_pending_version", {
          source: "visibility.init"
        }
      );

      // 🥇 1. SIEMPRE: versión pendiente manda
      if(pending){

        const nextConfirm = Number(
          LaunchCore.storage.get(
            "vc_next_confirm", {
              source: "visibility.init"
            }
          )
        );

        if(!nextConfirm || now >= nextConfirm){
          console.log("⚡ visibility → confirm inmediato");
          LaunchCore.vc.confirm();
        }

        LaunchCore.smartCheckNow();
        return;
      }


      // 🥈 2. CLOSED + sistema dormido (Infinity) → NO HACER NADA
      if (LaunchCore.machine.state === "CLOSED" && nextUpdate === Infinity) {
        console.log("💀 closed + dormido → skip total");
        LaunchCore.smartCheckNow();
        return;
      }


      // 🥉 3. CACHE VÁLIDO → NO HACER NADA
      if(nextUpdate && now < nextUpdate){
        console.log("🧊 cache válido → skip");
        return;
      }


      // 🏁 4. TODO LO DEMÁS → FETCH
      console.log("⚡ visibility → fetch");

      LaunchCore.execute("visibility-fetch", {
        forceFetch: true
      });

      LaunchCore.smartCheckNow();

    });

        
    // VERSION CHECKER
    await LaunchCore.use("versionChecker");

    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // REANUDANDO DATA CONFIRM SI LO HAY
    LaunchCore.vc.resume();

    const cached = LaunchCore.storage.get("lc_data", {source: "LaunchCore.init"});

    if (cached) {
      try {
        
        const normalized = LaunchCore.normalize(raw);

        await LaunchCore.render(normalized.payload);

        console.log("⚡ bootstrap render (fuera del pipeline)");
      } catch(e){
        console.warn("❌ no hay data para bootstrap");
      }
    }

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

};*/



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