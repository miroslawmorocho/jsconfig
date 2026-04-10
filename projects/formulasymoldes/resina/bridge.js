/**
 * ============================================================================
 * FRONTEND - LAUNCH ENGINE RENDERER
 * ============================================================================
 * Este script ya NO contiene lógica de negocio. Solo consulta al Worker y 
 * pinta los resultados en el DOM. Todo el cerebro está en Cloudflare.
 * ============================================================================
 */

/* =====================================================
  VARIABLES DE RENDERIZACIÓN
===================================================== */
let lastRender = {
  header: null,
  info: null,
  clases: null,
  proxima: null,
  calendarTitle: null,
  sticky: null,
  ctaFinal: null,
  estadoCerrado: null
};

function hide(el) {
  if (!el) return;
  el.classList.add("is-hidden");
}

function show(el) {
  if (!el) return;
  el.classList.remove("is-hidden");
}

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

    if (DOM.estadoCerrado && lastRender.estadoCerrado !== data.evento.htmlEventoCerrado) {
      DOM.estadoCerrado.innerHTML = data.evento.htmlEventoCerrado;
      lastRender.estadoCerrado = data.evento.htmlEventoCerrado;
      show(DOM.estadoCerrado);
    }
    
    
    if (DOM.header) hide(DOM.header);
    if (DOM.clases) hide(DOM.clases);
    if (DOM.countdown) hide(DOM.countdown);
    if (DOM.info) hide(DOM.info);
    if (DOM.calendarTitle) hide(DOM.calendarTitle);
    if (DOM.proximaLabel) hide(DOM.proximaLabel);
    if (DOM.proxima) hide(DOM.proxima);
    if (DOM.ctaFinal) hide(DOM.ctaFinal);
    if (DOM.offerSticky) hide(DOM.offerSticky);
    if (DOM.offerText) hide(DOM.offerText);

    return;
  }

  if (DOM.estadoCerrado) {
    DOM.estadoCerrado.innerHTML = "";
    hide(DOM.estadoCerrado);
    lastRender.estadoCerrado = null;
  }

  // 🔥 volver a mostrar todo
  if (DOM.header) show(DOM.header);
  if (DOM.clases) show(DOM.clases);
  if (DOM.countdown) show(DOM.countdown);
  if (DOM.info) show(DOM.info);
  if (DOM.calendarTitle) show(DOM.calendarTitle);
  if (DOM.proximaLabel) show(DOM.proximaLabel);
  if (DOM.proxima) show(DOM.proxima);
  if (DOM.ctaFinal) show(DOM.ctaFinal);

  // 🔥 OFFER TEXT
  if (DOM.offerText) {
    DOM.offerText.innerText = data.evento.offerText;
    if (data.evento.offerTextDisplay === "none") {
      hide(DOM.offerText);
    } else {
      show(DOM.offerText);
    }
  }

  // 🔥 STICKY
  if (DOM.offerSticky) {

    if (data.evento.offerStickyDisplay === "none") {
      hide(DOM.offerSticky);
    } else {
      show(DOM.offerSticky);
    }

    if (lastRender.sticky !== data.evento.offerStickyHtml) {

      DOM.offerSticky.innerHTML = data.evento.offerStickyHtml;
      lastRender.sticky = data.evento.offerStickyHtml;

      if (data.evento.offerStickyDisplay === "block" && DOM.sectionPadding && DOM.offerSticky) {
        requestAnimationFrame(() => {
          const extraSpace = 10;
          const height = DOM.offerSticky.offsetHeight + extraSpace;
          DOM.sectionPadding.style.paddingTop = height + "px";
        });
      }

    }
  }

  // 🔥 TITULO
  if (DOM.calendarTitle && lastRender.calendarTitle !== data.evento.calendarTitleHtml) {
    DOM.calendarTitle.innerHTML = data.evento.calendarTitleHtml;
    lastRender.calendarTitle = data.evento.calendarTitleHtml;
  }

  if (DOM.info && lastRender.info !== data.evento.infoPaginaHtml) {
    DOM.info.innerHTML = data.evento.infoPaginaHtml;
    lastRender.info = data.evento.infoPaginaHtml;
  }

  if (DOM.header && lastRender.header !== data.evento.headerText) {
    DOM.header.innerHTML = data.evento.headerText;
    lastRender.header = data.evento.headerText;
  }

  // 🔥 CLASES
  const clasesString = JSON.stringify(data.evento.clases);

  if (lastRender.clasesData !== clasesString) {

    const html = await renderClases(data.evento.clases);

    if (lastRender.clases !== html) {
      DOM.clases.innerHTML = html;
      lastRender.clases = html;
    }

    lastRender.clasesData = clasesString;
  }

  // 🔥 PROXIMA LABEL
  if (DOM.proximaLabel) {
    if (data.evento.proximaClaseLabel) {
      DOM.proximaLabel.innerHTML = data.evento.proximaClaseLabel;
      show(DOM.proximaLabel);
    } else {
      hide(DOM.proximaLabel);
    }
  }

  // 🔥 PROXIMA
  if (DOM.proxima && data.evento.proximaClase) {

    const html = await renderClases([data.evento.proximaClase]);

    if (lastRender.proxima !== html) {
      DOM.proxima.innerHTML = html;
      lastRender.proxima = html;
    }

    show(DOM.proxima);

  } else {
    hide(DOM.proxima);
  }

  
  // ===== CTA FINAL UNIFICADO =====

  if (!DOM.ctaFinal) return;

  let html = "";

  // PRIORIDAD 1 → durmiendo
  if (data.evento.usuarioDurmiendo) {

    html = `
      <div class="mensaje-dormir">
        ${data.evento.textoDurmiendo}
      </div>
    `;

  // PRIORIDAD 2 → botón CTA
  } else if (data.evento.offerText && data.evento.offerUrl) {

    html = `
      <div class="clase-item clase-item-cta">
        <div class="clase-info"></div>
        <div class="clase-boton">
          <a href="${data.evento.offerUrl}" target="_blank">
            🔥 Comprar ahora
          </a>
        </div>
      </div>
    `;
  }


  // ===== RENDER =====
  if (html) {

    if (lastRender.ctaFinal !== html) {
      DOM.ctaFinal.innerHTML = html;
      lastRender.ctaFinal = html;
    }

    show(DOM.ctaFinal);

  } else {
    hide(DOM.ctaFinal);
  }

  // 🔥 COMPONENTES
  await renderComponentes();

  // 🔥 COUNTDOWN
  if (DOM.countdown) {
    
    if (data.evento.countdownDisplay === "none") {
      hide(DOM.countdown);
    } else {
      show(DOM.countdown);
    }
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

      const nuevoHTML = calendarTemplateCache
        .replace("{{texto}}", data.texto)
        .replace("{{google}}", data.google)
        .replace("{{ics}}", data.ics)
        .replace("{{ics_nombre}}", data.icsNombre || "evento.ics");

      if (el.__lastHTML !== nuevoHTML) {
        el.innerHTML = nuevoHTML;
        el.__lastHTML = nuevoHTML;
      }

    }

    // 🔥 LINK NORMAL
    if (data.tipo === "link") {

      const nuevoHTML = `
        <a href="${data.url}" target="_blank">
          ${data.texto}
        </a>
      `;

      if (el.__lastHTML !== nuevoHTML) {
        el.innerHTML = nuevoHTML;
        el.__lastHTML = nuevoHTML;
      }
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