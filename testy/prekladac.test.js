// Testy překladu a časování. Běží bez prohlížeče a bez závislostí:
//
//     node testy/prekladac.test.js
//
// Ze script.js se vezme jen část nad hlavičkou "aplikace" — ta zbylá sahá na
// DOM, který tu není. Díky tomu nemusí být v projektu žádný modulový systém.

const fs = require("fs");
const path = require("path");

const KOREN = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(KOREN, "script.js"), "utf8");
const cistaLogika = src.split("// ---------------------------------------------------------------- aplikace")[0];
const mod = {};
eval(cistaLogika + "\nObject.assign(mod,{naMorse,zMorse,vypadaJakoMorse,SLOVNIK,ZPET,casovani,kterePismeno});");
const { naMorse, zMorse, vypadaJakoMorse, SLOVNIK, ZPET, casovani, kterePismeno } = mod;

let pass = 0, fail = 0;
const t = (popis, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${popis}${ok ? "" : `\n     čekáno: ${JSON.stringify(b)}\n     dostal: ${JSON.stringify(a)}`}`);
};

t("ahoj", naMorse("ahoj").text, ".- .... --- .---");
t("mezera mezi slovy", naMorse("ahoj svete").text, ".- .... --- .--- / ... ...- . - .");
t("diakritika: přílež", naMorse("žluťoučký").text, naMorse("zlutoucky").text);
t("ch jako jeden znak", naMorse("chata").text, "---- .- - .-");
t("c+h zvlášť se nezachytí", naMorse("ch").text, "----");
t("velká písmena", naMorse("AHOJ").text, naMorse("ahoj").text);
t("čísla", naMorse("sos 911").text, "... --- ... / ----. .---- .----");
t("interpunkce", naMorse("ano?").text, ".- -. --- ..--..");
t("neznámý znak se přeskočí", naMorse("a♥b").text, ".- -...");
t("neznámý znak se ohlásí", naMorse("a♥b").preskocene, ["♥"]);
t("žádné undefined", naMorse("a♥b").text.includes("undefined"), false);
t("prázdný vstup", naMorse("   ").text, "");
t("vícenásobné mezery", naMorse("a    b").text, ".- / -...");

t("dekód: ahoj", zMorse(".- .... --- .---").text, "ahoj");
t("dekód: dvě slova", zMorse(".- .... --- .--- / ... ...- . - .").text, "ahoj svete");
t("dekód: lomítko bez mezer", zMorse(".../---/...").text, "s o s");
t("dekód: ch", zMorse("----").text, "ch");
t("dekód: unicode odrážky", zMorse("··· −−− ···").text, "sos");
t("dekód: neznámý kód ohlášen", zMorse("........").preskocene, ["........"]);
t("dekód: prázdné", zMorse("   ").text, "");

const vety = ["ahoj svete", "sos sos sos", "chata u lesa", "tabor 2026", "skaut vzdy pripraven", "kdo to ctes ahoj"];
for (const v of vety) t(`round-trip: "${v}"`, zMorse(naMorse(v).text).text, v);
t("round-trip s diakritikou", zMorse(naMorse("Příliš žluťoučký kůň").text).text, "prilis zlutoucky kun");

t("detekce morse", vypadaJakoMorse(".- .... --- .---"), true);
t("detekce textu", vypadaJakoMorse("ahoj"), false);
t("detekce prázdného", vypadaJakoMorse("   "), false);
t("detekce: samé lomítko není morse", vypadaJakoMorse("///"), false);

// každý kód musí být dekódovatelný
const nedekodovatelne = Object.entries(SLOVNIK).filter(([z, k]) => !(k in ZPET));
t("všechny kódy jsou v opačném slovníku", nedekodovatelne, []);
// kolize kódů
const kolize = {};
for (const [z, k] of Object.entries(SLOVNIK)) (kolize[k] ||= []).push(z);
const duplicity = Object.entries(kolize).filter(([, z]) => z.length > 1);
t("žádné dva znaky nesdílí kód", duplicity, []);

// --- casovani pipani (v dilech, dil = 1) ---
const dily = (kod) => casovani(kod, 1).udalosti;
t("tecka trva 1 dil", dily("."), [[0, 1]]);
t("carka trva 3 dily", dily("-"), [[0, 3]]);
t("mezera ve znaku je 1 dil", dily(".-"), [[0, 1], [2, 3]]);
t("mezera mezi pismeny je 3 dily", dily(". ."), [[0, 1], [4, 1]]);
t("mezera mezi slovy je 7 dilu", dily(". / ."), [[0, 1], [8, 1]]);
t("sos trva 27 dilu", casovani("... --- ...", 1).celkem, 27);
t("sos ma 9 znacek", dily("... --- ...").length, 9);
t("cizi znaky se ignoruji", dily(".x."), [[0, 1], [2, 1]]);
t("prazdna morseovka nic nehraje", dily("   "), []);
t("unicode odrazky hraji taky", dily("\u00b7\u2212"), [[0, 1], [2, 3]]);
t("dil se skaluje rychlosti", casovani("...", 0.5).celkem, 2.5);
t("13 wpm: tecka je 92 ms", Math.round(casovani(".", 1.2 / 13).celkem * 1000), 92);

// --- ktere pismeno zrovna hraje ---
const sos = casovani("... --- ...", 1).pismena;
t("pred zacatkem nesviti nic", kterePismeno(sos, -0.5), null);
t("na zacatku sviti prvni", kterePismeno(sos, 0), 0);
t("uprostred prvniho sviti prvni", kterePismeno(sos, 3), 0);
t("v mezere za prvnim sviti porad prvni", kterePismeno(sos, 6), 0);
t("na zacatku druheho sviti druhy", kterePismeno(sos, 8), 1);
t("na konci sviti posledni", kterePismeno(sos, 27), 2);
t("za koncem sviti porad posledni", kterePismeno(sos, 999), 2);
t("prazdne nic nevrati", kterePismeno([], 5), null);
t("hledani od posledniho nalezu dava totez", kterePismeno(sos, 22, 1), kterePismeno(sos, 22, 0));
t("pocet pismen sedi s jednotkami vystupu", casovani(naMorse("ahoj svete").text, 1).pismena.length, naMorse("ahoj svete").casti.filter((c) => c.jednotka).length);
t("pri dekodovani sedi pocet taky", casovani("... --- ...", 1).pismena.length, zMorse("... --- ...").casti.filter((c) => c.jednotka).length);
t("jednotky a oddelovace daji puvodni text", zMorse("... --- ...").casti.map((c) => c.jednotka ?? c.oddelovac).join(""), "sos");

// --- morseovka v hlavičce stránky musí dávat smysl ---
const html = fs.readFileSync(path.join(KOREN, "index.html"), "utf8");
const nadpisek = html.match(/<p class="nadpisek">([^<]+)<\/p>/);
t("hlavička obsahuje morseovku", Boolean(nadpisek), true);
t("hlavička se čte jako morse", zMorse(nadpisek[1]).text, "morse");
t("v hlavičce není neznámý kód", zMorse(nadpisek[1]).preskocene, []);

console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
