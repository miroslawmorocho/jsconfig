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

// FUNCIÓN PARA APARICIONES CON TRANSICIÓN SUAVE
function hideSmooth(el) {
  if (!el || el.classList.contains("is-hidden")) return;

  el.style.height = el.offsetHeight + "px";

  requestAnimationFrame(() => {
    el.style.height = "0px";
    el.classList.add("is-hidden");

    // 🔥 AÑADE ESTO
    setTimeout(() => {
      el.style.display = "none";
    }, 300);
  });
}

function showSmooth(el) {
  if (!el || !el.classList.contains("is-hidden")) return;

  // 🔥 AÑADE ESTO
  el.style.display = "block";

  el.classList.remove("is-hidden");

  const fullHeight = el.scrollHeight;

  el.style.height = "0px";

  requestAnimationFrame(() => {
    el.style.height = fullHeight + "px";
  });

  setTimeout(() => {
    el.style.height = "auto";
  }, 300);
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
  divider: document.getElementById("divider"),
  calendarTitle: document.getElementById("launch-calendar-title"),
  offerText: document.getElementById("offer-deadline"), // Extraído a DOM para mejor orden  
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
      showSmooth(DOM.estadoCerrado);
    }
    
    
    if (DOM.header) hideSmooth(DOM.header);
    if (DOM.clases) hideSmooth(DOM.clases);
    if (DOM.countdown) hideSmooth(DOM.countdown);
    if (DOM.info) hideSmooth(DOM.info);
    if (DOM.calendarTitle) hideSmooth(DOM.calendarTitle);
    if (DOM.proximaLabel) hideSmooth(DOM.proximaLabel);
    if (DOM.proxima) hideSmooth(DOM.proxima);
    if (DOM.ctaFinal) hideSmooth(DOM.ctaFinal);
    if (DOM.offerSticky) hideSmooth(DOM.offerSticky);
    if (DOM.offerText) hideSmooth(DOM.offerText);

    // 🔥 asegurar que la UI marque como lista
    finalizeRender();

    return;
  }

  if (DOM.estadoCerrado) {
    DOM.estadoCerrado.innerHTML = "";
    hideSmooth(DOM.estadoCerrado);
    lastRender.estadoCerrado = null;
  }

  // 🔥 OFFER TEXT
  if (DOM.offerText) {
    if (data.evento.offerText) {
      DOM.offerText.innerText = data.evento.offerText;
      showSmooth(DOM.offerText);
    } else {
      hideSmooth(DOM.offerText);
    }
  }

  // 🔥 STICKY
  if (DOM.offerSticky) {

    if (data.evento.offerStickyDisplay === "none") {
      hideSmooth(DOM.offerSticky);
    } else {
      showSmooth(DOM.offerSticky);
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

  // 🔥 HEADER (visibilidad)
  if (DOM.header) {
    if (data.evento.headerText) {
      showSmooth(DOM.header);
    } else {
      hideSmooth(DOM.header);
    }
  }

  // 🔥 INFO (visibilidad)
  if (DOM.info) {
    if (data.evento.infoPaginaHtml) {
      showSmooth(DOM.info);
    } else {
      hideSmooth(DOM.info);
    }
  }

  // 🔥 CALENDAR TITLE (visibilidad)
  if (DOM.calendarTitle) {
    if (data.evento.calendarTitleHtml) {
      showSmooth(DOM.calendarTitle);
    } else {
      hideSmooth(DOM.calendarTitle);
    }
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
      showSmooth(DOM.proximaLabel);
    } else {
      hideSmooth(DOM.proximaLabel);
    }
  }

  // 🔥 PROXIMA
  if (DOM.proxima && data.evento.proximaClase) {

    const html = await renderClases([data.evento.proximaClase]);

    if (lastRender.proxima !== html) {
      DOM.proxima.innerHTML = html;
      lastRender.proxima = html;
    }

    showSmooth(DOM.proxima);

  } else {
    hideSmooth(DOM.proxima);
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

    showSmooth(DOM.ctaFinal);

  } else {
    hideSmooth(DOM.ctaFinal);
  }

  // 🔥 COMPONENTES
  await renderComponentes();

  // 🔥 COUNTDOWN
  if (DOM.countdown) {

    const raw = data.evento.countdownTarget;

    const shouldShow = (
      raw !== null && // 🔥 CLAVE 1: EXISTE
      Number(raw) > Date.now() && // 🔥 CLAVE 2: FUTURO
      data.evento.countdownDisplay !== "none"
    );

    if (shouldShow) {
      showSmooth(DOM.countdown);
      LaunchCore.countdown.start(raw); // 🔥 aquí también
    } else {
      hideSmooth(DOM.countdown);
      LaunchCore.countdown.stop(); // 🔥 y esto también
    }

  }

  if (data.evento.countdownDisplay !== "none" && data.evento.countdownTarget) {
    LaunchCore.countdown.start(data.evento.countdownTarget);
  } else {
    LaunchCore.countdown.stop();
  }

  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s ease";

    setTimeout(() => loader.remove(), 300);
  }

  finalizeRender();
}

function finalizeRender() {
  const loader = document.getElementById("loader");

  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s ease";
    setTimeout(() => loader.remove(), 300);
  }

  document.getElementById("launch-engine")?.classList.add("is-ready");
}

// OCULTAR CONTADOR CUANDO LLEGA A CERO
LaunchCore.on("countdown:finished", () => {

  console.log("⏱ countdown terminado → ocultando UI");

  if (DOM.countdown) {
    hideSmooth(DOM.countdown);
  }

});


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