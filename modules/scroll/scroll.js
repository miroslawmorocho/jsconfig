// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHashTeleport(){

  if(window.location.hash !== "#comprar") return;

  const observer = new MutationObserver(() => {

    const el = document.getElementById("comprar");

    if(el){

      // 💥 RESET + RE-TRIGGER HASH
      history.replaceState(null, null, " ");
      location.hash = "#comprar";

      observer.disconnect();
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

}