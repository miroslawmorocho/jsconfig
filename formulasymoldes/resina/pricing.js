let schedulerTimeout = null;

async function cargarPricing(){

  const data = await LaunchCore.fetchWorker("/pricing");

  document.getElementById("pricing").innerHTML = data.pricingHtml;

  const wrapper = document.getElementById("contador-wrapper");

  if (wrapper) {
  
    if (data.countdownTarget) {
      wrapper.style.display = "flex";
      LaunchCore.countdown.start(data.countdownTarget);
    } else {
      wrapper.style.display = "none";
    }
  
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

  setTimeout(() => {
    if(typeof scrollToHashFix === "function"){
      scrollToHashFix();
    }
  }, 100);
}


function programarSiguienteActualizacion(delay){

  if(schedulerTimeout){
    clearTimeout(schedulerTimeout);
  }

  schedulerTimeout = setTimeout(()=>{
    cargarPricing();
  }, delay);

}

/* cargar tabla */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", cargarPricing);
} else {
  cargarPricing();
}
