# Prompt per generare le immagini del negozio

Servono **39 immagini** (parastinchi e scarpini sono già fatti).

Il metodo: incolli il **prompt base** e ci aggiungi la **riga soggetto**
dell'articolo. Il prompt base tiene lo stile identico su tutte e 41; la riga
soggetto cambia solo il contenuto.

Salvi il file col nome indicato (`<key>.jpg` o `.png`) in questa cartella e
rifai `npm run build -w @football-life/web`. Non serve toccare il codice.

---

## Prompt base (da incollare ogni volta)

```
Professional product photograph, square 1:1 composition, single subject centred
with generous empty margin around it. Matte black and brushed gold colour
scheme only. Dark charcoal studio background with a soft graduated falloff from
top-left. Soft large-source studio lighting, gentle specular highlights on the
gold, shallow depth of field, subtle contact shadow beneath the subject.
Premium sports-equipment catalogue look, clean and uncluttered, photorealistic.

SUBJECT: <qui va la riga soggetto>

Absolutely no text, no lettering, no numbers, no logos, no brand marks, no
trademarks. No people, no faces, no hands, no body parts. No watermarks, no
borders, no collage, no multiple panels.
```

**Perché queste regole**

- *Niente testo e niente marchi*: il gioco è volutamente license-free (i club e
  le competizioni sono inventati), quindi un logo reale in una foto stonerebbe
  e sarebbe un problema.
- *Niente persone né volti*: gli articoli che sono **servizi** (mental coach,
  massaggiatore, social media manager…) vengono resi con **l'oggetto che li
  rappresenta**, non con un modello. Così le 41 immagini restano una famiglia
  coerente e non ci sono questioni di somiglianza.
- *Fondo scuro*: le card del gioco sono su nero. Le tue prime due hanno il
  fondo grigio chiaro e spiccano come due riquadri luminosi; con il fondo
  scuro l'insieme risulta uniforme.
- *Soggetto centrato con margine*: la tile è **quadrata** e ritagliata al
  centro. Se il soggetto arriva ai bordi, in fase di ritaglio si perde.

## Specifiche tecniche

- Formato **quadrato**, minimo 800x800 (poi le riduco io a 440x440)
- Se il generatore produce solo 16:9 o 4:3, va bene: ritaglio io al centro, ma
  tieni il soggetto ben dentro la parte centrale quadrata
- JPEG o PNG o WebP, indifferente

---

## Le 39 righe soggetto

### 🥾 Attrezzatura

| File | SUBJECT |
|---|---|
| `compression-kit.jpg` | a long-sleeve athletic compression base-layer top, black with thin gold seam lines, laid flat and neatly folded |
| `altitude-mask.jpg` | a black neoprene altitude training mask with gold valve rings and adjustable straps, standing upright three-quarter view |
| `recovery-tech.jpg` | a black textured foam roller lying horizontally with gold end caps, and a rolled recovery band beside it |
| `boot-collection.jpg` | six football boots in matte black with gold trim, arranged in two neat rows on a dark shelf, side profile |

### 💚 Benessere

| File | SUBJECT |
|---|---|
| `nutritionist.jpg` | an elegant plated athlete meal on a dark slate plate — grilled fish, greens, grains — with a small gold measuring scale beside it |
| `sleep-clinic.jpg` | a dark bedroom detail: a plump pillow and folded dark bedding, a soft gold bedside lamp glow, a sleep-tracking ring on the nightstand |
| `physio-session.jpg` | a physiotherapy treatment table in black leather with gold frame legs, a folded towel and a bottle of massage oil on it |
| `cryotherapy.jpg` | the open doorway of a cryotherapy chamber, cold white vapour spilling out over a dark floor, gold trim around the frame |
| `yoga-retreat.jpg` | a rolled black yoga mat standing on end, a gold meditation cushion and two smooth stones beside it |
| `mental-coach.jpg` | two facing armchairs in black leather in a quiet dark room, a small side table between them with a notebook and a gold pen |
| `massage-therapist.jpg` | a black massage table with a stack of three folded white towels and a gold-capped oil bottle |

### 🎯 Allenamento

| File | SUBJECT |
|---|---|
| `language-tutor.jpg` | a stack of language notebooks and flashcards on a dark desk, a gold fountain pen and a pair of headphones beside them |
| `personal-trainer.jpg` | a gold stopwatch, a coach's whistle on a black lanyard and a black clipboard, arranged on a dark surface |
| `video-analyst.jpg` | a dark monitor on a desk showing an abstract tactical diagram of gold dots and arrows on a green pitch, a notebook beside it |
| `set-piece-coach.jpg` | a black and gold football resting on the penalty spot of a dark pitch, a row of training cones behind it |
| `private-pitch.jpg` | a small private football pitch at night seen from a low angle, gold floodlight glow, dark grass, white line markings |

### 📸 Immagine

| File | SUBJECT |
|---|---|
| `photoshoot.jpg` | a professional camera body with a large lens on a tripod, a softbox light behind it, dark studio |
| `fan-club.jpg` | a black and gold supporters' scarf draped over a stadium seat, a stack of membership cards beside it |
| `social-manager.jpg` | a smartphone standing on a dark desk with a small ring light behind it, a notebook and a gold pen |
| `pr-agency.jpg` | a black press-conference microphone on a gold stand, a second microphone slightly behind, dark backdrop |
| `documentary.jpg` | a cinema camera on a heavy tripod with a black and gold clapperboard leaning against its leg, dark set |

### 🏠 Casa

| File | SUBJECT |
|---|---|
| `home-gym.jpg` | a pair of black hex dumbbells with gold handles on a dark rubber gym floor, a bench edge behind |
| `sauna-pool.jpg` | a dark stone sauna interior detail with a wooden bucket and gold ladle, warm low light, faint steam |
| `city-apartment.jpg` | a modern apartment interior at night seen from inside, floor-to-ceiling window with a dark city skyline and gold lights beyond |
| `mansion.jpg` | a large modern villa at dusk seen from the garden, dark stone and glass, warm gold interior lights, a still pool in front |

### 👨‍👩‍👦 Famiglia

| File | SUBJECT |
|---|---|
| `family-holiday.jpg` | three travel suitcases of different sizes in black with gold trim, stacked beside a straw sun hat |
| `mum-car.jpg` | a compact family car in dark paint with a large red gift bow on its roof, dark studio floor |
| `parents-house.jpg` | a set of house keys with a gold keyring resting on a dark wooden table, a small red ribbon tied to them |

### ✨ Stile di vita

| File | SUBJECT |
|---|---|
| `short-holiday.jpg` | a black sun lounger with a rolled towel beside a dark infinity pool at dusk, a single palm silhouette |
| `charity-event.jpg` | a black and gold charity gala table detail: a donation box, a folded programme and a single gold ribbon pin |
| `personal-chef.jpg` | a chef's white jacket and a black apron hanging on a hook in a dark professional kitchen, gold pans behind |
| `luxury-watch.jpg` | a luxury wristwatch with a black dial, gold case and black leather strap, standing on a dark surface |
| `sports-car.jpg` | a low sleek sports car in matte black with gold wheel rims, three-quarter front view, dark studio floor |
| `foundation.jpg` | a black marble plaque on a dark wall with a plain gold ribbon draped across it, no lettering |
| `private-jet.jpg` | a private jet on a dark runway at night, black fuselage with gold striping, airstair lowered, gold apron lights |

### 🎮 Gadget

| File | SUBJECT |
|---|---|
| `noise-headphones.jpg` | over-ear noise-cancelling headphones in matte black with gold hinges, standing upright three-quarter view |
| `game-console.jpg` | a game controller in matte black with gold sticks and buttons, resting on a dark surface |
| `training-watch.jpg` | a sports smartwatch with a black band and gold bezel, dark screen showing an abstract gold pulse line, upright |
| `vr-reaction-trainer.jpg` | a VR headset in matte black with gold accents and its two hand controllers, on a dark surface |

---

## Se preferisci farne poche alla volta

Non serve completare tutto: le immagini che mancano restano con
l'illustrazione disegnata, che è già a posto. Puoi fare una categoria per
volta e ogni foto sostituisce il suo disegno appena la aggiungi.
