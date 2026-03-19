let intervaloRevisionDin = 60000; // default
let scrollYaEjecutado = false;

async function cargarPricing(){
    
  const data = await LaunchCore.fetchWorker("/pricing");

  if (!data || !data.pricingHtml) {
    console.warn("⚠️ Data incompleta");
    return;
  }

  if (data.intervaloRevisionMs) {
    intervaloRevisionDin = data.intervaloRevisionMs;
    LaunchCore.visibility.updateInterval(intervaloRevisionDin);
  }

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

    LaunchCore.scheduler.programar(cargarPricing, delay);

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

  if(!scrollYaEjecutado){

    scrollYaEjecutado = true;

    if(typeof scrollToHashFix === "function"){
      scrollToHashFix();
    }

  }
}

/* cargar tabla */
LaunchCore.onReady(cargarPricing);

LaunchCore.visibility.init(cargarPricing, intervaloRevisionDin);