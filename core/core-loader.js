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

      let query = window.location.search;

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

      if(!res.ok) throw new Error("Worker error");

      const data = await res.json();

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

  LaunchCore.timing = LaunchCore.timing || {};

  LaunchCore.timing.shouldRun = function(){

    const next = Number(localStorage.getItem("lc_timer_core-main") || 0);

    if(!next){
      console.log("⏳ no hay timer");
      return true; // importante 👀
    }

    const now = Date.now();
    const diff = next - now;

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const parts = [];

    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    // por si todo es 0
    const diffHuman = parts.length ? parts.join(" ") : "0s";

    console.log("🧠 shouldRun?", {
      now: new Date(now).toLocaleString(),
      next: new Date(next).toLocaleString(),
      diff_ms: diff,
      diff_human: diffHuman
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

  if(isRunning){
    console.log("⛔ run bloqueado (ya en ejecución)");
    return;
  }

  isRunning = true;
  cacheInvalidated = false; // 👈 RESET AQUÍ SIEMPRE

  try {

    console.log("🚀 CORE run pipeline...");

    /* =================================================
        CACHÉ EN LOCALSTORAGE
    ================================================= */

    const cached = localStorage.getItem("lc_data");

    console.log("🧪 DEBUG CACHE", {
      next: localStorage.getItem("lc_next_update"),
      now: Date.now(),
      diff: Number(localStorage.getItem("lc_next_update")) - Date.now()
    });

    if(cached){

      try{

        const rawCached = JSON.parse(cached);

        const next = Number(localStorage.getItem("lc_next_update") || 0);

        if(!next){
          console.log("⚠️ sin next_update → invalidando");
          cacheInvalidated = true;
        }

        const { data, control } = LaunchCore.normalize(rawCached);

        const cachedVersion = localStorage.getItem("lc_data_version");
        const currentVersion = control?.version;

        if(!currentVersion){
          console.log("⚠️ cache sin versión → invalidando");
          localStorage.removeItem("lc_data");
          cacheInvalidated = true;

        } if(!cachedVersion){
          console.log("⚠️ sin versión guardada → invalidando cache");
          localStorage.removeItem("lc_data");
          cacheInvalidated = true;

        } else if(cachedVersion !== String(currentVersion)){

          console.log("💥 cache inválido por versión");
          localStorage.removeItem("lc_data");
          cacheInvalidated = true;

        } else {

          console.log("⚡ usando cache válida");

          await LaunchCore.render(data);

          const now = Date.now();
          const next = Number(localStorage.getItem("lc_next_update") || 0);
          let delay = next - now;

          console.log("🔥 CACHE delay REAL:", delay);

          console.log("🔥 CACHE CONTROL:", control);
          
          if(delay > 0 && !isNaN(delay)){

            // 💥 EVITAR delays absurdos
            const safeDelay = Math.max(delay, 5000);

            console.log("🧠 programando en:", safeDelay);

            LaunchCore.scheduler.programar(
              "core-main",
              () => LaunchCore.execute("scheduler"),
              safeDelay
            );

          } else {

            console.log("⚠️ tiempo vencido → fetch inmediato");
            cacheInvalidated = true;

          }

          // 💥 CLAVE: SALIR
          if(!forceFetch){
            isRunning = false;
            return;
          }

        }

      }catch(e){
        console.warn("❌ cache corrupta");
        localStorage.removeItem("lc_data");
        cacheInvalidated = true;

      }

    }

    const hasCache = !!localStorage.getItem("lc_data");

      const next = Number(localStorage.getItem("lc_next_update") || 0);
      const now = Date.now();

      if(!force && hasCache && !cacheInvalidated && now < next){
      console.log("⏸ usando cache, no fetch");
      isRunning = false;
      return;
    }

    let raw;

    // 🔥 USAR DATA EXTERNA SI EXISTE
    if(options.externalData){
      console.log("⚡ usando externalData (no fetch)");

      raw = options.externalData;

    }else{

      raw = await LaunchCore.fetchWorker(
        LaunchCore.config.endpoint,
        forceFetch
      );

    }

    if(!raw){
      console.warn("Sin data");
      return;
    }

    // 💥 CONVERTIR TIEMPO RELATIVO A ABSOLUTO
    if(raw?.siguienteActualizacionMs){

      const delay = Number(raw.siguienteActualizacionMs);
      const nextTime = Date.now() + delay;

      // 💥 GUARDAR GLOBAL (FUENTE DE VERDAD)
      localStorage.setItem("lc_next_update", nextTime);

      console.log("⏳ next update en", delay);

    }

    localStorage.setItem("lc_data", JSON.stringify(raw));

    // 🔥 NORMALIZAR
    const { data, control } = LaunchCore.normalize(raw);

    // 💥 guardar versión REAL
    if(control?.version){
      localStorage.setItem("lc_data_version", String(control.version));
    }

    // 👉 render SOLO data limpia
    await LaunchCore.render(data);

    // 🧠 PROGRAMACIÓN CENTRALIZADA (FETCH REAL)
    //const next = Number(localStorage.getItem("lc_next_update") || 0);
    let delay = next - Date.now();

    console.log("🔥 FETCH delay REAL:", delay);

    if(delay > 0 && !isNaN(delay)){

      let finalDelay = delay + Math.random() * 2000;
      finalDelay = Math.max(finalDelay, 5000);

      console.log("🧠 CORE scheduling in", finalDelay);

      LaunchCore.scheduler.programar(
        "core-main",
        () => LaunchCore.execute("scheduler"),
        finalDelay
      );

    } else {

      console.log("⚠️ FETCH sin timing válido");

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

LaunchCore.on("data:detected", ({ version, confirmDelay }) => {

  console.log("🧠 CORE: cambio detectado", version);

  // 🔥 guardar pendiente (persistencia anti F5)
  localStorage.setItem("lc_pending_version", version);

  // 🔥 cancelar confirmaciones anteriores
  LaunchCore.scheduler.cancelar("vc-confirm");

  const delay = confirmDelay || 60000;

  const nextConfirm = Date.now() + delay;
  localStorage.setItem("vc_next_confirm", nextConfirm);

  console.log("⏳ confirm en", delay);

  LaunchCore.scheduler.programar(
    "vc-confirm",
    async () => {

      console.log("🧠 CORE: confirmando contra WORKER...");

      const pending = localStorage.getItem("lc_pending_version");
      if(!pending) return;

      const result = await LaunchCore.getWorkerVersion();

      const workerVersion = result?.version;

      console.log("🛰️ worker version:", workerVersion);

      if(String(workerVersion) === String(pending)){

        console.log("✅ DATA CONFIRMADA");

        // 🔥 persistencia REAL
        localStorage.setItem("lc_data_version", pending);
        localStorage.removeItem("lc_pending_version");

        if(result.raw?.siguienteActualizacionMs){

          const delay = Number(result.raw.siguienteActualizacionMs);
          const nextTime = Date.now() + delay;

          localStorage.setItem("lc_next_update", nextTime);

          console.log("⏳ (confirm) next update en", delay);

        }

        // 🔥 cachear data completa
        localStorage.setItem("lc_data", JSON.stringify(result.raw));

        // 💥 EJECUCIÓN SIN FETCH EXTRA
        LaunchCore.run({
          force: true,
          externalData: result.raw
        });

      } else {
        console.log("⌛ worker aún no actualizado");
      }

    },
    delay
  );

});


LaunchCore.on("code:update", async () => {

  console.log("💥 CORE: CODE UPDATE DETECTADO");

  try {

    if(!LaunchCore.config.codeVersionUrl){
      console.warn("⚠️ codeVersionUrl no definido");
      return;
    }

    // 🔥 obtener versión real de GitHub otra vez (seguro)
    const res = await fetch(LaunchCore.config.codeVersionUrl, {
      cache: "no-store"
    });

    const data = await res.json();
    const newVersion = String(data.commit);

    const savedVersion = localStorage.getItem("lc_code_version");

    console.log("💾 local code:", savedVersion);
    console.log("🌐 github code:", newVersion);

    // 🧠 evitar reload infinito
    if(savedVersion === newVersion){
      console.log("😴 misma versión, no reload");
      return;
    }

    // 🔥 guardar nueva versión
    localStorage.setItem("lc_code_version", newVersion);

    console.log("🚀 recargando con nueva versión...");

    /* =====================================================
       🔥 URL VERSIONADA HUMANA (TU JOYA)
    ===================================================== */

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

    function buildUrl(){
      return location.origin + location.pathname + "?v=" + fechaHumana();
    }

    // 💥 reload elegante (sin contaminar history)
    window.location.replace(buildUrl());

  } catch(e){
    console.warn("❌ error en code:update", e);
  }

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
  
  LaunchCore.config.endpoint = "/";
  console.log("🧠 endpoint configurado (principal):", LaunchCore.config.endpoint);

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

    });

    // 🔥 RETOMAR CONFIRM SI EXISTE
    const savedConfirm = Number(localStorage.getItem("vc_next_confirm") || 0);

    if(savedConfirm && savedConfirm > Date.now()){

      const delay = savedConfirm - Date.now();

      console.log("⏳ retomando confirm en", delay);

      LaunchCore.scheduler.programar(
        "vc-confirm",
        async () => {

          const pending = localStorage.getItem("lc_pending_version");
          if(!pending) return;

          const result = await LaunchCore.getWorkerVersion();

          if(String(result?.version) === String(pending)){

            console.log("✅ DATA CONFIRMADA (recovery)");

            localStorage.setItem("lc_data_version", pending);
            localStorage.removeItem("lc_pending_version");

            localStorage.setItem("lc_data", JSON.stringify(result.raw));

            LaunchCore.run({
              force: true,
              externalData: result.raw
            });

          }

        },
        delay
      );
    }

    await LaunchCore.use("versionChecker");

    console.log("🔥 LLAMANDO VERSION CHECKER...");

    // 🚀 SOLO 1 RUN
    LaunchCore.execute("init", {
      force: true
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