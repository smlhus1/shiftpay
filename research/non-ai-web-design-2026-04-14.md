# Research: Hvordan designe nettsider med Claude Code uten at det ser AI-generert ut

> Undersøkt: 2026-04-14 | Kilder konsultert: 12+ | Konfidensgrad: Høy
> Kontekst: Stian bygger landingssider (bl.a. ShiftPay — norsk app for skiftarbeidere) med Claude Code. Dark mode, single-page, hero + features + skjermbilder + CTA. Vil unngå "vibekodet" AI-estetikk.

---

## TL;DR

LLM-er konvergerer mot medianen av det de har lest på GitHub 2019–2024 — og det er derfor AI-sider ser like ut. Måten du bryter med dette på er ikke å be om "finere design", men å **forhåndsforplikte deg til spesifikke estetiske valg før koden skrives**: én distinkt font (ikke Inter/Roboto), én dominerende farge med skarpe accenter (ikke lilla-til-blå gradient), asymmetriske layout (ikke sentrert alt), og én godt orkestrert page-load-animasjon (ikke spredte micro-interactions overalt). Den viktigste moven er å skrive en 200–400-ords "design constitution" som første fil i prosjektet, og referere den eksplisitt i hver prompt. Custom skjermbilder, ekte copy på norsk med personlighet, og ett "weird but intentional" element (en egen illustrasjon, en uvanlig fargeaksent, en signaturinteraksjon) er det som tar en ShiftPay-side fra "launched this weekend with Claude" til "dette ser ut som en designer lagde det".

---

## 1. Visuelle tells som avslører AI-generert design i 2026

Dette er den faktiske sjekklisten — hvis siden din har 3+ av disse, er den **lest som AI-slop**:

### Typografi
- **Inter, Roboto, Poppins, Open Sans, Lato, Space Grotesk, system-ui.** Disse er dead giveaways i 2026. Inter er det mest brente fontvalget i hele ekosystemet.
- Én vektklasse gjennom hele siden (400 + 600). Mangel på kontrast.
- Display-størrelser som ikke er virkelig store (48–64px hero i stedet for 96–140px).

### Farger
- **Lilla-til-blå gradient** i hero, knapper og bakgrunn ("Stripe-but-not-Stripe").
- Default shadcn-grå palett (`zinc-950`, `zinc-900`, `zinc-800` kaskade uten modifikasjon).
- Fargefylte bokser med lavere opacity og samme farge som border.
- Radiale gradient-"glows" i hver seksjon for den "moderne" følelsen.
- Alle primærknapper blå eller indigo.

### Layout
- **Alt sentrert.** Hero sentrert, features sentrert, CTA sentrert.
- **3-kolonners ikon-grid** for features (alltid 3, alltid ikon-over-tittel-over-paragraf).
- Uniform 16px eller 12px border-radius på absolutt alt — kort, knapper, inputs, bilder.
- Bokser inni bokser inni bokser. "Card in a card in a card".
- Forutsigbar vertikal spacing (py-20 overalt). Ingen rytmevariasjon.
- Symmetrisk komposisjon der begge halvdeler har samme vekt.

### Ikoner og imagery
- **Heroicons eller Lucide-ikoner** usedvanlig uendret. Samme set som alle andre bruker.
- 3D blobs / abstrakte gradient-kuler som flyter i bakgrunnen.
- Glassmorphism-kort med backdrop-blur som ikke tjener noen funksjon.
- Midjourney-genererte illustrasjoner (har en distinkt "plastikkvalitet" — for glatt, for symmetrisk).
- Stock-bilder av "diverse group at a well-lit desk".

### Animasjon
- Ingen micro-interactions, eller bare generisk `fade-in-on-scroll` på hver seksjon.
- Knapper som "snapper" inn/ut i stedet for ease.
- Konstant pulserende/bouncende elementer uten grunn.
- Hovers uten state-differensiering (alt bare blir 80% opacity).

### Copy
- "Build the future of [X]"
- "Your all-in-one [X] platform"
- "Streamline your workflow"
- Hedging: "can help", "may improve", "potentially"
- Superlativer uten substans: "best-in-class", "cutting-edge", "next-gen"
- Ingen personlig risiko, ingen konkrete tall, ingen navn.

### Footer / småting
- "Built with Next.js and Tailwind" som et badge.
- Navigasjon med nøyaktig 5 lenker: Features, Pricing, About, Blog, Contact.
- Social proof som er tomme "As seen on TechCrunch"-loger uten lenke.

---

## 2. Designprinsipper som motvirker AI-estetikk

De følgende prinsippene er syntetisert fra Anthropic sin egen frontend-aesthetics cookbook, Monet Designs "escape AI slop"-guide, og analyser av rauno.me, vercel.com, linear.app:

### Prinsipp 1: Commit, don't hedge
Svake paletter taper mot sterke paletter. Bestem deg for én dominerende farge og bruk den 80% av tiden — bruk så en skarp accent 15% og nøytral 5%. **Timid, evenly-distributed palettes are the AI tell.** Commit til én tydelig tone, ikke alle toner.

### Prinsipp 2: Asymmetri som standard
AI defaulter til sentrert alt. Mennesker varierer. Venstrejuster hero. Bruk 60/40-splitter, ikke 50/50. La skjermbilder gå off-canvas på høyre side slik at de blør ut av viewporten. Asymmetri **signaliserer intensjonalitet**.

### Prinsipp 3: Én orkestrert page-load > spredte micro-interactions
Anthropics cookbook: "one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions". Stagger hero-elementene med `animation-delay` i 50–80ms steg, og la alt annet være stille. Motsatt av AI-default som animerer alt hele tiden.

### Prinsipp 4: Typografisk kontrast = intensjonell
- Display + monospace. Serif + geometrisk sans. Ikke to sanser.
- Vektekstremer: 200 vs 800, ikke 400 vs 600.
- Størrelsessprang på 3x+, ikke 1.5x (fra `16px` body til `96px` hero, ikke `24px`).
- Varier tracking: negativ tracking på store display-størrelser (-0.04em på 96px), normal på brødtekst.

### Prinsipp 5: Ett rart men bevisst element
Rauno.me har en OS-inspirert dock med lyd. Linear har command-menu som hero. Josh W. Comeaus trash-ikon "spiser" tegn én etter én. **Ett signaturelement som ikke finnes på andre sider er det som gjør siden din gjenkjennelig.** Ikke ti snacks — ett hovedmåltid.

### Prinsipp 6: Ekte innhold > lorem/stock
Den enkleste testen: kan du bytte ut ordene "ShiftPay" med "Acme" og fortsatt få en fungerende side? Hvis ja — copy-en er generisk. Konkrete detaljer (skiftnavn, timelønn-eksempler fra norsk arbeidsliv, "kveldstillegg etter kl. 17"-beregninger) gjør siden umulig å re-bruke for noe annet.

### Prinsipp 7: Farge med motivasjon
Draw from IDE themes (Tokyo Night, Catppuccin, Rose Pine, Solarized, Dracula) eller kulturelle referanser (bauhaus, japansk tegneserie, 70-talls swiss design, teletextversjoner). AI defaulter til "generisk moderne". Gi den en **navngitt estetikk** å forankre i.

---

## 3. Signatursider og hva de gjør annerledes

Disse er referansene indie-designere peker mot i 2025–2026:

### rauno.me
- OS-metafor: desktop-bakgrunn, dock, lyd ved interaksjon.
- Dark mode er ikke shadcn-grå — den har egen palett med varme undertoner.
- Navigasjon bryter helt med "navbar top" — bruker dock-paradigmet.
- **Take**: bryter med card-grid-paradigmet fullstendig.

### linear.app
- Hero har ikke en skjermbilde av produktet — den har en **live, animert command-menu** som viser produktet i bruk.
- 50ms interaksjonstid som designprinsipp nevnes i copyen.
- Typografisk gradient (mørk bakgrunn, lys gradient-tekst som er lesbar, ikke bare dekor).
- **Take**: produktet demonstrerer seg selv i hero i stedet for å skjermbilde seg selv.

### vercel.com
- Geist font (egen font) gir øyeblikkelig merkevaresignatur — ingen annen stor side bruker Geist som primær display.
- Interaktive code-previews i features-seksjoner.
- Skarpe 1px borders mot subtle gradients, ikke myke shadows.
- **Take**: egen font + interaktive demos i stedet for statiske skjermbilder.

### pitch.com
- Fargevalgene er klart ikke "safe" — klare oranger, sterke kontraster.
- Typografi har karakter (Söhne-familien, ikke Inter).
- **Take**: tør å være fargerik i en bransje der alle er blå/lilla.

### joshwcomeau.com
- Alt har en signatur-micro-interaction. Ikoner animerer meningsfullt.
- Partikkel-effekter som føles "lush" uten å være tunge.
- **Take**: detaljene på sm-skala er det som gjør siden signaturfull, ikke hero-effektene.

### anthropic.com
- Serif-heavy (Styrene + Tiempos), bryter med tech-standard sans-everything.
- Cream/off-white bakgrunner i stedet for ren hvit eller ren svart — varmere.
- **Take**: editorial feel i en tech-kontekst.

### paco.me
- Ekstrem typografisk minimalisme kombinert med tung interaktivitet.
- Blog-posts med interaktive demoer bygget inn i prosaen.
- **Take**: innholdet bærer designet, ikke omvendt.

---

## 4. Prompt-strategi for Claude Code (konkrete oppskrifter)

### Teknikk 1: Bygg en "design constitution" først
Før du ber om kode, be Claude skrive en `DESIGN.md`-fil i prosjektet med:

```
## Typography
- Display: Clash Display 600, tracking -0.04em, sizes 64–140px
- Body: Inter Tight 400, line-height 1.6 (NOTE: Tight-varianten, ikke vanlig Inter)
- Mono: JetBrains Mono for all numeric data (shift hours, pay amounts)

## Color system (ShiftPay)
- Background: #0A0B0E (warmer than pure black)
- Surface: #14161B  
- Primary: #FF6B35 (burnt orange — kveld/skift-metafor)
- Accent: #E8E4D9 (cream, not white — handwritten feeling)
- NEVER use: purple gradients, default zinc greys, pure white

## Motion
- One orchestrated page load (60ms stagger on hero elements)
- Button press: 120ms ease-out transform scale(0.97)
- NO scroll-triggered fades on every section
- NO floating animations

## Layout
- Hero: 60/40 split (text left, product demo right bleeds off-canvas)
- Max content width: 1100px (not 1280px, feels less defaulty)
- Asymmetric section padding: py-32 on hero, py-20 on features, py-40 on pricing

## Forbidden
- Heroicons / Lucide (use custom SVGs or Phosphor Bold-weight)
- Gradient text (use solid accent color)
- Glassmorphism / backdrop-blur
- 3D blobs / abstract gradient orbs
- "Build the future of" / "all-in-one" language
```

Referér denne i hver eneste ny prompt: "Follow @DESIGN.md strictly".

### Teknikk 2: Negativ prompting
Anthropics cookbook viser at **eksplisitt å liste hva man IKKE vil ha** er mer effektivt enn bare å be om det man vil ha. LLM-en kjenner igjen default-mønstrene — hvis du navngir dem, unngår den dem.

```
Build the hero section. Constraints:
- DO NOT use centered alignment
- DO NOT use a purple or indigo gradient
- DO NOT use Inter, Roboto, or system-ui fonts
- DO NOT use Heroicons or Lucide
- DO NOT use rounded-xl or rounded-2xl on everything
- DO NOT include a "trusted by" logo row
```

### Teknikk 3: Referer spesifikke sider (ikke sjangre)
Vagt: "moderne SaaS-side" → median output.
Konkret: "follow the typographic rhythm of linear.app, the color warmth of anthropic.com, and the asymmetric hero of pitch.com".

Claude kjenner disse sidene fra treningsdata og vil skifte distribusjon.

### Teknikk 4: Screenshot-iterasjon
Skriv koden, ta screenshot, lim screenshot inn i chatten med: "Here's section X. Point out what looks AI-generated and fix the three worst offenders." Claude er bedre til å **diagnostisere** AI-slop enn til å unngå den initialt.

### Teknikk 5: Navngi estetikken
```
Aesthetic anchor: "Tokyo Night IDE meets Scandinavian editorial".
Primary metaphor: "work schedule printed on warm paper, annotated in pen".
Feel like: the Notion changelog, Linear's settings page, Stripe's docs.
Never feel like: a ShadCN starter template.
```

### Teknikk 6: 400-token aesthetics-prompt (Anthropic sitt eget)
Putt dette som system prompt / øverst i CLAUDE.md i prosjektet:

```
You tend to converge toward generic, "on distribution" outputs. 
In frontend design this produces "AI slop". Avoid this by:

Typography: Distinctive fonts only. No Inter/Roboto/Arial/system.
Color: One dominant color with sharp accents. No evenly-distributed 
palettes. No purple gradients on white.
Motion: One orchestrated page-load. No scattered scroll animations.
Background: Atmosphere through layered gradients or geometric patterns, 
never solid defaults.

State your aesthetic choice EXPLICITLY before coding. 
Vary between light and dark. Make unexpected choices that feel 
designed for THIS context, not reusable for any SaaS.
```

---

## 5. Konkrete moves for ShiftPay-stilen

Basert på konteksten (norsk app, skiftarbeidere, dark mode, single-page):

1. **Font-par: Clash Display + Inter Tight + JetBrains Mono.** Clash er ikke på AI-default-listen. Bruk JetBrains Mono for alle tall (timelønn, skift-timer, overtidssatser) — det gir en "regnestykke"-kvalitet som matcher produktet.

2. **Farge: burnt orange som primær, ikke blå.** Skift = kveldstimer, netter, morgener. Fargen #FF6B35 eller #E86A2A på et bakgrunnsoppsett #0A0B0E (varm svart, ikke #000). Creme accent #E8E4D9 for "handwritten" numerikk.

3. **Hero-layout: asymmetrisk 60/40.** Venstre: headline + sub + CTA. Høyre: en animert "live" skift-kalkulator som viser en faktisk norsk skift-ukes lønnsberegning (konkret: "Mandag kveldsskift 15:00–23:00, sats 230 kr, tillegg 22%"). Skjermbildet skal **demonstrere**, ikke bare vise.

4. **Custom ikoner.** Tegn selv, eller bruk Phosphor Bold i stedet for Lucide. 3–4 egne ikoner som tematisk binder sammen (en urviser-ring, en skift-rotasjon, et lønnslipp-symbol).

5. **Norsk copy med personlighet.** Ikke "Track your shifts effortlessly". I stedet: "Du vet hvor mye du jobber. Vi regner ut hvor mye du faktisk skal ha." Konkret, direkte, norsk. Bruk "kveldstillegg", "ubekvem arbeidstid", "søndagstillegg" — termer en skiftarbeider kjenner igjen.

6. **Ett signaturelement.** Et ur/klokke-element i hero som tikker real-time og skifter farge ved kveld/natt. Eller en overtids-indikator som "glør" når man passerer 37.5 timer. Noe som er umulig for en annen app å stjele uten å endre betydning.

7. **Skjermbilder i ekte device-ramme med spesifikt innhold.** Ikke shotsnapp-default. Bruk iPhone-ramme med **ekte norske skiftdata** (Sykehuspartner, Posten, Vy, et sykehjem i Oslo som fiktiv kontekst) — ikke Apple Reminders-looking mock data.

8. **Pricing uten "Most Popular"-badge.** Den triggerer AI-detect umiddelbart. I stedet: to planer, venstrejustert, med ærlig sammenligningstekst ("For deg som vil ha det enkelt" vs "For deg som vil se mønstrene i året ditt").

9. **Footer som en signatur.** Ikke 5x4-grid av lenker. En kort avsnittsfotnote ("ShiftPay er laget av Stian i Halden, fordi kona jobber skift og Excel-arket mitt var ikke bra nok lenger."). Menneskelig, personlig, usannsynlig å bli AI-generert.

10. **Én orkestrert animasjon ved page-load.** Hero headline fade-in 0ms, sub 80ms, CTA 160ms, kalkulatoren reveal 240ms med et lite "beregning pågår"-telleverk. Ingenting annet animerer på scroll. Resten av siden er statisk.

---

## 6. Verktøy og biblioteker som hjelper

### Fonts
- **Fontshare** (fontshare.com) — Clash Display, Satoshi, Cabinet Grotesk, Bricolage Grotesque. Gratis, ikke på AI-default-listen.
- **Google Fonts nyere kandidater**: Fraunces, Newsreader, Crimson Pro (serif), JetBrains Mono, IBM Plex Mono (numerikk).
- **Geist** (vercel.com/font) — hvis du vil ha Vercel-looking men intensjonelt.

### Animasjon
- **motion.dev** (Motion One) — letter enn Framer Motion, CSS-drevet, mindre "everything animates"-default.
- **GSAP** for hvis du trenger en hovedanimasjon (scrollTrigger for én hero-reveal, ikke spredt overalt).
- **CSS @starting-style + view-transitions** for native page-transitions i 2026-browsers.

### Custom illustrasjoner / ikoner
- **Phosphor Icons** (Bold weight) — mindre brukt enn Lucide, har karakter.
- **Figma → export SVG** for egne ikoner. Hånd-tegn 4–5 stk i iPad og vektoriser — tar 2 timer og gir øyeblikkelig signatur.
- **svgrepo.com** for base-ikoner du kan modifisere.

### Device mockups som ikke ser default ut
- **shots.so** — har "realistic" modi med scene-bakgrunn.
- **deviceframes.com** — 3D perspektivramme.
- **Rotato** — native 3D iPhone rotasjonsvideo (tyngre, men signaturfullt for hero).
- **Custom**: bare bruk en 1px border-svart iPhone-SVG og legg skjermbilde inni. Mindre er mer.

### Farge-inspirasjon
- **coolors.co** — generer paletter, men velg "serendipity" modus.
- **IDE-temaer**: Tokyo Night, Rose Pine, Catppuccin, Everforest. Last ned Hex-koder direkte.
- **lospec.com/palette-list** — pixel-art paletter som fungerer overraskende godt på web.

### Referansebibliotek
- **saaspo.com/style/dark-mode** — dark mode SaaS-inspirasjon.
- **mobbin.com** — faktiske screens fra ekte apper.
- **lapa.ninja** — landingsside-database.
- **godly.website** — kuratert "actually good" web design.
- **refero.design** — web design-referanser.

### Lisens-sjekk
Fontshare og Google Fonts er trygge (SIL Open Font License). Pass på at du ikke drar inn private fonter (Söhne, Styrene) som krever lisens.

---

## Gotchas og ting å passe på

- **Dark mode + warm colors = ofte uleselig.** Kontrast-test alltid. Burnt orange på #0A0B0E: sjekk WCAG 4.5:1 for brødtekst.
- **Custom fonter = FOUT-risk.** Bruk `font-display: swap` og preload display-fonten.
- **Motion kan drepe performance på Android-lavbudsjett.** Stian bygger for skiftarbeidere — mange på eldre telefoner. Test på en 3-år-gammel Samsung.
- **LLM-er "reverterer" over tid.** Hvis du bygger seksjonsvis, vil Claude drifte tilbake mot Inter og lilla-gradient hvis du ikke re-referer DESIGN.md hver prompt. Dette er dokumentert.
- **"Custom" illustrasjoner fra Midjourney/DALL-E har også sin egen tell.** Plastikkvalitet, for-glatt, for-symmetrisk. Hvis du MÅ bruke AI-art, post-prosessér med grain/noise/texture-overlay for å bryte den glatte følelsen.
- **Norsk bokmål krever æøå-encoding hele veien.** UTF-8 meta, font som har glyph-støtte for æøå (Clash Display har det, enkelte display-fonter har ikke).

---

## 5-punkts brifing (copy-paste til neste Claude-prompt)

```
Jeg bygger en landingsside for ShiftPay (norsk app for skiftarbeidere). 
Dark mode, single-page. Før du skriver kode:

1. AESTHETIC COMMITMENT: Commit til én spesifikk estetikk før koding. 
   Mitt anchor: "Tokyo Night IDE møter skandinavisk editorial, med 
   burnt-orange accent (#FF6B35) på varm-svart bakgrunn (#0A0B0E)". 
   State valget eksplisitt før du koder.

2. FORBIDDEN DEFAULTS — bruk IKKE: Inter/Roboto/Poppins, lilla-eller-
   indigo-gradienter, Heroicons/Lucide, sentrert hero, 3-kolonners 
   ikon-grid, glassmorphism, rounded-2xl på alt, "Build the future of"
   -copy, floating 3D blobs, shadcn-default grey-skalaer.

3. FONTS: Clash Display (600, tracking -0.04em, 96–140px hero) + 
   Inter Tight (body, 400) + JetBrains Mono (alle tall og numerikk 
   som timer/lønn). Preload Clash fra Fontshare.

4. LAYOUT: Asymmetrisk 60/40 hero (tekst venstre, animert 
   skift-kalkulator høyre som blør off-canvas). Én orkestrert 
   page-load-animasjon med 80ms stagger. Ingen scroll-fades på 
   andre seksjoner. Custom Phosphor Bold-ikoner, ikke Lucide.

5. COPY: Norsk bokmål, direkte tone. Konkrete skift-eksempler 
   ("kveldstillegg 22%", "søndagstillegg", "ubekvem arbeidstid"). 
   Ingen "all-in-one" eller "effortlessly". Copy som ikke kan 
   gjenbrukes for en annen app.

Skriv først en DESIGN.md som oppsummerer disse valgene. 
Ikke begynn å kode før du har vist meg DESIGN.md.
```

---

## Kilder

1. [Anthropic Claude Cookbook — Prompting for Frontend Aesthetics](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics) — Kanonisk referanse, 400-token aesthetics prompt, font anti-patterns.
2. [Paddo.dev — Claude Code Plugins: Breaking the AI Slop Aesthetic](https://paddo.dev/blog/claude-code-plugins-frontend-design/) — "LLMs gravitate toward the median of every Tailwind tutorial" insight.
3. [Monet Design — 5 Strategies to Escape AI Slop](https://www.monet.design/blog/posts/escape-ai-slop-landing-page-design) — Visuelle tells, design-system-first approach.
4. [Raduan.xyz — How to Build Websites with Claude Code That Look Good](https://raduan.xyz/blog/claude-code-for-landing) — DESIGN.md workflow, seksjonsvis iterasjon.
5. [925 Studios — AI Slop Web Design Guide 2026](https://www.925studios.co/blog/ai-slop-web-design-guide) — Detaljert liste over visuelle tells i 2026.
6. [Henri Allevi — Claude Code Prompts to Avoid Generic UX/UI](https://medium.com/@henriallevi/complete-collection-of-claude-code-prompts-to-avoid-generic-ux-ui-design-4565496cd894) — Creative analogy og hyper-specific vision-prompts.
7. [Killer Portfolio — Rauno Freiberg analysis](https://www.killerportfolio.com/by/rauno-freiberg) — OS-metafor, dock, dark mode-paletten.
8. [Saaspo — Dark Mode SaaS Landing Pages](https://saaspo.com/style/dark-mode) — Dark mode referansebibliotek.
9. [Artacitko — Top 20 open-source fonts for SaaS](https://www.artacitko.com/single-post/top-20-open-source-fonts-and-pairings-for-saas-products) — Font pairings inkl. Fraunces/Epilogue, Satoshi, Geist.
10. [Slopless — Stop the SLOP](https://slopless.design/) — Community-drevet anti-AI-slop ressurs.
11. [A2A MCP — Your AI Slop Bores Me](https://a2a-mcp.org/blog/your-ai-slop-bores-me) — 2026-spesifikke tells, "human LARP sites".
12. [UIUX Showcase — 21 Web Design Trends 2026: Design for Humans in AI-First Web](https://uiuxshowcase.com/blog/21-web-design-trends-2026-design-for-humans-ai-first-web/) — Menneskelig signatur som differensiator.

## Videre tråder som kan utforskes

- Hvordan automatisere "AI-slop-detection" som en pre-commit hook (en Claude-skill som scorer siden mot en tell-sjekkliste).
- Dypdykk i Fontshare-fonter for nordisk marked (æøå-støtte-matrise).
- Studie av hvilke farger som faktisk konverterer for norsk arbeidsliv-app (lønn + trygghet = ikke-blå?).
- En galleri-samling av ShiftPay-lignende nisje-apper (arbeidstid, lønn, vakter) for å se hva bransjen defaulter til — og hvordan bevisst bryte med den.
