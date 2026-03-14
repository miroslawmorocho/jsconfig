window.addEventListener("load", function() {

  if (window.location.hash === "#comprar") {

    const el = document.getElementById("comprar");

    if (!el) return;

    let attempts = 0;

    const scrollFix = setInterval(function(){

      el.scrollIntoView({behavior:"smooth", block:"start"});

      attempts++;

      if(attempts > 5){
        clearInterval(scrollFix);
      }

    }, 400);

  }

});
