// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHashObserver(){

  if(window.location.hash !== "#comprar") return;

  const tryScroll = () => {

    const el = document.getElementById("comprar");
    if(!el) return false;

    const rect = el.getBoundingClientRect();

    const inViewport = rect.top < window.innerHeight;

    // 🎯 YA ESTÁ → AJUSTE FINAL
    if(inViewport){

      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      return true;
    }

    // 🧠 SOLO BAJA SI ESTÁ MUY LEJOS
    if(rect.top > window.innerHeight * 1.5){

      window.scrollBy({
        top: window.innerHeight,
        behavior: "auto"
      });

    }

    return false;
  };


  const observer = new MutationObserver(() => {

    const done = tryScroll();

    if(done){
      observer.disconnect();
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  tryScroll();
}

LaunchCore.onReady(scrollToHashObserver);