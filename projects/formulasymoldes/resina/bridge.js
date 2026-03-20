/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

let workerBusy = false;
let ultimaRevision = 0;
let intervaloRevisionDin = 60 * 60 * 1000; // Valor por defecto, el worker lo actualizará

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
  proxima: document.getElementById("launch-proxima")
};

/* =====================================================
   ENGINE INICIALIZADOR
===================================================== */
async function initLaunchEngine() {

  const ahora = Date.now();

  if (ahora - ultimaRevision < intervaloRevisionDin) {
    return;
  }

  if (workerBusy) return;
  workerBusy = true;
  
  try {
    // 1. Consultar al cerebro (Worker)
    const data = await LaunchCore.fetchWorker("").catch(() => null);

    if (!data) {
      workerBusy = false;
      return;
    }

    // 2. Verificar cierre absoluto del evento
    if (data.eventoCerrado) {
      if (DOM.root) DOM.root.innerHTML = data.htmlEventoCerrado;
      workerBusy = false; // 🔥 IMPORTANTE
      return;
    }

    // 3. Pintar textos de oferta superior
    if (DOM.offerText) {
      DOM.offerText.innerText = data.offerText;
      DOM.offerText.style.display = data.offerTextDisplay;
    }

    // 4. Pintar oferta Sticky y ajustar padding
    if (DOM.offerSticky) {
      DOM.offerSticky.style.display = data.offerStickyDisplay;
      DOM.offerSticky.innerHTML = data.offerStickyHtml;
      
      if (data.offerStickyDisplay === "block" && DOM.sectionPadding) {
        if (window.innerWidth < 480) {
          DOM.sectionPadding.style.paddingTop = "50px";
        } else {
          DOM.sectionPadding.style.paddingTop = "70px";
        }
      } else if (DOM.sectionPadding) {
        // Opcional: reiniciar padding si se oculta
        // DOM.sectionPadding.style.paddingTop = "0px";
      }
    }

    // 5. Título del Calendario
  if (DOM.calendarTitle) {
    DOM.calendarTitle.innerHTML = data.calendarTitleHtml;
  }

  if (DOM.info) DOM.info.innerHTML = data.infoPaginaHtml;

  // 6. Header y Clases
  if (DOM.header) DOM.header.innerHTML = data.headerText;

  if (DOM.clases) {
    const html = await renderClases(data.clases);
    DOM.clases.innerHTML = html;
  }

  // Clon de info de próxima clase (ANTES del render de componentes)
  if (DOM.proxima) {

    if (data.proximaClase) {

      const html = await renderClases([data.proximaClase]);
      DOM.proxima.innerHTML = html;
      DOM.proxima.style.display = "block";

    } else {

      DOM.proxima.style.display = "none";

    }

  }

  // 🔥 RENDER GLOBAL DE COMPONENTES (UNA SOLA VEZ)
  await renderComponentes();

  // 7. Configurar el Contador Local
  if (DOM.countdown) {
    DOM.countdown.style.display = data.countdownDisplay;
  }

  if (data.countdownDisplay !== "none" && data.countdownTarget) {

    LaunchCore.countdown.start(data.countdownTarget);

  } else {

    LaunchCore.countdown.stop();

  }

  // 🔥 liberar lock AL FINAL (importante)
  workerBusy = false;

    // 8. Programar siguiente actualización (despertador automático)
    if (data.intervaloRevisionMs) intervaloRevisionDin = data.intervaloRevisionMs;
    LaunchCore.visibility.updateInterval(intervaloRevisionDin);
    
    let delay = data.siguienteActualizacionMs ?? intervaloRevisionDin;

    LaunchCore.scheduler.programar(initLaunchEngine, delay);

    ultimaRevision = Date.now();

    } catch (error) {
      workerBusy = false;
      console.warn("Fallo temporal cargando Launch Engine:", error);
    }
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


  let flagTemplateCache = null;

  async function renderFlags() {

    const flags = document.querySelectorAll(".flag");

    if (!flagTemplateCache) {
      flagTemplateCache = await fetch(
        LaunchCore.paths.components + "flag.html"
      ).then(r => r.text());
    }

    flags.forEach(el => {

      const cc = el.dataset.cc;
      if (!cc) return;

      el.innerHTML = flagTemplateCache
        .replace("{{cc}}", cc);

    });

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
    await renderFlags();
  }

  
  /* =====================================================
     EVENT LISTENERS (Manejo de visibilidad y caché)
  ===================================================== */
  if (document.readyState === "loading") {
     document.addEventListener("DOMContentLoaded", initLaunchEngine);
   } else {
     initLaunchEngine();
   }      
  
  window.addEventListener("pageshow", function(e) {
    if (e.persisted) {
      initLaunchEngine();
    }
  });
  
  LaunchCore.visibility.init(initLaunchEngine, intervaloRevisionDin);

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