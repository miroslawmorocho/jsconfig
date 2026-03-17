// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  let attempts = 0;

  const interval = setInterval(()=>{

    const anchor = document.getElementById("comprar");
    const pricing = document.getElementById("pricing");

    const ready =
      anchor &&
      pricing &&
      pricing.innerHTML.trim().length > 0;

    if(ready){

      anchor.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      clearInterval(interval);
    }

    attempts++;

    if(attempts > 30){
      clearInterval(interval);
    }

  }, 300);
}


/* ejecutar SIEMPRE */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scrollToHash);
} else {
  scrollToHash();
}
