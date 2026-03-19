// Esta función está diseñada para ir al hashtag #comprar
// de la carta de ventas

function scrollToHash(){

  if(window.location.hash !== "#comprar") return;

  const el = document.getElementById("comprar");
  if(!el) return;

  let fixed = false;
  let observer = null;

  observer = new IntersectionObserver((entries)=>{

    const entry = entries[0];

    if(entry.isIntersecting){

      if(!fixed){
        fixed = true;

        setTimeout(()=>{
          el.scrollIntoView({ behavior: "smooth", block: "start" });

          // 🔥 aquí lo matamos
          observer.disconnect();

        }, 300);

      }

    }else{
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }

  }, {
    threshold: 0.6
  });

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  observer.observe(el);

}