"use strict";

// ---------------------------------------------------------------- slovník

const SLOVNIK = {
    // písmena
    "a": ".-",
    "b": "-...",
    "c": "-.-.",
    "d": "-..",
    "e": ".",
    "f": "..-.",
    "g": "--.",
    "h": "....",
    "ch": "----",
    "i": "..",
    "j": ".---",
    "k": "-.-",
    "l": ".-..",
    "m": "--",
    "n": "-.",
    "o": "---",
    "p": ".--.",
    "q": "--.-",
    "r": ".-.",
    "s": "...",
    "t": "-",
    "u": "..-",
    "v": "...-",
    "w": ".--",
    "x": "-..-",
    "y": "-.--",
    "z": "--..",
    // čísla
    "0": "-----",
    "1": ".----",
    "2": "..---",
    "3": "...--",
    "4": "....-",
    "5": ".....",
    "6": "-....",
    "7": "--...",
    "8": "---..",
    "9": "----.",
    // speciální znaky
    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "!": "-.-.--",
    "'": ".----.",
    '"': ".-..-.",
    ":": "---...",
    ";": "-.-.-.",
    "-": "-....-",
    "_": "..--.-",
    "/": "-..-.",
    "(": "-.--.",
    ")": "-.--.-",
    "=": "-...-",
    "+": ".-.-.",
    "&": ".-...",
    "@": ".--.-.",
    "$": "...-..-"
};

// Opačný slovník pro překlad zpátky. Kód, který má víc zápisů, si drží ten
// první — proto ".-" dekóduje na "a" a ne na nějaký další znak.
const ZPET = {};
for (const [znak, kod] of Object.entries(SLOVNIK)) {
    if (!(kod in ZPET)) ZPET[kod] = znak;
}

// Oddělovače: mezera mezi písmeny, " / " mezi slovy.
const ODDELOVAC_PISMEN = " ";
const ODDELOVAC_SLOV = " / ";

// ---------------------------------------------------------------- pomocné

// "Příliš žluťoučký" -> "prilis zlutoucky". Diakritiku řešíme rozkladem na
// základní znak + háček/čárku, takže slovník nemusí mít každé písmeno dvakrát.
function bezDiakritiky(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Pastnutá morseovka často používá jiné znaky než tečku a spojovník.
function sjednotZnaky(text) {
    return text
        .replace(/[·•∙]/g, ".")
        .replace(/[−–—‒]/g, "-")
        .replace(/ /g, " ");
}

// Slova odděluje lomítko, značky mezera. Dělí se tu stejně pro překlad
// i pro pípání, aby n-tá značka odpovídala n-té jednotce ve výstupu.
function rozdelSlova(kod) {
    return sjednotZnaky(kod)
        .split("/")
        .map((slovo) => slovo.split(/\s+/).filter(Boolean))
        .filter((znacky) => znacky.length > 0);
}

function vypadaJakoMorse(text) {
    const t = sjednotZnaky(text).trim();
    return t !== "" && /^[.\-/\s]+$/.test(t) && /[.\-]/.test(t);
}

// ---------------------------------------------------------------- překlad

// Překlad vrací seznam částí, ne jen text: každá "jednotka" je jedno písmeno
// a při pípání se dá zvýraznit. "oddělovač" je mezera mezi nimi.
const spojCasti = (casti) => casti.map((c) => c.jednotka ?? c.oddelovac).join("");

function naMorse(text) {
    const vstup = bezDiakritiky(text.toLowerCase());
    const preskocene = new Set();
    const casti = [];

    vstup.split(/\s+/).filter(Boolean).forEach((slovo) => {
        const kody = [];

        for (let i = 0; i < slovo.length; i++) {
            // "ch" je v morseovce jeden znak, musí se hledat dřív než "c"
            const dvojznak = slovo.slice(i, i + 2);
            if (SLOVNIK[dvojznak]) {
                kody.push(SLOVNIK[dvojznak]);
                i++;
                continue;
            }

            const znak = slovo[i];
            if (SLOVNIK[znak]) {
                kody.push(SLOVNIK[znak]);
            } else {
                preskocene.add(znak);
            }
        }

        if (kody.length === 0) return;
        if (casti.length > 0) casti.push({ oddelovac: ODDELOVAC_SLOV });

        kody.forEach((kod, ik) => {
            if (ik > 0) casti.push({ oddelovac: ODDELOVAC_PISMEN });
            casti.push({ jednotka: kod });
        });
    });

    return { casti, text: spojCasti(casti), preskocene: [...preskocene] };
}

function zMorse(kod) {
    const preskocene = new Set();
    const casti = [];

    rozdelSlova(kod).forEach((znacky) => {
        if (casti.length > 0) casti.push({ oddelovac: " " });

        znacky.forEach((znacka) => {
            if (znacka in ZPET) {
                casti.push({ jednotka: ZPET[znacka] });
            } else {
                preskocene.add(znacka);
                casti.push({ jednotka: "\u2423" }); // ␣ – tohle se přeložit nepodařilo
            }
        });
    });

    return { casti, text: spojCasti(casti), preskocene: [...preskocene] };
}

// ---------------------------------------------------------------- pípání

// Délky podle standardu: tečka 1 díl, čárka 3 díly, mezera mezi značkami
// v písmenu 1 díl, mezi písmeny 3 díly, mezi slovy 7 dílů. Délka dílu
// v milisekundách je 1200 / (slov za minutu).
const TON_HZ = 600;

// Náběh a doznění každé značky. Ostrý start tónu je slyšet jako lupnutí,
// protože roh v obálce rozhodí energii daleko od nosné. Tvar zvednutého
// kosinu žádný roh nemá: proti lineárnímu náběhu stejné délky má ve vzdálenosti
// 1200 Hz od nosné asi o 25 dB méně rozstřelu. 8 ms je kompromis — delší náběh
// je ještě čistší, ale ukrajoval by z krátké tečky.
const NABEH = 0.008;
const KROKU_OBALKY = 64;

// Křivky jsou znormované na 0 až 1 — hlasitost řeší samostatný uzel za nimi,
// aby šla měnit i uprostřed přehrávání.
const NABEH_KRIVKA = new Float32Array(KROKU_OBALKY);
const DOZNENI_KRIVKA = new Float32Array(KROKU_OBALKY);
for (let i = 0; i < KROKU_OBALKY; i++) {
    const x = i / (KROKU_OBALKY - 1);
    NABEH_KRIVKA[i] = 0.5 * (1 - Math.cos(Math.PI * x));
    DOZNENI_KRIVKA[i] = 0.5 * (1 + Math.cos(Math.PI * x));
}

// Oscilátor → klíčování (obálka značek) → hlasitost → výstup.
function postavRetezec(ctx, hlasitost) {
    const osc = ctx.createOscillator();
    const klic = ctx.createGain();
    const hlas = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = TON_HZ;
    klic.gain.value = 0;
    hlas.gain.value = hlasitost;

    osc.connect(klic);
    klic.connect(hlas);
    hlas.connect(ctx.destination);

    return { osc, klic, hlas };
}

let zvuk = null;   // AudioContext se vyrábí až při prvním kliknutí
let hraje = null;  // { osc, gain } když zrovna běží přehrávání

// Rozpadne morseovku na seznam [začátek, délka] v sekundách. Vedle toho vrací
// hranice jednotlivých písmen — podle nich se při přehrávání zvýrazňuje.
function casovani(kod, dil) {
    const udalosti = [];
    const pismena = [];
    let t = 0;

    rozdelSlova(kod).forEach((znacky, is) => {
        if (is > 0) t += 7 * dil;

        znacky.forEach((pismeno, ip) => {
            if (ip > 0) t += 3 * dil;
            const od = t;

            [...pismeno].forEach((znacka, iz) => {
                if (znacka !== "." && znacka !== "-") return;
                if (iz > 0) t += dil;

                const delka = (znacka === "-" ? 3 : 1) * dil;
                udalosti.push([t, delka]);
                t += delka;
            });

            pismena.push({ od, do: t });
        });
    });

    return { udalosti, pismena, celkem: t };
}

// Naplánuje na hlasitostní bránu obálku každé značky. U krátké značky se
// náběh zkrátí, aby na plnou hlasitost stihla dojít a nezněla tišeji než
// ostatní — proto ta čtvrtina délky.
function naplanujPipani(gain, start, udalosti) {
    for (const [kdy, delka] of udalosti) {
        const nabeh = Math.min(NABEH, delka / 4);
        const od = start + kdy;

        gain.gain.setValueAtTime(0, od);
        gain.gain.setValueCurveAtTime(NABEH_KRIVKA, od, nabeh);
        // mezi křivkami brána sama drží poslední hodnotu, tedy plně otevřeno
        gain.gain.setValueCurveAtTime(DOZNENI_KRIVKA, od + delka - nabeh, nabeh);
    }
}

// Přehrává se ta strana, na které je morseovka — podle směru překladu.
function morseKPrehrani() {
    if (inputTxt.value.trim() === "") return "";
    return vypadaJakoMorse(inputTxt.value) ? sjednotZnaky(inputTxt.value) : outputTxt.textContent;
}

function zastavPipani() {
    if (!hraje) return;

    cancelAnimationFrame(hraje.snimek);

    try {
        hraje.klic.gain.cancelScheduledValues(zvuk.currentTime);
        hraje.klic.gain.setValueAtTime(0, zvuk.currentTime);
        hraje.osc.onended = null;
        hraje.osc.stop();
    } catch {
        // oscilátor už mohl doběhnout sám, to nevadí
    }

    hraje = null;
    zvyrazni(null);
    prehraj.textContent = "Přehrát";
    prehraj.classList.remove("btn--hraje");
}

// Které písmeno se v čase t hraje. Zvýraznění na něm zůstane i v mezeře za
// ním, ať to mezi písmeny neproblikává. Před prvním písmenem vrací null.
// Hledá se od posledního nálezu, protože čas jde jen dopředu.
function kterePismeno(pismena, t, odIndexu = 0) {
    if (pismena.length === 0 || t < pismena[0].od) return null;

    let i = Math.max(0, odIndexu);
    while (i + 1 < pismena.length && t >= pismena[i + 1].od) i++;
    return i;
}

// Zvýraznění řídí snímkový cyklus podle hodin zvukové karty — přesnější než
// řetěz setTimeoutů a samo se srovná, když se snímek opozdí.
function sledujPrehravani(start, pismena) {
    let i = 0;

    function krok() {
        if (!hraje) return;

        const kde = kterePismeno(pismena, zvuk.currentTime - start, i);
        if (kde !== null) {
            i = kde;
            zvyrazni(i);
        }

        hraje.snimek = requestAnimationFrame(krok);
    }

    hraje.snimek = requestAnimationFrame(krok);
}

async function pipat() {
    if (hraje) {
        zastavPipani();
        return;
    }

    const kod = morseKPrehrani();
    if (kod.trim() === "") return;

    if (!zvuk) {
        const Zvuk = window.AudioContext || window.webkitAudioContext;
        if (!Zvuk) {
            oznam("Tvůj prohlížeč neumí Web Audio, pípání nepůjde.");
            return;
        }
        zvuk = new Zvuk();
    }
    // prohlížeče kontext uspávají, dokud uživatel na něco neklikne
    if (zvuk.state === "suspended") await zvuk.resume();

    const dil = 1.2 / Number(rychlost.value); // 1200 ms / WPM, v sekundách
    const { udalosti, pismena, celkem } = casovani(kod, dil);
    if (udalosti.length === 0) return;

    const { osc, klic, hlas } = postavRetezec(zvuk, hlasitostPodil());

    const start = zvuk.currentTime + 0.12;
    naplanujPipani(klic, start, udalosti);

    osc.start(start);
    osc.stop(start + celkem + 0.05);
    osc.onended = zastavPipani;

    hraje = { osc, klic, hlas, snimek: 0 };
    prehraj.textContent = "Zastavit";
    prehraj.classList.add("btn--hraje");
    sledujPrehravani(start, pismena);
}

// ---------------------------------------------------------------- aplikace

const inputTxt = document.querySelector("#inputTxt");
const outputTxt = document.querySelector("#outputTxt");
const smer = document.querySelector("#smer");
const hlaska = document.querySelector("#hlaska");
const preloz = document.querySelector("#translateButton");
const prohod = document.querySelector("#swapButton");
const kopiruj = document.querySelector("#copyButton");
const reset = document.querySelector("#resetButton");
const prehraj = document.querySelector("#playButton");
const rychlost = document.querySelector("#rychlost");
const posuvnik = document.querySelector("#hlasitost");
const hlasitostText = document.querySelector("#hlasitostHodnota");
const tabulka = document.querySelector("#tabulka");

// Výstup je div se spanem na každé písmeno — v textarey se jednotlivé znaky
// obarvit nedají a při pípání potřebujeme zvýraznit to, co zrovna hraje.
let spanyJednotek = [];
let zvyraznene = null;

function vykresliVystup(casti, jeMorse) {
    outputTxt.textContent = "";
    spanyJednotek = [];
    zvyraznene = null;

    for (const cast of casti) {
        if (cast.oddelovac !== undefined) {
            outputTxt.append(cast.oddelovac);
            continue;
        }

        const span = document.createElement("span");
        span.className = "jednotka";
        span.textContent = cast.jednotka;
        outputTxt.append(span);
        spanyJednotek.push(span);
    }

    outputTxt.classList.toggle("je-morse", jeMorse);
}

function zvyrazni(index) {
    if (zvyraznene === index) return;

    if (spanyJednotek[zvyraznene]) {
        spanyJednotek[zvyraznene].classList.remove("jednotka--hraje");
    }

    zvyraznene = index;
    const span = spanyJednotek[index];
    if (!span) return;

    span.classList.add("jednotka--hraje");

    // u delšího textu odroluj tak, aby zvýrazněné písmeno bylo vidět
    const nad = span.offsetTop < outputTxt.scrollTop;
    const pod = span.offsetTop + span.offsetHeight > outputTxt.scrollTop + outputTxt.clientHeight;
    if (nad || pod) {
        outputTxt.scrollTop = span.offsetTop - outputTxt.clientHeight / 2;
    }
}

function hlasitostPodil() {
    return Number(posuvnik.value) / 100;
}

function nastavHlasitost() {
    hlasitostText.textContent = posuvnik.value + " %";

    // Za běhu se hlasitost nepřepíná skokem — skok by lupnul. Krátká časová
    // konstanta ji dotáhne na novou hodnotu za pár desetin milisekundy.
    if (hraje) {
        hraje.hlas.gain.setTargetAtTime(hlasitostPodil(), zvuk.currentTime, 0.02);
    }
}

function prelozit() {
    const vstup = inputTxt.value;
    const doTextu = vypadaJakoMorse(vstup);

    inputTxt.classList.toggle("je-morse", doTextu);

    if (vstup.trim() === "") {
        vykresliVystup([], false);
        smer.textContent = "Text → Morseovka";
        hlaska.textContent = "";
        hlaska.classList.remove("hlaska--varovani");
        prehraj.disabled = true;
        return;
    }

    const vysledek = doTextu ? zMorse(vstup) : naMorse(vstup);

    vykresliVystup(vysledek.casti, !doTextu);
    smer.textContent = doTextu ? "Morseovka → Text" : "Text → Morseovka";
    prehraj.disabled = morseKPrehrani().trim() === "";

    if (vysledek.preskocene.length === 0) {
        hlaska.textContent = "";
        hlaska.classList.remove("hlaska--varovani");
    } else {
        const seznam = vysledek.preskocene.map((z) => `„${z}“`).join(", ");
        hlaska.textContent = doTextu
            ? `Neznámý kód: ${seznam}`
            : `Přeskočeno (není v morseovce): ${seznam}`;
        hlaska.classList.add("hlaska--varovani");
    }
}

function prohodit() {
    const puvodniVystup = outputTxt.textContent;
    if (puvodniVystup === "") return;

    zastavPipani();
    inputTxt.value = puvodniVystup;
    prelozit();
    inputTxt.focus();
}

async function kopirovat() {
    if (outputTxt.textContent === "") return;

    try {
        await navigator.clipboard.writeText(outputTxt.textContent);
        oznam("Zkopírováno do schránky.");
    } catch {
        // clipboard API nefunguje přes file:// ani bez HTTPS – označíme text,
        // ať ho jde zkopírovat ručně
        const rozsah = document.createRange();
        rozsah.selectNodeContents(outputTxt);
        const vyber = window.getSelection();
        vyber.removeAllRanges();
        vyber.addRange(rozsah);
        oznam("Schránka není dostupná, text je označený – zkopíruj ho ručně.");
    }
}

function resetovat() {
    zastavPipani();
    inputTxt.value = "";
    prelozit();
    inputTxt.focus();
}

let casovacHlasky;
function oznam(zprava) {
    clearTimeout(casovacHlasky);
    hlaska.textContent = zprava;
    hlaska.classList.remove("hlaska--varovani");
    casovacHlasky = setTimeout(prelozit, 2500);
}

// Písmena, pak čísla, pak ostatní znaky. Řadit se musí ručně: JavaScript
// staví klíče, které vypadají jako celé číslo, vždycky na začátek objektu.
function kategorie(znak) {
    if (/^[a-z]+$/.test(znak)) return 0;
    if (/^[0-9]$/.test(znak)) return 1;
    return 2;
}

// přehled abecedy se staví ze stejného slovníku, ať nemůže zastarat
function vypisTabulku() {
    const radky = Object.entries(SLOVNIK).sort(([a], [b]) => {
        return kategorie(a) - kategorie(b) || a.localeCompare(b, "cs");
    });

    tabulka.innerHTML = radky.map(([znak, kod]) => `
        <div class="tabulka__radek">
            <span class="tabulka__znak">${znak === '"' ? "&quot;" : znak}</span>
            <span class="tabulka__kod">${kod}</span>
        </div>`).join("");
}

preloz.addEventListener("click", prelozit);
prehraj.addEventListener("click", pipat);
prohod.addEventListener("click", prohodit);
kopiruj.addEventListener("click", kopirovat);
reset.addEventListener("click", resetovat);
inputTxt.addEventListener("input", () => {
    zastavPipani(); // morseovka se právě změnila, staré pípání už neplatí
    prelozit();
});
rychlost.addEventListener("change", zastavPipani);
posuvnik.addEventListener("input", nastavHlasitost);

vypisTabulku();
nastavHlasitost();
prelozit();
