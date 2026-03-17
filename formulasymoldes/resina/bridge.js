/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

// ¡IMPORTANTE! Reemplaza esto con la URL real de tu Cloudflare Worker
const WORKER_URL = "https://launch-engine.miroslaw-mm.workers.dev/";

let workerBusy = false;
let ultimaRevision = 0;
let countdownInterval = null;
let schedulerTimeout = null;
let targetTiempo = null; // Guardará el timestamp objetivo para el contador
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
    const params = new URLSearchParams(window.location.search);
    
    //const respuesta = await fetch(WORKER_URL + "?" + params.toString());
    const respuesta = await fetch(WORKER_URL + window.location.search);
    
    if (!respuesta.ok) throw new Error("Error conectando con el Worker");
    
    const data = await respuesta.json();
    
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

      if (targetTiempo !== data.countdownTarget) {
        targetTiempo = data.countdownTarget;
        iniciarCountdown();
        
      }
    
    } else {
    
      detenerCountdown();
      targetTiempo = null;
    
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
     FUNCIONES PARA EL CONTADOR (Única lógica de cálculo)
  ===================================================== */
  function iniciarCountdown() {
    if (countdownInterval) return;
    actualizarCountdown(); // Llamada inmediata para no esperar 1 seg
    countdownInterval = setInterval(actualizarCountdown, 1000);
  }
  
  function detenerCountdown() {
    if (!countdownInterval) return;
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  const COUNTDOWN_DOM = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds")
  };
  
  function actualizarCountdown() {
    if (!targetTiempo) return;
  
    const ahora = new Date().getTime();
    const diferencia = targetTiempo - ahora;
  
    if (diferencia <= 0) {
    detenerCountdown();
    //initLaunchEngine(); // volver a consultar al worker
    return;
  }
  
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
  
    COUNTDOWN_DOM.days.textContent = String(dias).padStart(2, "0");
    COUNTDOWN_DOM.hours.textContent = String(horas).padStart(2, "0");
    COUNTDOWN_DOM.minutes.textContent = String(minutos).padStart(2, "0");
    COUNTDOWN_DOM.seconds.textContent = String(segundos).padStart(2, "0");
  }

   /* FUNCIÓN PARA EL BOTÓN DEL CALENDARIO */
   function toggleCalendarMenu() {
     const menu = document.getElementById("calendar-menu");
     menu.style.display = menu.style.display === "flex" ? "none" : "flex";
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
