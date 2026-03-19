// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHashObserver(){

  if(window.location.hash !== "#comprar") return;

  const observer = new MutationObserver(() => {

    const el = document.getElementById("comprar");

    if(el){

      // 💥 TELETRANSPORTE DIRECTO (sin animación)
      window.scrollTo({
        top: el.offsetTop,
        behavior: "auto"
      });

      observer.disconnect();
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

}