// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

/* SCROLL RÁPIDO (inmediato) */
function scrollToHashFix(){

  if(window.location.hash !== "#comprar") return;

  let attempts = 0;

  const interval = setInterval(()=>{

    const el = document.getElementById("comprar");

    // 🧠 PRIMERO: esperar a que exista
    if(!el){
      attempts++;
      if(attempts > 30) clearInterval(interval);
      return;
    }

    const rect = el.getBoundingClientRect();

    const inViewport = rect.top < window.innerHeight;

    // ✅ YA APARECIÓ → AJUSTE FINO Y SALIR
    if(inViewport){

      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      clearInterval(interval);
      return;
    }

    // 💀 NO APARECE → BAJA
    window.scrollBy({
      top: window.innerHeight * 0.9,
      behavior: "auto"
    });

    attempts++;

    if(attempts > 30){
      clearInterval(interval);
    }

  }, 300);

}