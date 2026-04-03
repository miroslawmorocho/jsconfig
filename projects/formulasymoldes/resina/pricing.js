let scrollYaEjecutado = false;
let lastPricingHTML = null;

async function cargarPricing(data){

  if (!data.pricing || !data.pricing.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  const contenedor = document.getElementById("pricing");

  if (!contenedor) {
    console.warn("⚠️ No existe #pricing");
    return;
  }

  // 🧠 SOLO render si cambió
  if (lastPricingHTML !== data.pricing.pricingHtml) {
    contenedor.innerHTML = data.pricing.pricingHtml;
    lastPricingHTML = data.pricing.pricingHtml;
  }

  // =====================================================
  // ⏱ CONTADOR
  // =====================================================
  const wrapper = document.getElementById("contador-wrapper");

  if (wrapper) {
    if (data.pricing.countdownTarget) {
      wrapper.style.display = "flex";
      LaunchCore.countdown.start(data.pricing.countdownTarget);
    } else {
      wrapper.style.display = "none";
    }
  }

  // =====================================================
  // 📝 TEXTO DE CIERRE
  // =====================================================
  const el = document.getElementById("texto-cierre");

  if (el) {
    if (data.pricing.textoCierre) {
      el.innerHTML = data.pricing.textoCierre;
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