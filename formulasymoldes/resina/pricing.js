let schedulerTimeout = null;
let countdownInterval = null;

async function cargarPricing(){

  const res = await fetch(
  `https://launch-engine.miroslaw-mm.workers.dev/pricing${window.location.search}`
  );

  const data = await res.json();

  document.getElementById("pricing").innerHTML = data.pricingHtml;

  const wrapper = document.getElementById("contador-wrapper");

  if (data.countdownTarget) {
  
    wrapper.style.display = "flex";
    iniciarCountdown(data.countdownTarget);
  
  } else {
  
    wrapper.style.display = "none";
  
  }

  if (data.siguienteActualizacionMs) {

    let delay = data.siguienteActualizacionMs + 4000;

    if (delay < 2000) delay = 2000;

    programarSiguienteActualizacion(delay);

  }
  
  const el = document.getElementById("texto-cierre");

if(el){

  if(data.textoCierre){
    el.innerHTML = data.textoCierre;
    el.style.display = "block";
  } else {
    el.innerHTML = "";
    el.style.display = "none";
  }

}

}


/* scroll primero */
window.addEventListener("load", function() {

  if (window.location.hash === "#comprar") {

    const el = document.getElementById("comprar");

    if (!el) return;

    let attempts = 0;

    const scrollFix = setInterval(function(){

      el.scrollIntoView({behavior:"smooth", block:"start"});

      attempts++;

      if(attempts > 5){
        clearInterval(scrollFix);
      }

    }, 400);

  }

});

function programarSiguienteActualizacion(delay){

  if(schedulerTimeout){
    clearTimeout(schedulerTimeout);
  }

  schedulerTimeout = setTimeout(()=>{
    cargarPricing();
  }, delay);

}

function iniciarCountdown(target){

  if(countdownInterval){
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const targetTime = Number(target);

  function actualizar(){

    const ahora = Date.now();
    const diff = targetTime - ahora;

    if(diff <= 0){

      clearInterval(countdownInterval);
      countdownInterval = null;
    
      return;
    }

    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);
    const segundos = Math.floor((diff % 60000) / 1000);

    document.getElementById("days").textContent = String(dias).padStart(2,"0");
    document.getElementById("hours").textContent = String(horas).padStart(2,"0");
    document.getElementById("minutes").textContent = String(minutos).padStart(2,"0");
    document.getElementById("seconds").textContent = String(segundos).padStart(2,"0");

  }

  actualizar();
  countdownInterval = setInterval(actualizar,1000);

}

/* cargar tabla */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", cargarPricing);
} else {
  cargarPricing();
}
