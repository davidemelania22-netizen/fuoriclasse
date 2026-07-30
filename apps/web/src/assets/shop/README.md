# Immagini degli articoli del negozio

Qui dentro si mettono le immagini "vere" degli articoli, quando ci sono.

**Come funziona:** basta salvare un file col nome della chiave dell'articolo.
Se il file esiste, il negozio lo usa al posto dell'illustrazione disegnata;
se non c'è, resta l'illustrazione SVG. Nessuna modifica al codice.

- Nome file = `key` dell'articolo in `packages/game-data/src/shop.ts`
  (esempi: `custom-boots.png`, `sports-car.webp`, `mental-coach.jpg`)
- Formati accettati: `.png`, `.jpg`, `.jpeg`, `.webp`
- Formato consigliato: **quadrato**, almeno 400x400, sfondo scuro o
  trasparente (le card sono su fondo scuro)

Le immagini vengono raccolte a build time da `ShopArt.tsx` con
`import.meta.glob`, quindi dopo aver aggiunto un file va rifatto
`npm run build -w @football-life/web`.

## Immagini già presenti

Categoria **Attrezzatura: completa** (6/6).

- `shin-guards.jpg` — parastinchi neri e oro
- `compression-kit.jpg` — sottomaglia a compressione
- `custom-boots.jpg` — scarpini neri e oro
- `altitude-mask.jpg` — maschera per l'altura
- `recovery-tech.jpg` — stivali a compressione + rullo
- `boot-collection.jpg` — griglia di scarpini

Tutte 440x440, JPEG qualità 85.

Sono state ritagliate in quadrato e ridotte a 440x440 con `sips`:

```
sips --resampleHeight 440 originale.webp -s format jpeg -s formatOptions 85 --out step.jpg
sips -c 440 440 step.jpg --out <key>.jpg
```
