// Esta función está diseñada para ir al hashtag #comprar
// de la carta de ventas

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");
  if(!el) return;

  let lastTop = null;
  let stableCount = 0;
  let maxChecks = 20;

  function checkPosition(){

    const rect = el.getBoundingClientRect();
    const currentTop = rect.top;

    if(lastTop !== null && Math.abs(currentTop - lastTop) < 2){
      stableCount++;
    }else{
      stableCount = 0;
    }

    lastTop = currentTop;

    // 👇 si está estable por varios checks → FINAL
    if(stableCount >= 3 || maxChecks <= 0){

      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;

    }

    maxChecks--;

    // 👇 seguimos corrigiendo mientras se mueve
    el.scrollIntoView({ behavior: "auto", block: "start" });

    setTimeout(checkPosition, 100);

  }

  // 🔥 primer scroll
  el.scrollIntoView({ behavior: "smooth", block: "start" });

  setTimeout(checkPosition, 100);

}