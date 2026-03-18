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
let schedulerTimeout = null;
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

  if (workerBusy) return;
  workerBusy = true;
  
  try {
    // 1. Consultar al cerebro (Worker)
    const data = await LaunchCore.fetchWorker("");

    // 2. Verificar cierre absoluto del evento
    if (data.eventoCerrado) {
      if (DOM.root) DOM.root.innerHTML = data.htmlEventoCerrado;
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

    // 6. Header, Clases y Botón Live
    if (DOM.header) DOM.header.innerHTML = data.headerText;
    if (DOM.clases) DOM.clases.innerHTML = data.clasesHtml;
    
    // 7. Configurar el Contador Local
    if (DOM.countdown) {
      DOM.countdown.style.display = data.countdownDisplay;
      
    }
    
    if (data.countdownDisplay !== "none" && data.countdownTarget) {

      LaunchCore.countdown.start(data.countdownTarget);

    } else {

      LaunchCore.countdown.stop();

    }
    
    workerBusy = false;
    
    // Clon de info de próxima clase
    if (DOM.proxima) {

      if (data.proximaClaseHtml) {
    
        DOM.proxima.innerHTML = data.proximaClaseHtml;
        DOM.proxima.style.display = "block";
    
      } else {
    
        DOM.proxima.style.display = "none";
    
      }
    
    }   

    // 8. Programar siguiente actualización (despertador automático)
    if (data.intervaloRevisionMs) intervaloRevisionDin = data.intervaloRevisionMs;
    
    let delay = data.siguienteActualizacionMs ?? intervaloRevisionDin;

    // jitter proporcional (hasta 20% del delay)
    const jitter = delay * 0.2 * Math.random();
    delay += jitter;
    
    if (delay < 2000) delay = 2000;
    
    programarSiguienteActualizacion(delay);

    ultimaRevision = Date.now();

    } catch (error) {
      workerBusy = false;
      console.warn("Fallo temporal cargando Launch Engine:", error);
    }
  }

  /* =====================================================
     REPROGRAMACIÓN (Despertador)
  ===================================================== */
  function programarSiguienteActualizacion(delay) {
    if (schedulerTimeout) {
      clearTimeout(schedulerTimeout);
    }
    
    if (!delay) return;
  
    schedulerTimeout = setTimeout(() => {
      initLaunchEngine();
    }, delay);
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
  
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
  
    const ahora = Date.now();
    if (ahora - ultimaRevision < intervaloRevisionDin) {
      return; // Aún no toca revisar
    }
  
    initLaunchEngine();
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