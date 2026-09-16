# Poznámky k vývoji

Proč je něco udělané tak, jak je, a co zůstává otevřené. Uživatelský popis
je v [README](README.md).

## Rozhodnutí, která nejsou z kódu vidět

**Slova odděluje `/`, písmena mezera.** Původní verze psala `/` za každý znak.
Bez jednoznačného oddělovače slov se ale morseovka nedá rozebrat zpátky, takže
překlad tam a zase zpět by nefungoval.

**Diakritika se řeší rozkladem NFD**, ne dvojicemi klíčů ve slovníku. `ř` se
rozloží na `r` + háček a háček se zahodí. Slovník tak nemusí mít každé písmeno
dvakrát a nemůže se stát, že se někde jedna varianta zapomene.

**`ch` je jeden morseovský znak** (`----`), proto se při překladu hledá jako
dvojznak dřív než samotné `c`.

**Překlad vrací seznam jednotek, ne hotový řetězec.** Díky tomu n-tá pípnutá
značka odpovídá n-té jednotce ve výstupu a jde zvýraznit to, co zrovna hraje.
Morseovka se na slova a značky dělí jednou společnou funkcí (`rozdelSlova`) —
kdyby překlad a časování dělily každý po svém, zvýraznění by se rozešlo.

**Výstup není `<textarea>`, ale `div` se `span`em na každé písmeno.** V textarey
se jednotlivé znaky obarvit nedají.

**Zvýraznění řídí snímkový cyklus podle hodin zvukové karty**, ne řetěz
`setTimeout`ů. Když se snímek opozdí, samo se to srovná.

**Obálka tónu je zvednutý kosinus, 8 ms.** Lineární náběh nemá skok v hodnotě,
ale má roh v derivaci, a ten rozhodí energii daleko od nosné — telegrafisté
tomu říkají key clicks a je to slyšet jako praskání. Naměřeno na vyrenderovaném
signálu, energie mimo okolí nosné vůči celku:

|          | >300 Hz | >600 Hz | >1200 Hz | >2400 Hz |
| -------- | ------- | ------- | -------- | -------- |
| lineární |   -45,5 |   -58,2 |    -67,7 |    -77,0 |
| kosinus  |   -62,1 |   -78,8 |    -92,9 |    -96,6 |

**Klíčování a hlasitost jsou dva různé uzly.** Posuvník sahá jen na ten druhý,
takže se tvaru obálky nedotkne a jde s ním hýbat i uprostřed přehrávání.

**Zvýrazněné písmeno nemá přechod ani rozmazaný stín.** Obojí nutí prohlížeč
překreslovat i prosklené pozadí karty při každém písmenu a takový výkyv se na
pomalejším stroji může ozvat v přehrávaném tónu.

**Slovník zůstal v `script.js`, ne v JSON souboru.** Načítání přes `fetch`
nefunguje při otevření přes `file://` a projekt má jít spustit poklepáním na
`index.html`, bez serveru.

## Testy

    node testy/prekladac.test.js      # bez závislostí

    npm install playwright && npx playwright install chromium
    python3 -m http.server 8731 --bind 127.0.0.1 &
    node testy/prohlizec.test.js

Do prohlížečových testů se vešlo i měření zvuku: značky se renderují přes
`OfflineAudioContext` celým řetězcem aplikace a kontroluje se špička, ticho
v mezerách i to, že mezi vzorky není větší skok než u čisté sinusovky.

Pozor na dvě pasti, do kterých se tu snadno spadne:

- `requestAnimationFrame` v holém `headless_shell` neběží, v plném Chromiu
  proběhne sotva jednou. Zvýraznění se proto testuje přes Playwright, nebo
  voláním funkcí napřímo.
- `getComputedStyle` vrací živý objekt. Hodnotu pro porovnání „před a po" je
  potřeba si vytáhnout jako řetězec hned, ne až potom.

## Co zůstává otevřené

- **Větev `vyvoj`** má dvanáct commitů rozdělané práce na stejných věcech
  (rozpoznávání směru, překlad v reálném čase, interpunkce, `dictionary.json`).
  Dekódování tam zůstalo nedodělané. Merge bude konfliktní, protože `script.js`
  je mezitím přepsaný. Funkčně tam není nic, co by na `master` chybělo.
- **Pozadí na mobilu** je vidět jen okrajově. Koláž má záměrně prázdný střed,
  aby na ní šla číst karta, jenže na úzkém displeji karta zabírá skoro celou
  šířku. Výřez je posunutý doleva k motivům, víc se s tím udělat nedá.
- **Nápady:** blikání baterkou nebo obrazovkou místo pípání, uložení
  přeloženého textu do souboru, trénink příjmu (aplikace pípá, uživatel píše).

## Historie

Původní verze uměla jen text → morseovka, ztrácela mezery mezi slovy, na
neznámý znak psala `undefined` a `ch` ve slovníku měla, ale nikdy nepoužila.
Pozadí je vygenerovaný obrázek; předtím tu byla kreslená vektorová koláž
(`assets/collage.svg`), obojí zůstává v historii gitu.
