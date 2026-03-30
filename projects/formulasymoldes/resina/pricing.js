let scrollYaEjecutado = false;

async function cargarPricing(data){

  if (!data || !data.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  const contenedor = document.getElementById("pricing");

  if (!contenedor) {
    console.warn("⚠️ No existe #pricing");
    return;
  }

  // =====================================================
  // 🎨 RENDER (SIEMPRE)
  // =====================================================
  contenedor.innerHTML = data.pricingHtml;

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
  // 📝 TEXTO DE CIERRE
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