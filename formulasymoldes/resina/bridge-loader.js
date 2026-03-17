(async function(){

const root = document.getElementById("launch-engine-root");

if(!root) return;

const base = "https://miroslawmorocho.github.io/jsconfig/formulasymoldes/resina/";

try{

const html = await fetch(base + "bridge.html").then(r => r.text());

root.innerHTML = html;

const css = document.createElement("link");
css.rel = "stylesheet";
css.href = base + "bridge.css";
document.head.appendChild(css);

const script = document.createElement("script");
script.src = base + "bridge.js";
script.defer = true;
document.body.appendChild(script);

}catch(e){

console.error("Launch Engine load error", e);

}

})();
