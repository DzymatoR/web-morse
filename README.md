# web-morse

Webový překladač z a do Morseovky. Čistý HTML + CSS + JavaScript, žádné
závislosti ani build — stačí otevřít `index.html` v prohlížeči.

## Co umí

- **Oba směry** — text na morseovku i zpátky. Směr se pozná sám podle vstupu.
- **Češtinu** — diakritika se převádí na základní písmeno (`ř` → `r`),
  `ch` je jeden morseovkový znak (`----`).
- **Čísla a interpunkci** — `.` `,` `?` `!` `:` `-` `/` `@` a další.
- **Živý překlad** při psaní, plus tlačítka Přelož, Prohodit, Kopírovat a Reset.
- **Pípání** — tlačítko Přehrát vyťuká morseovku tónem, ve třech tempech
  a s nastavitelnou hlasitostí, a zvýrazňuje písmeno, které zrovna hraje.
- **Přehled abecedy** — rozbalovací tabulka, staví se ze stejného slovníku
  jako překlad, takže nemůže zastarat.

## Pípání

Přehrává se přes Web Audio, takže není potřeba žádný zvukový soubor. Délky
drží standard: tečka je jeden díl, čárka tři, mezera mezi značkami v písmenu
jeden díl, mezi písmeny tři a mezi slovy sedm. Délka dílu vychází z tempa —
je to `1200 / počet slov za minutu` v milisekundách, takže „normálně" (13
slov za minutu) dává tečku 92 ms.

Přehrává se vždy ta strana, na které je morseovka: při překladu do morseovky
výstup, při překladu zpátky vstup.

Tempo a hlasitost si aplikace pamatuje. Ukládá je do `localStorage`, tedy jen
do prohlížeče na tomhle počítači — aplikace nemá server a nikam nic neposílá.
K úložišti se ale nemusí jít dostat vůbec (soukromé okno, zakázaná data webu,
vložený rám), a tam vyhodí výjimku už samotný přístup k němu. Každé sáhnutí je
proto v `try`/`catch` a když to nejde, jede se dál s výchozími hodnotami.
Načtené hodnoty se navíc ověřují proti tomu, co ovládací prvky nabízejí — v
úložišti může být cokoliv, třeba z nějaké starší verze.

Hlasitost jde měnit i uprostřed přehrávání. Řetězec je proto rozdělený na
dva uzly: první klíčuje jednotlivé značky obálkou, druhý drží hlasitost.
Posuvník sahá jen na ten druhý, takže se obálky nedotkne. Nová hodnota se
nenasazuje skokem — skok by lupnul — ale dotáhne se za pár desetin milisekundy.

Každá značka má náběh a doznění tvarované zvednutým kosinem, 8 ms. Ostrý
začátek tónu je slyšet jako lupnutí — roh v obálce rozhodí energii daleko od
nosné, telegrafisté tomu říkají key clicks. Proti lineárnímu náběhu stejné
délky má kosinus ve vzdálenosti 1200 Hz od nosné asi o 25 dB méně rozstřelu.
U hodně krátké značky se náběh zkrátí na čtvrtinu její délky, aby stihla dojít
na plnou hlasitost a nezněla tišeji než ostatní.

Písmeno, které právě hraje, se ve výstupu zvýrazní. Při překladu do morseovky
se tak rozsvěcí jednotlivé kódy, při překladu zpátky rovnou přeložená písmena.
Výstup proto není `<textarea>`, ale `div` se `span`em na každé písmeno — v
textarey se jednotlivé znaky obarvit nedají.

## Zápis morseovky

Písmena odděluje mezera, slova lomítko:

```
ahoj svete  →  .- .... --- .--- / ... ...- . - .
```

Při dekódování projdou i tečky a pomlčky zapsané jako `·` nebo `−`.
Znaky, které ve slovníku nejsou, se přeskočí a aplikace na ně upozorní.

## Soubory

| soubor | co v něm je |
| --- | --- |
| `index.html` | struktura stránky |
| `style.css` | vzhled |
| `script.js` | slovník a překlad |
| `assets/kolaz.webp` | koláž na pozadí |
| `assets/favicon.svg` | ikona do panelu karet |

### Výměna pozadí

Koláž je v CSS jako proměnná. Pro vlastní obrázek stačí přepsat jeden řádek
na začátku `style.css`:

```css
--kolaz: url("assets/vlastni-obrazek.jpg");
--kolaz-sytost: 0.55;   /* 0 = skryté, 1 = plná sytost */
```
