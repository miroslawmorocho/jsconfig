// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

/* SCROLL RÁPIDO (inmediato) */
function scrollToHashFast(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");

  if(el){
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }
}


/* SCROLL DE CORRECCIÓN (preciso) */
function scrollToHashFix(){

  if(window.location.hash !== "#comprar") return;

  let attempts = 0;

  const interval = setInterval(()=>{

    const el = document.getElementById("comprar");

    if(el){
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    attempts++;

    if(attempts > 10){
      clearInterval(interval);
    }

  }, 300);

}


/* EJECUTAR AL INICIO */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scrollToHashFast);
} else {
  scrollToHashFast();
}
