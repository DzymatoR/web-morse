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

function vypadaJakoMorse(text) {
    const t = sjednotZnaky(text).trim();
    return t !== "" && /^[.\-/\s]+$/.test(t) && /[.\-]/.test(t);
}

// ---------------------------------------------------------------- překlad

function naMorse(text) {
    const vstup = bezDiakritiky(text.toLowerCase());
    const preskocene = new Set();

    const slova = vstup.split(/\s+/).filter(Boolean).map((slovo) => {
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

        return kody.join(ODDELOVAC_PISMEN);
    }).filter(Boolean);

    return {
        text: slova.join(ODDELOVAC_SLOV),
        preskocene: [...preskocene]
    };
}

function zMorse(kod) {
    const preskocene = new Set();

    const slova = sjednotZnaky(kod).split("/").map((slovo) => {
        return slovo.split(/\s+/).filter(Boolean).map((znak) => {
            if (znak in ZPET) return ZPET[znak];
            preskocene.add(znak);
            return "␣"; // ␣ – sem se nepodařilo nic přeložit
        }).join("");
    }).filter(Boolean);

    return {
        text: slova.join(" "),
        preskocene: [...preskocene]
    };
}

// ---------------------------------------------------------------- pípání

// Délky podle standardu: tečka 1 díl, čárka 3 díly, mezera mezi značkami
// v písmenu 1 díl, mezi písmeny 3 díly, mezi slovy 7 dílů. Délka dílu
// v milisekundách je 1200 / (slov za minutu).
const TON_HZ = 600;
const HLASITOST = 0.22;
const NABEH = 0.005; // krátký náběh a doznění, jinak to v reproduktoru lupe

let zvuk = null;   // AudioContext se vyrábí až při prvním kliknutí
let hraje = null;  // { osc, gain } když zrovna běží přehrávání

// Rozpadne morseovku na seznam [začátek, délka] v sekundách.
function casovani(kod, dil) {
    const udalosti = [];
    let t = 0;

    const slova = sjednotZnaky(kod).split("/").filter((s) => s.trim() !== "");

    slova.forEach((slovo, is) => {
        if (is > 0) t += 7 * dil;

        slovo.split(/\s+/).filter(Boolean).forEach((pismeno, ip) => {
            if (ip > 0) t += 3 * dil;

            [...pismeno].forEach((znacka, iz) => {
                if (znacka !== "." && znacka !== "-") return;
                if (iz > 0) t += dil;

                const delka = (znacka === "-" ? 3 : 1) * dil;
                udalosti.push([t, delka]);
                t += delka;
            });
        });
    });

    return { udalosti, celkem: t };
}

// Naplánuje na hlasitostní bránu obálku každé značky. Bez náběhu a doznění
// by přechody lupaly.
function naplanujPipani(gain, start, udalosti) {
    for (const [kdy, delka] of udalosti) {
        const od = start + kdy;
        const konec = od + delka;
        gain.gain.setValueAtTime(0, od);
        gain.gain.linearRampToValueAtTime(HLASITOST, od + NABEH);
        gain.gain.setValueAtTime(HLASITOST, konec - NABEH);
        gain.gain.linearRampToValueAtTime(0, konec);
    }
}

// Přehrává se ta strana, na které je morseovka — podle směru překladu.
function morseKPrehrani() {
    if (inputTxt.value.trim() === "") return "";
    return vypadaJakoMorse(inputTxt.value) ? sjednotZnaky(inputTxt.value) : outputTxt.value;
}

function zastavPipani() {
    if (!hraje) return;

    try {
        hraje.gain.gain.cancelScheduledValues(zvuk.currentTime);
        hraje.gain.gain.setValueAtTime(0, zvuk.currentTime);
        hraje.osc.onended = null;
        hraje.osc.stop();
    } catch {
        // oscilátor už mohl doběhnout sám, to nevadí
    }

    hraje = null;
    prehraj.textContent = "Přehrát";
    prehraj.classList.remove("btn--hraje");
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
    const { udalosti, celkem } = casovani(kod, dil);
    if (udalosti.length === 0) return;

    const osc = zvuk.createOscillator();
    const gain = zvuk.createGain();
    osc.type = "sine";
    osc.frequency.value = TON_HZ;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(zvuk.destination);

    const start = zvuk.currentTime + 0.08;
    naplanujPipani(gain, start, udalosti);

    osc.start(start);
    osc.stop(start + celkem + 0.05);
    osc.onended = zastavPipani;

    hraje = { osc, gain };
    prehraj.textContent = "Zastavit";
    prehraj.classList.add("btn--hraje");
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
const tabulka = document.querySelector("#tabulka");

function prelozit() {
    const vstup = inputTxt.value;

    if (vstup.trim() === "") {
        outputTxt.value = "";
        smer.textContent = "Text → Morseovka";
        hlaska.textContent = "";
        prehraj.disabled = true;
        return;
    }

    const doTextu = vypadaJakoMorse(vstup);
    const vysledek = doTextu ? zMorse(vstup) : naMorse(vstup);

    outputTxt.value = vysledek.text;
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
    const puvodniVystup = outputTxt.value;
    if (puvodniVystup === "") return;

    zastavPipani();
    inputTxt.value = puvodniVystup;
    prelozit();
    inputTxt.focus();
}

async function kopirovat() {
    if (outputTxt.value === "") return;

    try {
        await navigator.clipboard.writeText(outputTxt.value);
        oznam("Zkopírováno do schránky.");
    } catch {
        // clipboard API nefunguje přes file:// ani bez HTTPS – vybereme text,
        // ať ho jde zkopírovat ručně
        outputTxt.select();
        oznam("Schránka není dostupná, text je označený – zkopíruj ho ručně.");
    }
}

function resetovat() {
    zastavPipani();
    inputTxt.value = "";
    outputTxt.value = "";
    smer.textContent = "Text → Morseovka";
    hlaska.textContent = "";
    hlaska.classList.remove("hlaska--varovani");
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

vypisTabulku();
prelozit();
