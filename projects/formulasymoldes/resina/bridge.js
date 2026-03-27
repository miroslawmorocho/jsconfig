/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

let currentExecution = null;
let initialLoadExecuted = false;

/* =====================================================
   DOM
===================================================== */
const DOM = {
  root: document.getElementById("launch-engine"),
  header: document.getElementById("launch-header"),
  clases: document.getElementById("launch-clases"),
  countdown: document.getElementById("contador-wrapper"),
  offerSticky: document.getElementById("offer-sticky"),
  info: document.getElementById("launch-info"),
  calendarTitle: document.getElementById("launch-calendar-title"),
  offerText: document.getElementById("offer-deadline"), // Extraído a DOM para mejor orden
  sectionPadding: document.getElementById("section-6f21106b"), // El section de tu oferta
  proxima: document.getElementById("launch-proxima"),
  estadoCerrado: document.getElementById("estado-cerrado")
};

/* =====================================================
   ENGINE INICIALIZADOR
===================================================== */
async function initLaunchEngine(force = false, externalData = null, forceFetch = false){

  if(currentExecution && !options?.force){
    console.log("⛔ Ya hay ejecución, cancelando duplicado");
    return;
  }

  currentExecution = (async () => {

    try {

      console.log("🚀 Fetching worker...");

      let data;

      if(externalData){
        console.log("⚡ Usando data externa (sin fetch)");
        data = externalData;
      } else {

        const cached = localStorage.getItem("lc_data_cache");

        if(cached){

          try{
            const parsed = JSON.parse(cached);

            if(parsed?.eventoCerrado && !forceFetch && !externalData){

              const nextUpdate = Number(localStorage.getItem("lc_next_update") || 0);

              if(Date.now() < nextUpdate){
                console.log("💀 Evento cerrado → usando cache");
                data = parsed;
              }

            }

          }catch(e){
            console.warn("⚠️ cache corrupto → limpiando");
            localStorage.removeItem("lc_data_cache");
          }

        }

        // 🧠 intentar cache primero
        if(!data && !forceFetch && !LaunchCore.timing.shouldRun()){

          if(cached){
            try{
              console.log("💾 Usando cache local (NO fetch)");
              data = JSON.parse(cached);
            }catch(e){
              console.warn("⚠️ cache corrupto → limpiando");
              localStorage.removeItem("lc_data_cache");
            }
          }
        }

        // 🔥 si no hay data → fetch normal
        if(!data){
          console.log("🌐 Fetch real al worker");
          data = await LaunchCore.fetchWorker("", forceFetch);

          localStorage.setItem("lc_data_cache", JSON.stringify(data));
          localStorage.setItem("lc_data_time", Date.now());
        }

      }
      
      const savedTime = Number(localStorage.getItem("lc_data_time") || 0);

      if(Date.now() - savedTime > 7 * 24 * 60 * 60 * 1000){
        localStorage.removeItem("lc_data_cache");
        localStorage.removeItem("lc_data_time");
      }

      if (!data) return;

      // 🔥 sincronizar estado global con el worker
      LaunchCore.state = LaunchCore.state || {};
      LaunchCore.state.eventoCerrado = data.eventoCerrado;

      console.log("🧠 estado eventoCerrado:", data.eventoCerrado);

      // 🔥 ESTADO CERRADO (SIN DESTRUIR DOM)
      if (data.eventoCerrado) {        

        console.log("💀 Evento cerrado → congelando sistema");

        localStorage.setItem("lc_next_update", Number.MAX_SAFE_INTEGER);

        if (DOM.estadoCerrado) {
          DOM.estadoCerrado.innerHTML = data.htmlEventoCerrado;
          DOM.estadoCerrado.style.display = "block";
        }

        if (DOM.header) DOM.header.style.display = "none";
        if (DOM.clases) DOM.clases.style.display = "none";
        if (DOM.countdown) DOM.countdown.style.display = "none";
        if (DOM.info) DOM.info.style.display = "none";
        if (DOM.calendarTitle) DOM.calendarTitle.style.display = "none";
        if (DOM.proxima) DOM.proxima.style.display = "none";
        if (DOM.offerSticky) DOM.offerSticky.style.display = "none";
        if (DOM.offerText) DOM.offerText.style.display = "none";

        currentExecution = null; // 🔥 CLAVE

        return;
      }

      // AL REABRIR, SI AÚN ESTÁ LA PESTAÑA ABIERTA RECONSTRUIMOS
      // 🔥 RESTAURAR UI NORMAL
      if (DOM.estadoCerrado) {
        DOM.estadoCerrado.innerHTML = "";
        DOM.estadoCerrado.style.display = "none";
      }

      // 🔥 volver a mostrar todo
      if (DOM.header) DOM.header.style.display = "";
      if (DOM.clases) DOM.clases.style.display = "";
      if (DOM.countdown) DOM.countdown.style.display = "";
      if (DOM.info) DOM.info.style.display = "";
      if (DOM.calendarTitle) DOM.calendarTitle.style.display = "";
      if (DOM.proxima) DOM.proxima.style.display = "";

      // 🔥 OFFER TEXT
      if (DOM.offerText) {
        DOM.offerText.innerText = data.offerText;
        DOM.offerText.style.display = data.offerTextDisplay;
      }

      // 🔥 STICKY
      if (DOM.offerSticky) {
        DOM.offerSticky.style.display = data.offerStickyDisplay;
        DOM.offerSticky.innerHTML = data.offerStickyHtml;

        if (data.offerStickyDisplay === "block" && DOM.sectionPadding) {
          DOM.sectionPadding.style.paddingTop =
            window.innerWidth < 480 ? "50px" : "70px";
        }
      }

      // 🔥 TITULO
      if (DOM.calendarTitle) {
        DOM.calendarTitle.innerHTML = data.calendarTitleHtml;
      }

      if (DOM.info) DOM.info.innerHTML = data.infoPaginaHtml;
      if (DOM.header) DOM.header.innerHTML = data.headerText;

      // 🔥 CLASES
      if (DOM.clases) {
        const html = await renderClases(data.clases);
        DOM.clases.innerHTML = html;
      }

      // 🔥 PROXIMA
      if (DOM.proxima) {
        if (data.proximaClase) {
          const html = await renderClases([data.proximaClase]);
          DOM.proxima.innerHTML = html;
          DOM.proxima.style.display = "block";
        } else {
          DOM.proxima.style.display = "none";
        }
      }

      // 🔥 COMPONENTES
      await renderComponentes();

      // 🔥 COUNTDOWN
      if (DOM.countdown) {
        DOM.countdown.style.display = data.countdownDisplay;
      }

      if (data.countdownDisplay !== "none" && data.countdownTarget) {
        LaunchCore.countdown.start(data.countdownTarget);
      } else {
        LaunchCore.countdown.stop();
      }

      let savedNext = Number(localStorage.getItem("lc_next_update") || 0);

      if(savedNext && savedNext > Date.now()){
        console.log("🧠 Respetando next_update existente");

        LaunchCore.timing.initFromStorage();

      } else {

        let delay = data.siguienteActualizacionMs;

        if(!delay){

          console.warn("⚠️ sin siguienteActualizacionMs");

          // 👇 asegúrate de congelar bien
          localStorage.setItem("lc_next_update", Number.MAX_SAFE_INTEGER);

          return;
        }

        const jitter = Math.random() * 2000;
        delay += jitter;

        const nextTime = Date.now() + delay;

        localStorage.setItem("lc_next_update", nextTime);

        LaunchCore.timing.setNext(delay);

        console.log("⏰ new next run in", delay);
      }

      if(document.hidden){
        console.log("😴 tab oculta → NO programo siguiente fetch");
      } else {

        // 🚫 NO reprogramar si viene de version checker
        if(!externalData){

          LaunchCore.scheduler.programar(
            "bridge-main",
            () => initLaunchEngine(false),
            delay
          );

        } else {
          console.log("🧠 skip scheduler (externalData)");
        }

      }

    } catch (error) {
      console.warn("💥 Error en engine:", error);
    } finally {
      currentExecution = null;
    }

  })();

  return currentExecution;
}


let calendarTemplateCache = null;

async function renderBotones() {

  const botones = document.querySelectorAll(".clase-boton");

  for (const el of botones) {

    const raw = el.dataset.boton;
    if (!raw) continue;

    let data;
    try {
      data = JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      console.warn("JSON inválido en data-boton", raw);
      continue;
    }

    // 🔥 CALENDAR
    if (data.tipo === "calendar") {

      if (!calendarTemplateCache) {
        calendarTemplateCache = await fetch(
          LaunchCore.paths.components + "calendar-button.html"
        ).then(r => r.text());
      }

      el.innerHTML = calendarTemplateCache
        .replace("{{texto}}", data.texto)
        .replace("{{google}}", data.google)
        .replace("{{ics}}", data.ics);

    }

    // 🔥 LINK NORMAL
    if (data.tipo === "link") {

      el.innerHTML = `
        <a href="${data.url}" target="_blank">
          ${data.texto}
        </a>
      `;

    }

  }

}


let messageTemplateCache = null;

async function renderClases(clases) {

  if (!messageTemplateCache) {
    messageTemplateCache = await fetch(
      LaunchCore.paths.components + "messages.html"
    ).then(r => r.text());
  }

  let html = "";

  clases.forEach(c => {

    const botonJSON = encodeURIComponent(JSON.stringify(c.boton));

    html += messageTemplateCache
      .replace("{{titulo}}", c.titulo)
      .replace("{{mensaje}}", c.mensaje)
      .replace("{{boton}}", botonJSON);

  });

  return html;
}


async function renderComponentes() {
  await renderBotones();   
}


let lastWake = 0;

function forceRefreshFromBackground(source = "unknown"){

  // 💣 BLOQUEO TOTAL SI EVENTO CERRADO
  if(LaunchCore.state?.eventoCerrado){
    console.log("🚫 evento cerrado → no wake:", source);
    return;
  }

  const now = Date.now();

  // 🔥 anti spam básico
  if(now - lastWake < 2000){
    console.log("⛔ skip spam:", source);
    return;
  }

  lastWake = now;

  if(!LaunchCore.timing.shouldRun()){
    console.log("😴 skip early wake:", source);
    return;
  }

  console.log("🔥 WAKE → FETCH REAL:", source);

  // 💣 matar scheduler viejo
  LaunchCore.scheduler.cancelar("bridge-main");

  LaunchCore.run({
    force: true,
    forceFetch: false
  });

}

  
/* =====================================================
    EVENT LISTENERS (Manejo de visibilidad y caché)
===================================================== */
if (!initialLoadExecuted) {
  initialLoadExecuted = true;

  LaunchCore.onReady(() => {
    LaunchCore.run({
      force: true,
      forceFetch: false
    });
  });
}
  
document.addEventListener("visibilitychange", () => {
  if(!document.hidden){
    forceRefreshFromBackground("visibility");
  }
});

window.addEventListener("focus", () => {
  forceRefreshFromBackground("focus");
});

window.addEventListener("pageshow", function(e){
  if(e.persisted){
    forceRefreshFromBackground("pageshow");
  }
});


// botones de calendario
document.addEventListener("click", function(e) {

  const toggle = e.target.closest(".calendar-toggle");

  if (toggle) {
    const container = toggle.parentElement;
    const menu = container.querySelector(".calendar-menu-inline");

    if (!menu) return;

    const isOpen = getComputedStyle(menu).display === "flex";

    // cerrar todos
    document.querySelectorAll(".calendar-menu-inline")
      .forEach(m => m.style.display = "none");

    menu.style.display = isOpen ? "none" : "flex";
    return;
  }

  // cerrar si clic fuera
  document.querySelectorAll(".calendar-menu-inline")
    .forEach(m => m.style.display = "none");

});