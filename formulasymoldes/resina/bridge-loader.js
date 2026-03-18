(async function(){

const root = document.getElementById("launch-engine-root");

if(!root) return;

const base = "https://miroslawmorocho.github.io/jsconfig/formulasymoldes/resina/";

try{

const html = await fetch(base + "bridge.html").then(r => r.text());

root.innerHTML = html;

await LaunchCore.loadCSS(base + "bridge.css");
await LaunchCore.loadScript(base + "bridge.js");

}catch(e){

console.error("Launch Engine load error", e);

}

})();
