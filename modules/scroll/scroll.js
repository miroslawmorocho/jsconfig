// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");
  if(!el) return;

  let lastHeight = 0;
  let stableCount = 0;
  let maxChecks = 30;

  function checkLayout(){

    const currentHeight = document.body.scrollHeight;

    if(Math.abs(currentHeight - lastHeight) < 5){
      stableCount++;
    }else{
      stableCount = 0;
    }

    lastHeight = currentHeight;

    // ✅ cuando la página deja de crecer → scroll final
    if(stableCount >= 3 || maxChecks <= 0){

      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;

    }

    maxChecks--;

    setTimeout(checkLayout, 100);

  }

  // 👇 arranca el proceso
  checkLayout();

}