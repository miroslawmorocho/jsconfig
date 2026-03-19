// OJO que la etiqueta a buscar con este scroll es SIEMPRE "#comprar"

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  let observer = null;
  let fixed = false;

  function intentarScroll(){

    const el = document.getElementById("comprar");

    if(!el) return;

    // 👇 hacer scroll una vez
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // 👇 observar si realmente queda visible
    observer = new IntersectionObserver((entries)=>{

      const entry = entries[0];

      if(entry.isIntersecting){

        // ✅ ya está visible
        if(!fixed){
          fixed = true;

          // 👇 pequeño delay por si el layout sigue moviéndose
          setTimeout(()=>{
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);

        }

      }else{
        // ❗ si se salió (por empuje del DOM), lo volvemos a centrar
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }

    }, {
      threshold: 0.6 // 60% visible = suficiente
    });

    observer.observe(el);

  }

  // 👇 esperar a que el DOM lo tenga (sin intentos limitados)
  const wait = setInterval(()=>{

    const el = document.getElementById("comprar");

    if(el){
      clearInterval(wait);
      intentarScroll();
    }

  }, 200);

}