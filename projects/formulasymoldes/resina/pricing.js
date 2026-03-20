let intervaloRevisionDin = 60000; // default
let scrollYaEjecutado = false;
let estadoPricingActual = null; // 🔥 detecta cambios PRE → OPEN

async function cargarPricing(){
    
  const data = await LaunchCore.fetchWorker("/pricing");

  if (!data || !data.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  // 🔥 intervalo dinámico (igual que antes)
  if (data.intervaloRevisionMs) {
    intervaloRevisionDin = data.intervaloRevisionMs;
    LaunchCore.visibility.updateInterval(intervaloRevisionDin);
  }

  // =====================================================
  // 🔥 DETECTAR CAMBIO DE ESTADO (PRE → OPEN)
  // usamos textoCierre como señal
  // =====================================================
  const nuevoEstado = data.textoCierre ? "open" : "pre";

  if (estadoPricingActual !== nuevoEstado) {

    console.log("🔥 CAMBIO DE ESTADO PRICING:", nuevoEstado);

    document.getElementById("pricing").innerHTML = data.pricingHtml;

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
  if (data.siguienteActualizacionMs) {

    let delay = data.siguienteActualizacionMs + 4000;

    LaunchCore.scheduler.programar(cargarPricing, delay);

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
LaunchCore.onReady(cargarPricing);

LaunchCore.visibility.init(cargarPricing, intervaloRevisionDin);