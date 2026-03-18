// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  let attempts = 0;

  const interval = setInterval(()=>{

    const el = document.getElementById("comprar");

    if(el){
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    attempts++;

    if(attempts > 5){
      clearInterval(interval);
    }

  }, 300);

}