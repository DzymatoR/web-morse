# web-morse

Webový překladač z a do Morseovky. Čistý HTML + CSS + JavaScript, žádné
závislosti ani build — stačí otevřít `index.html` v prohlížeči.

## Co umí

- **Oba směry** — text na morseovku i zpátky. Směr se pozná sám podle vstupu.
- **Češtinu** — diakritika se převádí na základní písmeno (`ř` → `r`),
  `ch` je jeden morseovkový znak (`----`).
- **Čísla a interpunkci** — `.` `,` `?` `!` `:` `-` `/` `@` a další.
- **Živý překlad** při psaní, plus tlačítka Přelož, Prohodit, Kopírovat a Reset.
- **Pípání** — tlačítko Přehrát vyťuká morseovku tónem, ve třech tempech,
  a zvýrazňuje písmeno, které zrovna hraje.
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
