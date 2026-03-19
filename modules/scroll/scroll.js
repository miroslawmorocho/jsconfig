// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHashObserver(){

  if(window.location.hash !== "#comprar") return;

  let scrolling = false;

  const tryScroll = () => {

    const el = document.getElementById("comprar");
    if(!el) return;

    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight;

    // 🎯 SI YA ESTÁ VISIBLE → AJUSTE FINAL
    if(inViewport){

      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      return true;
    }

    // ⚡ SI NO → BAJAR FUERTE SOLO UNA VEZ POR CAMBIO
    if(!scrolling){
      scrolling = true;

      window.scrollTo(0, document.body.scrollHeight);

      // pequeño unlock para próximos cambios
      setTimeout(()=>{
        scrolling = false;
      }, 200);
    }

    return false;
  };


  // 👁️ OBSERVAR CAMBIOS EN TODO EL DOM
  const observer = new MutationObserver(() => {

    const done = tryScroll();

    if(done){
      observer.disconnect(); // 💀 se acabó, misión cumplida
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 🔥 intento inicial por si ya existe algo
  tryScroll();
}