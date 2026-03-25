/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

let currentExecution = null;
let ultimaRevision = 0;
let intervaloRevisionDin = 60 * 60 * 1000; // Valor por defecto, el worker lo actualizará
let initialLoadExecuted = false;
let firstLoadDone = false;
let eventClosed = false;

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

  if (currentExecution) {
    console.warn("⛔ Ya hay ejecución, cancelando duplicado");
    return currentExecution;
  }

  const ahora = Date.now();

  currentExecution = (async () => {

    try {

      console.log("🚀 Fetching worker...");

      let data;

      if(externalData){
        console.log("⚡ Usando data externa (sin fetch)");
        data = externalData;
      } else {
        data = await LaunchCore.fetchWorker("", forceFetch);
      }

      if (!data) return;

      sessionStorage.setItem("lc_rendered", "1");
      firstLoadDone = true; // 👈 AÑADE ESTO

      // 🔥 ESTADO CERRADO (SIN DESTRUIR DOM)
      if (data.eventoCerrado) {

        eventClosed = true;

        console.log("💀 EVENT CLOSED → STOP EVERYTHING");

        // 💥 apagar timers
        LaunchCore.scheduler.cancelar("bridge-main");
        LaunchCore.scheduler.cancelar("vc-check-loop");

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

        currentExecution = null;
        return;
      }

      if(!data.eventoCerrado && eventClosed){
        console.log("🧟 EVENT REOPENED");

        eventClosed = false;
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

      // 🔥 INTERVALOS DINÁMICOS
      if (data.intervaloRevisionMs) {
        intervaloRevisionDin = data.intervaloRevisionMs;

      }

      const delay = data.siguienteActualizacionMs ?? intervaloRevisionDin;

      LaunchCore.timing.setNext(delay);

      console.log("⏰ next run in", delay);

      if(!document.hidden){

        LaunchCore.scheduler.programar(
          "bridge-main",
          () => {

            if(document.hidden){
              console.log("💤 scheduler killed (tab hidden)");
              LaunchCore.scheduler.cancelar("bridge-main");
              return;
            }

            initLaunchEngine(false);

          },
          delay
        );

      } else {

        console.log("💤 no program scheduler (hidden)");

      }

      ultimaRevision = Date.now();

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
    //await renderFlags();
  }


  let lastWake = 0;

  function forceRefreshFromBackground(source = "unknown"){

    const now = Date.now();

    if(now - lastWake < 2000){
      console.log("⛔ skip spam:", source);
      return;
    }

    lastWake = now;

    const next = LaunchCore.timing.getNext();

    if(next && now < next){
      console.log("😴 skip early wake:", source);
      return;
    }

    LaunchCore.scheduler.cancelar("bridge-main");
    LaunchCore.scheduler.cancelar("vc-check-loop");

    // 💀 BLOQUEO REAL
    if(eventClosed){
      console.log("💀 skip wake, event closed");
      return;
    }

    console.log("🔥 WAKE → FETCH REAL:", source);

    safeRun();

  }


  let isFetching = false;

  async function safeRun(){

    if(document.hidden){
      console.log("💤 abort fetch, tab hidden");
      return;
    }

    if(isFetching){
      console.log("⛔ fetch locked");
      return;
    }

    isFetching = true;

    try{
      await LaunchCore.run({
        force: true,
        forceFetch: true
      });
    } finally {
      isFetching = false;
    }

  }

  
  /* =====================================================
     EVENT LISTENERS (Manejo de visibilidad y caché)
  ===================================================== */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (initialLoadExecuted) return;
      initialLoadExecuted = true;
      safeRun();
    });
  } else {
    if (!initialLoadExecuted) {
      initialLoadExecuted = true;
      safeRun();
    }
  }


  document.addEventListener("visibilitychange", () => {

    if(document.hidden){

      console.log("💤 tab hidden → FULL STOP");

      LaunchCore.scheduler.cancelar("bridge-main");
      LaunchCore.scheduler.cancelar("vc-check-loop"); // 🔥 ESTE FALTABA

    } else {

      forceRefreshFromBackground("visibility");

    }

  });


  window.addEventListener("focus", () => {
    forceRefreshFromBackground("focus");
  });


  window.addEventListener("pageshow", function(e){
    
    if(e.persisted){

      if(eventClosed) return;

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