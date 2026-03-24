let scrollYaEjecutado = false;
let estadoPricingActual = null; // 🔥 detecta cambios PRE → OPEN

async function cargarPricing(data){
  
  if (!data || !data.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  // =====================================================
  // 🔥 DETECTAR CAMBIO DE ESTADO (PRE → OPEN)
  // usamos textoCierre como señal
  // =====================================================
  const contenedor = document.getElementById("pricing");
  const nuevoEstado = data.estado;

  // 🔥 PRIMER RENDER
  if (estadoPricingActual === null) {

    contenedor.innerHTML = data.pricingHtml;
    estadoPricingActual = nuevoEstado;

  } 
  // 🔥 SOLO si cambia estado → re-render
  else if (estadoPricingActual !== nuevoEstado) {

    console.log("🔥 CAMBIO DE ESTADO PRICING:", nuevoEstado);

    contenedor.style.transition = "opacity 0.4s ease";
    contenedor.style.opacity = 0;

    setTimeout(() => {
      contenedor.innerHTML = data.pricingHtml;
      contenedor.style.opacity = 1;
    }, 200);

    estadoPricingActual = nuevoEstado;

  }

  // =====================================================
  // ⏱ CONTADOR
  // =====================================================
  const wrapper = document.getElementById("contador-wrapper");

  if (wrapper) {
  
    if (data.countdownTarget) {
      wrapper.style.display = "flex";
      LaunchCore.countdown.start(data.countdownTarget);
    } else {
      wrapper.style.display = "none";
    }
  
  }

  // =====================================================
  // 🧠 SCHEDULER INTELIGENTE (apertura / cierre)
  // =====================================================
  if (data.siguienteActualizacionMs != null) {

    let delay = data.siguienteActualizacionMs + 4000;

    LaunchCore.scheduler.programar(
      "pricing-main",
      () => LaunchCore.run(),
      delay
    );

  }

  // =====================================================
  // 📝 TEXTO DE CIERRE (solo en open)
  // =====================================================
  const el = document.getElementById("texto-cierre");

  if (el) {

    if (data.textoCierre) {
      el.innerHTML = data.textoCierre;
      el.style.display = "block";
    } else {
      el.innerHTML = "";
      el.style.display = "none";
    }

  }

  // =====================================================
  // 📜 SCROLL (una sola vez)
  // =====================================================
  if (!scrollYaEjecutado) {

    scrollYaEjecutado = true;

    if (typeof scrollToHashFix === "function") {
      scrollToHashFix();
    }

  }
}

/* cargar tabla */
//LaunchCore.onReady(cargarPricing);