let scrollYaEjecutado = false;
let lastPricingHTML = null;

async function cargarPricing(data){

  const pricing = data.pricing || {};

  if (!pricing || !pricing.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  const contenedor = document.getElementById("pricing");

  if (!contenedor) {
    console.warn("⚠️ No existe #pricing");
    return;
  }

  // 🧠 SOLO render si cambió
  if (lastPricingHTML !== pricing.pricingHtml) {
    contenedor.innerHTML = pricing.pricingHtml;
    lastPricingHTML = pricing.pricingHtml;
  }

  // =====================================================
  // ⏱ CONTADOR
  // =====================================================
  const wrapper = document.getElementById("contador-wrapper");

  if (wrapper) {
    if (pricing.countdownTarget) {
      wrapper.style.display = "flex";
      LaunchCore.countdown.start(pricing.countdownTarget);
    } else {
      wrapper.style.display = "none";
    }
  }

  // =====================================================
  // 📝 TEXTO DE CIERRE
  // =====================================================
  const el = document.getElementById("texto-cierre");

  if (el) {
    if (pricing.textoCierre) {
      el.innerHTML = pricing.textoCierre;
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