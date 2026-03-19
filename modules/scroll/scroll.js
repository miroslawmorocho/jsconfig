// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHashObserver(){

  if(window.location.hash !== "#comprar") return;

  const observer = new MutationObserver(() => {

    const el = document.getElementById("comprar");

    if(el){

      // 💥 FORZAR AL NAVEGADOR A RE-EJECUTAR EL HASH
      const id = el.id;

      el.id = ""; // quitar temporalmente
      el.id = id; // restaurar

      location.hash = "#comprar"; // 🔥 trigger nativo REAL

      observer.disconnect();
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

}