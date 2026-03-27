function initVersionChecker(config){

  if(window.__vcInitialized) return;
  window.__vcInitialized = true;

  console.log("🔥 VC SIMPLE INICIADO");

  let currentDataVersion = null;
  let currentCodeVersion = null;

  async function check(){

    try{

      // 🔥 CODE CHECK
      const codeRes = await fetch(config.codeVersionUrl, { cache: "no-store" });
      const codeData = await codeRes.json();

      const newCode = String(codeData.commit);
      const savedCode = localStorage.getItem("lc_code_version");

      if(!currentCodeVersion){
        currentCodeVersion = newCode;
        localStorage.setItem("lc_code_version", newCode);

        if(savedCode && savedCode !== newCode){
          console.log("💥 CODE cambiado → reload");
          location.reload();
          return;
        }
      }

      if(currentCodeVersion !== newCode){
        console.log("💥 CODE update → reload");
        localStorage.setItem("lc_code_version", newCode);
        location.reload();
        return;
      }

      currentCodeVersion = newCode;

      // 🔥 DATA CHECK
      const dataRes = await fetch(config.versionUrl, { cache: "no-store" });
      const dataJson = await dataRes.json();

      const newData = String(dataJson.version);
      const savedData = localStorage.getItem("lc_data_version");

      if(!currentDataVersion){
        currentDataVersion = savedData || newData;
      }

      if(currentDataVersion !== newData){
        console.log("🆕 DATA detectada");

        currentDataVersion = newData;
        localStorage.setItem("lc_data_version", newData);

        // 💥 CLAVE: FORZAR CORE
        LaunchCore.timing.force();

        LaunchCore.run({
          force: true,
          forceFetch: true
        });
      }

    }catch(e){
      console.warn("VC error", e);
    }

  }

  // 👁️ usar SOLO el sistema del CORE
  LaunchCore.visibility.init(check, config.checkInterval);

  // primer check
  check();
}

window.initVersionChecker = initVersionChecker;