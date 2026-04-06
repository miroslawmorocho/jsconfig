/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

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
  proximaLabel: document.getElementById("launch-proxima-label"),
  proxima: document.getElementById("launch-proxima"),
  ctaFinal: document.getElementById("launch-cta-final"),
  estadoCerrado: document.getElementById("estado-cerrado")
};

/* =====================================================
   ENGINE INICIALIZADOR
===================================================== */
async function initLaunchEngine(data){

  /*console.group("🧪 FRONT DEBUG (bridge)");

  console.log("📦 DATA COMPLETA:", data);
  console.log("📁 evento:", data?.evento);
  console.log("💰 pricing:", data?.pricing);

  console.groupEnd();*/

  // 🔥 guardar ICS globalmente
  window.__calendarICS = data.evento.calendarICS || [];

  // 🔥 ESTADO CERRADO (SIN DESTRUIR DOM)  
  const estado = LaunchCore.state.current?.status?.launch;

  if (estado === "closed") {

    console.log("💀 Evento cerrado → congelando sistema");

    if (DOM.estadoCerrado) {
      DOM.estadoCerrado.innerHTML = data.evento.htmlEventoCerrado;
      DOM.estadoCerrado.style.display = "block";
    }

    if (DOM.header) DOM.header.style.display = "none";
    if (DOM.clases) DOM.clases.style.display = "none";
    if (DOM.countdown) DOM.countdown.style.display = "none";
    if (DOM.info) DOM.info.style.display = "none";
    if (DOM.calendarTitle) DOM.calendarTitle.style.display = "none";
    if (DOM.proximaLabel) DOM.proximaLabel.style.display = "none";
    if (DOM.proxima) DOM.proxima.style.display = "none";
    if (DOM.ctaFinal) DOM.ctaFinal.style.display = "none";
    if (DOM.offerSticky) DOM.offerSticky.style.display = "none";
    if (DOM.offerText) DOM.offerText.style.display = "none";

    return;
  }

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
  if (DOM.proximaLabel) DOM.proximaLabel.style.display = "";
  if (DOM.proxima) DOM.proxima.style.display = "";
  if (DOM.ctaFinal) DOM.ctaFinal.style.display = "";

  // 🔥 OFFER TEXT
  if (DOM.offerText) {
    DOM.offerText.innerText = data.evento.offerText;
    DOM.offerText.style.display = data.evento.offerTextDisplay;
  }

  // 🔥 STICKY
  if (DOM.offerSticky) {
    DOM.offerSticky.style.display = data.evento.offerStickyDisplay;
    DOM.offerSticky.innerHTML = data.evento.offerStickyHtml;

    if (data.evento.offerStickyDisplay === "block" && DOM.sectionPadding && DOM.offerSticky) {

      // 🔥 esperar a que el DOM renderice
      requestAnimationFrame(() => {

        const extraSpace = 10;

        const height = DOM.offerSticky.offsetHeight + extraSpace;

        console.log("📏 sticky height:", height);

        DOM.sectionPadding.style.paddingTop = height + "px";

      });

    }
  }

  // 🔥 TITULO
  if (DOM.calendarTitle) {
    DOM.calendarTitle.innerHTML = data.evento.calendarTitleHtml;
  }

  if (DOM.info) DOM.info.innerHTML = data.evento.infoPaginaHtml;
  if (DOM.header) DOM.header.innerHTML = data.evento.headerText;

  // 🔥 CLASES
  if (DOM.clases) {
    const html = await renderClases(data.evento.clases);
    DOM.clases.innerHTML = html;
  }

  // 🔥 PROXIMA LABEL
  if (DOM.proximaLabel) {
    if (data.evento.proximaClaseLabel) {
      DOM.proximaLabel.innerHTML = data.evento.proximaClaseLabel;
      DOM.proximaLabel.style.display = "block";
    } else {
      DOM.proximaLabel.style.display = "none";
    }
  }

  // 🔥 PROXIMA
  if (DOM.proxima) {
    if (data.evento.proximaClase) {
      const html = await renderClases([data.evento.proximaClase]);
      DOM.proxima.innerHTML = html;
      DOM.proxima.style.display = "block";
    } else {
      DOM.proxima.style.display = "none";
    }    
  }

  // CTA final antes de cierre
  if (DOM.ctaFinal) {

    if (data.evento.offerText && data.evento.offerUrl) {

      DOM.ctaFinal.innerHTML = `
        <div class="clase-item clase-item-cta">
          <div class="clase-info"></div>
          <div class="clase-boton">
            <a href="${data.evento.offerUrl}" target="_blank">
              🔥 Comprar ahora
            </a>
          </div>
        </div>
      `;

      DOM.ctaFinal.style.display = "block";

    } else {
      DOM.ctaFinal.style.display = "none";
    }

  }

  // 🔥 COMPONENTES
  await renderComponentes();

  // 🔥 COUNTDOWN
  if (DOM.countdown) {
    DOM.countdown.style.display = data.evento.countdownDisplay;
  }

  if (data.evento.countdownDisplay !== "none" && data.evento.countdownTarget) {
    LaunchCore.countdown.start(data.evento.countdownTarget);
  } else {
    LaunchCore.countdown.stop();
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
        .replace("{{ics}}", data.ics)
        .replace("{{ics_nombre}}", data.icsNombre || "evento.ics");

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

  clases.forEach((c, index) => {

    // 🔥 INYECTAR ICS REAL DESDE calendarICS
    const icsData = window.__calendarICS?.find(
      i => i.id === c.id
    );

    if (icsData) {
      c.boton.ics = icsData.url;
      c.boton.icsNombre = icsData.nombre;
    }
    
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