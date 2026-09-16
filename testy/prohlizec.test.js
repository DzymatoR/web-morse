// Testy v prohlížeči: zvýrazňování při přehrávání, kvalita zvuku měřená na
// vyrenderovaném signálu, uložení nastavení a rozložení ovládacích prvků.
//
// Potřebuje Playwright a běžící server nad kořenem projektu:
//
//     npm install playwright && npx playwright install chromium
//     python3 -m http.server 8731 --bind 127.0.0.1 &
//     node testy/prohlizec.test.js
//
// Proměnnou URL jde přesměrovat jinam, proměnnou CHROMIUM vnutit konkrétní
// prohlížeč, když si ho Playwright nemá kde stáhnout.

const { chromium } = require("playwright");

const ZAKLAD = process.env.URL || "http://127.0.0.1:8731";

(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ["--autoplay-policy=no-user-gesture-required"]
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const log = [];
  const zkus = (popis, mam, ceka) =>
    log.push((String(mam) === String(ceka) ? "ok   " : "FAIL ") + popis + " => " + JSON.stringify(mam));

  await p.goto(ZAKLAD + "/index.html");

  // skutečné přehrávání: odečítáme, které písmeno zrovna svítí
  await p.fill("#inputTxt", "sos");
  await p.selectOption("#rychlost", "20");   // díl = 60 ms
  await p.click("#playButton");

  const posloupnost = [];
  for (let i = 0; i < 60; i++) {
    const kde = await p.evaluate(() =>
      spanyJednotek.findIndex((s) => s.classList.contains("jednotka--hraje")));
    if (posloupnost[posloupnost.length - 1] !== kde) posloupnost.push(kde);
    await p.waitForTimeout(30);
  }

  zkus("zvýraznění prošlo všechna tři písmena", posloupnost.filter(x => x >= 0).join(","), "0,1,2");
  zkus("před startem nesvítilo nic", posloupnost[0], -1);
  zkus("po dohrání zhaslo", posloupnost[posloupnost.length - 1], -1);
  zkus("tlačítko se vrátilo do Přehrát",
       await p.textContent("#playButton"), "Přehrát");

  // zvýraznění při dekódování ukazuje na přeložená písmena
  await p.fill("#inputTxt", "... --- ...");
  await p.click("#playButton");
  await p.waitForTimeout(200);
  zkus("při dekódování svítí přeložené písmeno",
       await p.textContent(".jednotka--hraje"), "s");
  await p.click("#playButton");

  // zvýrazněné písmeno musí být opravdu vidět, ne jen mít třídu
  await p.fill("#inputTxt", "sos");
  await p.click("#playButton");
  await p.waitForTimeout(250);
  const barvy = await p.evaluate(() => {
    const sviti = document.querySelector(".jednotka--hraje");
    const nesviti = [...document.querySelectorAll(".jednotka")].find((s) => s !== sviti);
    const barva = (e) => getComputedStyle(e).backgroundColor;
    return { sviti: barva(sviti), nesviti: barva(nesviti), text: barva(sviti) === barva(nesviti) };
  });
  zkus("zvýrazněné má jiné pozadí než ostatní", barvy.text, false);
  zkus("zvýrazněné je mosazné", barvy.sviti, "rgb(232, 182, 97)");
  await p.click("#playButton");

  // kvalita zvuku: obálka se měří na skutečně vyrenderovaném signálu,
  // celým řetězcem aplikace včetně uzlu hlasitosti
  const zvuk = await p.evaluate(async () => {
    const SR = 48000;
    const vysledky = {};

    async function renderuj(kod, wpm, hlasitost) {
      const { udalosti, celkem } = casovani(kod, 1.2 / wpm);
      const off = new OfflineAudioContext(1, Math.ceil(SR * (celkem + 0.2)), SR);
      const { osc, klic } = postavRetezec(off, hlasitost);
      naplanujPipani(klic, 0, udalosti);
      osc.start(0); osc.stop(celkem + 0.1);
      return { d: (await off.startRendering()).getChannelData(0), udalosti };
    }

    for (const wpm of [8, 13, 20]) {
      const { d, udalosti } = await renderuj("... --- ... / -- . -.- .-", wpm, 0.4);
      const spicky = udalosti.map(([od, delka]) => {
        let max = 0;
        for (let i = Math.floor(od * SR); i < Math.floor((od + delka) * SR); i++) max = Math.max(max, Math.abs(d[i]));
        return max;
      });
      let skok = 0;
      for (let i = 1; i < d.length; i++) skok = Math.max(skok, Math.abs(d[i] - d[i - 1]));
      let vMezere = 0;
      for (let k = 0; k + 1 < udalosti.length; k++) {
        const od = udalosti[k][0] + udalosti[k][1] + 0.012;
        const doK = udalosti[k + 1][0] - 0.002;
        for (let i = Math.floor(od * SR); i < Math.floor(doK * SR); i++) vMezere = Math.max(vMezere, Math.abs(d[i]));
      }
      vysledky[wpm] = {
        rozptyl: Math.max(...spicky) - Math.min(...spicky),
        spicka: Math.max(...spicky),
        pomerSkoku: skok / (0.4 * Math.sin(2 * Math.PI * TON_HZ / SR)),
        vMezere
      };
    }

    // špička signálu musí odpovídat nastavené hlasitosti
    vysledky.stupnice = {};
    for (const h of [0, 0.2, 0.4, 1]) {
      const { d } = await renderuj("...", 13, h);
      let max = 0;
      for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]));
      vysledky.stupnice[h] = max;
    }
    return vysledky;
  });

  for (const wpm of [8, 13, 20]) {
    const v = zvuk[wpm];
    zkus(`${wpm} wpm: všechny značky stejně hlasité`, v.rozptyl < 0.001, true);
    zkus(`${wpm} wpm: značky dosáhnou nastavené hlasitosti`, Math.abs(v.spicka - 0.4) < 0.001, true);
    zkus(`${wpm} wpm: žádný skok navíc proti čisté sinusovce`, v.pomerSkoku < 1.02, true);
    zkus(`${wpm} wpm: v mezerách je ticho`, v.vMezere < 0.0001, true);
  }
  zkus("hlasitost 0 % je ticho", zvuk.stupnice[0] < 0.0001, true);
  zkus("hlasitost 20 % dá špičku 0,2", Math.abs(zvuk.stupnice[0.2] - 0.2) < 0.001, true);
  zkus("hlasitost 40 % dá špičku 0,4", Math.abs(zvuk.stupnice[0.4] - 0.4) < 0.001, true);
  zkus("hlasitost 100 % nepřebuzuje", zvuk.stupnice[1] <= 1, true);

  // ovladač: výchozí stav, popisek a změna za běhu
  await p.goto(ZAKLAD + "/index.html");
  zkus("posuvník startuje na 40 %", await p.inputValue("#hlasitost"), "40");
  zkus("popisek ukazuje hodnotu", (await p.textContent("#hlasitostHodnota")).trim(), "40 %");

  await p.fill("#inputTxt", "sos sos");
  await p.click("#playButton");
  await p.waitForTimeout(150);
  const pred = await p.evaluate(() => hraje.hlas.gain.value);
  await p.fill("#hlasitost", "80");
  await p.dispatchEvent("#hlasitost", "input");
  await p.waitForTimeout(250);
  const po = await p.evaluate(() => hraje.hlas.gain.value);
  zkus("posuv za běhu zesílí", po > pred + 0.3, true);
  zkus("přehrávání běží dál", await p.textContent("#playButton"), "Zastavit");
  zkus("popisek se přepsal", (await p.textContent("#hlasitostHodnota")).trim(), "80 %");
  await p.click("#playButton");

  await p.fill("#hlasitost", "0");
  await p.dispatchEvent("#hlasitost", "input");
  zkus("na nule popisek sedí", (await p.textContent("#hlasitostHodnota")).trim(), "0 %");

  // uložení nastavení
  await p.goto(ZAKLAD + "/index.html");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  zkus("bez uloženého: výchozí tempo", await p.inputValue("#rychlost"), "13");
  zkus("bez uloženého: výchozí hlasitost", await p.inputValue("#hlasitost"), "40");

  await p.selectOption("#rychlost", "20");
  await p.fill("#hlasitost", "65");
  await p.dispatchEvent("#hlasitost", "change");
  await p.reload();
  zkus("tempo přežilo načtení", await p.inputValue("#rychlost"), "20");
  zkus("hlasitost přežila načtení", await p.inputValue("#hlasitost"), "65");
  zkus("popisek sedí i po načtení", (await p.textContent("#hlasitostHodnota")).trim(), "65 %");
  zkus("načtená hlasitost se použije", await p.evaluate(() => hlasitostPodil()), 0.65);

  // poškozený obsah úložiště nesmí aplikaci rozbít
  for (const nesmysl of ['{"tempo":"999","hlasitost":5000}', '{"tempo":null}', 'tohle neni json', '[]', '"retezec"']) {
    await p.evaluate((v) => localStorage.setItem("web-morse:nastaveni", v), nesmysl);
    await p.reload();
    const tempo = await p.inputValue("#rychlost");
    const hlas = Number(await p.inputValue("#hlasitost"));
    const funguje = await p.evaluate(() => { inputTxt.value = "sos"; inputTxt.dispatchEvent(new Event("input")); return outputTxt.textContent; });
    zkus(`nesmysl v úložišti (${nesmysl.slice(0, 18)}): platné tempo`, ["8", "13", "20"].includes(tempo), true);
    zkus(`nesmysl v úložišti (${nesmysl.slice(0, 18)}): platná hlasitost`, hlas >= 0 && hlas <= 100, true);
    zkus(`nesmysl v úložišti (${nesmysl.slice(0, 18)}): překlad jede`, funguje, "... --- ...");
  }

  // zakázané úložiště: přístup vyhodí výjimku
  const bezUloziste = await b.newPage();
  await bezUloziste.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("odepřeno", "SecurityError"); }
    });
  });
  const chybyBez = [];
  bezUloziste.on("pageerror", (e) => chybyBez.push(String(e)));
  await bezUloziste.goto(ZAKLAD + "/index.html");
  await bezUloziste.fill("#inputTxt", "sos");
  zkus("bez úložiště se stránka nerozbije", chybyBez.length, 0);
  zkus("bez úložiště překlad funguje", await bezUloziste.textContent("#outputTxt"), "... --- ...");
  await bezUloziste.fill("#hlasitost", "70");
  await bezUloziste.dispatchEvent("#hlasitost", "change");
  zkus("bez úložiště nespadne ani ukládání", chybyBez.length, 0);
  await bezUloziste.close();

  // rozložení: tlačítko Přehrát je v jedné řadě s tempem a hlasitostí
  await p.goto(ZAKLAD + "/index.html");
  // prvky mají různou výšku a jsou zarovnané na střed, takže se porovnávají
  // svislé středy, ne horní hrany
  const radek = await p.evaluate(() => {
    const y = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return Math.round(b.top + b.height / 2); };
    return { hrat: y("#playButton"), tempo: y("#rychlost"), hlas: y("#hlasitost"), hodnota: y("#hlasitostHodnota"),
             vRodici: document.querySelector(".prehravani").contains(document.querySelector("#playButton")) };
  });
  zkus("Přehrát je v bloku přehrávání", radek.vRodici, true);
  zkus("Přehrát a tempo v jedné řadě", Math.abs(radek.hrat - radek.tempo) < 3, true);
  zkus("tempo a hlasitost v jedné řadě", Math.abs(radek.tempo - radek.hlas) < 3, true);
  zkus("hodnota hlasitosti v jedné řadě", Math.abs(radek.hlas - radek.hodnota) < 3, true);
  zkus("Přehrát už není mezi ostatními tlačítky",
       await p.evaluate(() => document.querySelector(".tlacitka").contains(document.querySelector("#playButton"))), false);

  // favicona
  const odpoved = await p.goto(ZAKLAD + "/assets/favicon.svg");
  zkus("favicona se načte", odpoved.status(), 200);

  console.log(log.join("\n"));
  const spatne = log.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${log.length - spatne} ok, ${spatne} fail`);
  await b.close();
  process.exit(spatne ? 1 : 0);
})();
