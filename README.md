# web-morse

Webový překladač z a do Morseovky. Čistý HTML + CSS + JavaScript, žádné
závislosti ani build — stačí otevřít `index.html` v prohlížeči.

## Co umí

- **Oba směry** — text na morseovku i zpátky. Směr se pozná sám podle vstupu.
- **Češtinu** — diakritika se převádí na základní písmeno (`ř` → `r`),
  `ch` je jeden morseovkový znak (`----`).
- **Čísla a interpunkci** — `.` `,` `?` `!` `:` `-` `/` `@` a další.
- **Živý překlad** při psaní, plus tlačítka Přelož, Prohodit, Kopírovat a Reset.
- **Přehled abecedy** — rozbalovací tabulka, staví se ze stejného slovníku
  jako překlad, takže nemůže zastarat.

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

### Výměna pozadí

Koláž je v CSS jako proměnná. Pro vlastní obrázek stačí přepsat jeden řádek
na začátku `style.css`:

```css
--kolaz: url("assets/vlastni-obrazek.jpg");
--kolaz-sytost: 0.55;   /* 0 = skryté, 1 = plná sytost */
```
