// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");

  if(el){
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

}