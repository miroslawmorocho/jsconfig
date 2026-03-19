// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

/* SCROLL RÁPIDO (inmediato) */
function scrollToHashFix(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");
  if(!el) return;

  let attempts = 0;

  const interval = setInterval(()=>{

    const rect = el.getBoundingClientRect();

    const inViewport = (
      rect.top >= 0 &&
      rect.bottom <= window.innerHeight
    );

    // 🧠 SI YA ESTÁ EN VIEWPORT → AJUSTE FINAL FINO
    if(inViewport){

      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      clearInterval(interval);
      return;
    }

    // 💀 SI NO ESTÁ → BAJA COMO BESTIA
    window.scrollBy({
      top: window.innerHeight * 0.8,
      behavior: "auto"
    });

    attempts++;

    if(attempts > 20){
      clearInterval(interval);
    }

  }, 300);

}