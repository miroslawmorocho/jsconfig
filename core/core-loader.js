/* =====================================================
    CONFIG BASE
  ===================================================== */

window.LaunchCore = window.LaunchCore || {};

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



/* =====================================================
   3. CORE ENGINE (normalize, commit, decision, run)
===================================================== */



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
        nextUpdate: null,
      },
      change: {
        isNewVersion: false,
        isNewTimeline: false,
        shouldUpdate: false
      },
      validity: {
        isValid: false,
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

  let nextUpdate = null;

  if (delays.length) {
    const delay = Math.min(...delays);
    nextUpdate = now + delay;
  }

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
    },

    change: {
      isNewVersion,
      isNewTimeline,
      shouldUpdate
    },

    validity: {
      isValid,
      reason: null
    },

    payload: input
  };
};



LaunchCore.handleEvent = function(raw, context = {}) {

  const now = Date.now();
  const previous = LaunchCore.state.current;

  // 🧠 1. NORMALIZE
  const normalized = LaunchCore.normalize(raw, {
    now: Date.now(),
    source: context.source || "UNKNOWN",
    previous
  });

  /*console.group("🧠 NORMALIZE DEBUG");

  console.log("📦 RAW (del worker):", raw);

  console.log("🧬 NORMALIZED COMPLETO:", normalized);

  console.log("📤 PAYLOAD QUE SE MANDA AL FRONT:", normalized.payload);

  console.log("📁 evento:", normalized.payload?.evento);
  console.log("💰 pricing:", normalized.payload?.pricing);
  console.log("📸 captura:", normalized.payload?.captura);

  console.groupEnd();*/

  // 🛑 2. VALIDITY CHECK
  if (!normalized.validity.isValid) {
    console.warn("🚫 data inválida → ignorada", normalized.validity.reason);
    return;
  }

  // 🔄 3. CHANGE CHECK
  if (!normalized.change.shouldUpdate) {
    console.log("⏭ sin cambios → solo actualizar scheduling");

    LaunchCore.state.current = normalized;

    const timingState = LaunchCore.getTimingState(normalized);
    LaunchCore.logTimingState(normalized, "handleEvent");

    if (timingState !== "IDLE") {
      LaunchCore.scheduleNext(normalized.timing.nextUpdate);
    }

    return;
  }

  // 💾 4. UPDATE STATE
  LaunchCore.state.current = normalized;

    try {
      localStorage.setItem("lc_state", JSON.stringify(normalized));
    } catch (e) {
      console.warn("❌ error guardando state", e);
    }


  console.log("🧠 state actualizado", {
    version: normalized.meta.version,
    nextUpdate: normalized.timing.nextUpdate
  });

  // 🎨 5. RENDER
  if (LaunchCore.config?.page && LaunchCore.modules?.[LaunchCore.config.page]) {
    LaunchCore.render({
      ...normalized.payload,
      __status: normalized.status
    });
  }

  // ⏱ 6. SCHEDULE
  const timingState = LaunchCore.getTimingState(normalized);

  if (timingState !== "IDLE") {
    LaunchCore.scheduleNext(normalized.timing.nextUpdate);
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



// ============== FETCH AND HANDLE ======================

async function fetchAndHandle(force = false) {

  if (document.hidden) {
    console.log("🚫 fetch cancelado (hidden)");

    return;
  }

  const raw = await LaunchCore.fetchWorker("", force);

  if (!raw) return;

  LaunchCore.handleEvent(raw, { source: "FETCH" });

  LaunchCore.channel.postMessage({
    type: "STATE_UPDATED",
    state: LaunchCore.state.current
  });
}



// ====================== NUEVO INIT =======================

LaunchCore.init = async function(){

  console.log("🚀 LaunchCore init");

  LaunchCore.on("data:detected", (payload) => {
    LaunchCore.vc.detect(payload);
  });

  try {

    // limpiar caché de code version si lo hay
    (function cleanVersionFlag(){

      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get("v");

      if (v) {
        console.log("🧹 limpiando version compartida usada:", v);
        localStorage.removeItem("lc_code_update_version");
      }

    })();

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
        const raw = localStorage.getItem("lc_state");

        if (!raw) {
          console.log("🧊 sin cache → fetch inicial");
          fetchAndHandle(true);
          return;
        }

        const state = JSON.parse(raw);

        if (!state || typeof state !== "object") {
          throw new Error("invalid snapshot");
        }

        // 🛡 validación mínima estructural
        if (!state.payload || !state.status || !state.timing) {
          throw new Error("corrupt snapshot structure");
        }

        console.log("🧊 snapshot válido → hydrate");

        LaunchCore.state.current = state;

        const timingState = LaunchCore.getTimingState(state);
        LaunchCore.logTimingState(state, "bootstrap");

        LaunchCore.render({
          ...state.payload,
          __status: state.status
        });

        if (timingState !== "IDLE") {

          const delay = state.timing.nextUpdate - Date.now();

          LaunchCore.scheduleNext(state.timing.nextUpdate);

          console.log(
            "🧊 bootstrap nextUpdate:",
            formatNextUpdate(state.timing.nextUpdate),
            "| en:",
            formatTime(delay)
          );
        }

      } catch (e) {
        console.warn("💀 cache corrupto → limpiando y refetch", e);

        localStorage.removeItem("lc_state");

        // 🔥 fallback REAL
        fetchAndHandle(true);
      }
    }

    loadCache();

    // VERSION CHECKER
    await LaunchCore.use("versionChecker");

    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // 📡 BROADCAST (una sola vez, centralizado)
    LaunchCore.channel = new BroadcastChannel("launch-core");

    LaunchCore.channel.onmessage = function (event) {

      const msg = event.data;

      console.log("📡 broadcast recibido:", msg);

      if (!msg || typeof msg !== "object") return;

      if (msg.type === "STATE_UPDATED" && msg.state) {

        console.log("🔄 otra pestaña actualizó → usando snapshot");

        LaunchCore.state.current = msg.state;

        const timingState = LaunchCore.getTimingState(msg.state);
        LaunchCore.logTimingState(msg.state, "broadcast");

        LaunchCore.render({
          ...msg.state.payload,
          __status: msg.state.status
        });

        if (timingState !== "IDLE") {
          LaunchCore.scheduleNext(msg.state.timing.nextUpdate);
        }

        return;
      }

      if (msg.type === "CODE_UPDATED") {
        console.log("💥 recargando por broadcast (con versión)");

        LaunchCore.reloadWithVersion(msg.version);
      }

    };

    // REANUDANDO DATA CONFIRM SI LO HAY
    LaunchCore.vc.resume();

    LaunchCore.smartCheckNow();

    // 👁 7. VISIBILITY INTELIGENTE
    LaunchCore.visibility.init(() => {

      const state = LaunchCore.state.current;
      
      // 🧊 SIN STATE → FETCH
      if (!state) {
        console.log("⚡ sin state → fetch");
        fetchAndHandle(true);
        return;
      }

      LaunchCore.logTimingState(state, "visibility");
      const timingState = LaunchCore.getTimingState(state);

      // 🏁 1. EXPIRADO → FETCH
      if (timingState === "EXPIRED") {
        console.log("⚡ expirado → fetch inmediato");
        fetchAndHandle(true);
        window.__vcCheckNow?.();
      }

      const pending = localStorage.getItem("lc_pending_version");

      // 🥇 2. VC MANDA (EXCEPCIÓN VÁLIDA)
      if (pending) {

        const nextConfirm = Number(
          localStorage.getItem("vc_next_confirm")
        );

        if (!nextConfirm || Date.now() >= nextConfirm) {
          console.log("⚡ visibility → confirm inmediato");
          LaunchCore.vc.confirm();
        }

        window.__vcCheckNow?.();
        return;
      }

      const { timing, status } = state;

      // 🥈 CLOSED → NO FETCH JAMÁS
      if (status.launch === "closed") {
        console.log("💀 closed → skip total");
        window.__vcCheckNow?.();
        return;
      }

      // estado inconsistente cuando "launch status != closed"
      if (timingState === "IDLE") {
        console.warn("⚠️ estado inconsistente: no closed pero sin nextUpdate");
        fetchAndHandle(true); // 🔥 auto-recuperación
        return;
      }

      window.__vcCheckNow?.();

    });

    // ⏱ 8. SCHEDULE INICIAL
    const state = LaunchCore.state.current;

    if (state) {
      const timingState = LaunchCore.getTimingState(state);

      if (timingState !== "IDLE") {
        LaunchCore.scheduleNext(state.timing.nextUpdate);
      }
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



// ============== SCHEDULE NEXT UPDATE =================

LaunchCore.scheduleNext = function(nextUpdate){

  const current = LaunchCore.state.current;
  
  if (!current) {
    console.warn("💀 sin state → no schedule");
    return;
  }

  const timingState = LaunchCore.getTimingState(current);

  // 💀 sin timing válido → nada que hacer
  if (timingState === "IDLE") {
    console.log("💀 sin nextUpdate → no schedule");
    return;
  }

  // ⚡ vencido → fetch inmediato
  if (timingState === "EXPIRED") {
    console.log("⚡ timer vencido → fetch inmediato");
    fetchAndHandle(true);
    return;
  }

  const now = Date.now();
  let delay = nextUpdate - now;

  // 🧠 BASE DELAY (esperar al worker)
  const BASE_DELAY = 100; // 1.5s (puedes ajustar)

  // 🎲 JITTER (anti estampida)
  const JITTER = Math.random() * 2000; // 0 - 2s

  const finalDelay = delay + BASE_DELAY + JITTER;

  if (!Number.isFinite(finalDelay)) {
    console.warn("💀 delay inválido");
    return;
  }

  const key = `core-main-${LaunchCore.config.page}`;

  const nextTime = formatNextUpdate(nextUpdate);

  console.log(
    "🎲 jitter aplicado:",
    `base=${BASE_DELAY}ms`,
    `+ jitter=${Math.round(JITTER)}ms`
  );

  console.log(
    "⏱ próximo fetch:",
    nextTime,
    "| en:",
    formatTime(finalDelay),
    `(${finalDelay} ms)`
  );

  console.log("⏱ scheduleNext → estado:", timingState);

  LaunchCore.scheduler.schedule(
    key,
    () => {
      console.log("🚀 ejecutando fetch programado");
      fetchAndHandle(true);
    },
    Math.max(finalDelay, 1000),
    { allowHidden: false }
  );

};



// ============== VERSION CHECKER FUNCTIONS ============================

LaunchCore.vc = {};

LaunchCore.vc._confirming = false;

LaunchCore.vc.confirm = async function(){

  if (LaunchCore.vc._confirming) {
    console.log("🧠 VC ya confirmando → skip");
    return;
  }

  if (document.hidden) {
    console.log("😴 VC confirm pausado (hidden)");
    return;
  }

  LaunchCore.vc._confirming = true;

  try {

    console.log("🧠 VC: confirmando...");

    const pending = localStorage.getItem("lc_pending_version");
    if (!pending) return;

    const currentVersion = LaunchCore.state.current?.meta?.version;

    if (!currentVersion) {
      console.log("🆕 primera carga → skip detect");
      return;
    }

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

      LaunchCore.channel.postMessage({
        type: "STATE_UPDATED",
        state: LaunchCore.state.current
      });

    } else {
      console.log("⌛ aún no lista");
    }

  } finally {
    LaunchCore.vc._confirming = false;
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



// =========== FORMATEADORES DEL TIMING ==================

// ================= TIMING STATE ========================

LaunchCore.getTimingState = function(state){

  if (!state || !state.timing) {
    return "IDLE";
  }

  const { nextUpdate } = state.timing;

  if (nextUpdate === null) return "IDLE";

  if (Date.now() >= nextUpdate) return "EXPIRED";

  return "SCHEDULED";
};



LaunchCore.logTimingState = function(state, context = ""){

  const timingState = LaunchCore.getTimingState(state);

  const nextUpdate = state?.timing?.nextUpdate;

  let extra = "";

  if (nextUpdate !== null) {
    const delay = nextUpdate - Date.now();
    extra = `| en: ${formatTime(delay)}`;
  }

  console.log(`⏱ TIMING [${context}] → ${timingState}`, extra);

};



// ==========  RENDER MACHINE ==================

LaunchCore.render = async function(data){

  const page = LaunchCore.config.page;
  const module = LaunchCore.modules[page];

  if(!module){
    console.warn("No hay módulo para render:", page);
    return;
  }

  /*console.group("🎨 RENDER DEBUG");

  console.log("📦 DATA FINAL QUE RECIBE EL FRONT:", data);
  console.log("📁 evento:", data?.evento);
  console.log("💰 pricing:", data?.pricing);

  console.groupEnd();*/

  await module.render(data);

  console.log("🎨 renderizando",page);

};



// ============  SMART VERSION CHECK ===================

LaunchCore.smartCheckNow = function(){

  console.log("🧠 smart check → ping VC");

  if(window.__vcCheckNow){
    window.__vcCheckNow();
  }

};



// =============== FORMATEAR TIME ====================

function formatTime(ms){

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



function formatNextUpdate(ts){

  if (!ts) return "—";

  const now = Date.now();
  const diff = ts - now;

  const oneDay = 24 * 60 * 60 * 1000;

  const date = new Date(ts);

  if (diff > oneDay) {
    // 📅 largo plazo → fecha completa
    return date.toLocaleString(); 
  }

  // ⏰ corto plazo → solo hora
  return date.toLocaleTimeString();
}



/* =====================================================
   6. EVENT SYSTEM (on, emit, handlers)
===================================================== */

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

    const currentVersion = localStorage.getItem("lc_code_version");

    console.log("💾 local code:", currentVersion);
    console.log("🌐 github code:", newVersion);

    // 🧠 MISMA VERSIÓN → NO HACER NADA
    if(currentVersion === newVersion){
      console.log("😴 misma versión, no reload");
      return;
    }

    // 🔥 guardar nueva versión de código
    localStorage.setItem("lc_code_version", newVersion);

    // 🧠 VERSION COMPARTIDA ENTRE TABS
    let versionTag = localStorage.getItem("lc_code_update_version");

    if (!versionTag) {
      versionTag = LaunchCore.globals.fechaHumana();
      localStorage.setItem("lc_code_update_version", versionTag);
    }

    console.log("🚀 versionTag compartida:", versionTag);

    // 📡 avisar a otras tabs
    if (LaunchCore.channel) {
      LaunchCore.channel.postMessage({
        type: "CODE_UPDATED",
        version: versionTag
      });
    }

    // 🔥 recargar ESTA tab también
    LaunchCore.reloadWithVersion(versionTag);

  } catch(e){
    console.warn("❌ error en code:update", e);
  }

});



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



LaunchCore.globals.fechaHumana = function(){
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");

  return (
    d.getFullYear() +
    pad(d.getMonth()+1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
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
    checkInterval: 60*60*1000, // PRODUCCIÓN 15*60*1000 o incluso 60*60*1000,
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

LaunchCore.reloadWithVersion = function(version){

  const v = version || LaunchCore.globals.fechaHumana();

  const url =
    location.origin +
    location.pathname +
    "?v=" + v;

  console.log("🚀 recargando con versión:", v);

  window.location.replace(url);
};



// ============== MODULE REGISTRY (AUTO INIT) ===================

LaunchCore.modules = {};


LaunchCore.register = function(name, fn){
  LaunchCore.modules[name] = fn;
};