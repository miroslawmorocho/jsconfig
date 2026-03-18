(function(){

/* =====================================================
   CONFIG BASE
===================================================== */

const BASE_WORKER_URL = "https://launch-engine.miroslaw-mm.workers.dev";

/* =====================================================
   CORE GLOBAL
===================================================== */

window.LaunchCore = {};
LaunchCore.globals = {};

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
  let callback = null;

  function init(fn, interval){

    callback = fn;

    if(interval){
      minInterval = interval;
    }

    document.addEventListener("visibilitychange", () => {

      if(document.hidden) return;

      const now = Date.now();

      if(now - lastCheck < minInterval){
        return;
      }

      if(typeof callback === "function"){
        callback();
      }

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
   READY (opcional, útil luego)
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
  if(!root) return;

  const config = {
    project: root.dataset.project,
    product: root.dataset.product,
    page: root.dataset.page
  };

  if(!config.page){
    console.warn("No data-page definido");
    return;
  }

  const base = `https://miroslawmorocho.github.io/jsconfig/projects/${config.project}/${config.product}/`;

  const moduleUrl = base + config.page + "-module.js";

  try{

    // 🔥 cargar módulo dinámicamente
    await LaunchCore.loadScript(moduleUrl);

    const module = LaunchCore.modules[config.page];

    if(!module){
      console.warn("Módulo no registrado:", config.page);
      return;
    }

    await module();

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

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  await LaunchCore.loadCSS(BASE+"modules/darkmode/darkmode.css");

  const darkHTML = await fetch(BASE+"modules/darkmode/darkmode.html").then(r=>r.text());
  document.body.insertAdjacentHTML("beforeend", darkHTML);

  await LaunchCore.loadScript(BASE+"modules/darkmode/darkmode.js");

};

LaunchCore.globals.carousel = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  const container = document.getElementById("pricing-carousel");

  if(!container) return; // 🔥 importante

  const root = document.getElementById("launch-engine-root");
  const { project, product } = root.dataset;

  const html = await fetch(
    `https://miroslawmorocho.github.io/jsconfig/projects/${project}/${product}/carousel.html`
  ).then(r=>r.text());

  container.innerHTML = html;

  await LaunchCore.loadCSS(BASE+"modules/carousel/carousel.css");
  await LaunchCore.loadScript(BASE+"modules/carousel/carousel.js");

};

LaunchCore.globals.scroll = async function(){

  const BASE = "https://miroslawmorocho.github.io/jsconfig/";

  await LaunchCore.loadScript(BASE+"modules/scroll/scroll.js");

};