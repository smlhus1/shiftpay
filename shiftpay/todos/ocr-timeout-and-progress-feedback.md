# OCR: heve timeout + bedre fremdriftsfeedback ved trege bilder

## Symptom
Bruker (mamma som beta-tester) får "timeout"-feilmelding når hun OCR'er et foto av Visma MinGat-skjerm. Bildet er glossy laptop-skjerm fotografert i vinkel — lovlig størrelse (~100 KB), men tar lenger enn klient-timeout å analysere.

## Rotårsak
- Klient-timeout: `OCR_TIMEOUT_MS = 30_000` i `shiftpay/lib/api.ts:30`
- Claude Haiku Vision tygger lenger på vanskelige bilder (refleksjon + perspektiv + tabell med smått tekst). 30–60 s er ikke uvanlig.
- Supabase Edge Function har også cold-start på første kall etter idle.
- Appen viser bare "timeout" — brukeren får ikke vite at den fortsatt jobber, og kan ikke gjenoppta uten å starte på nytt.

## Fix (i denne rekkefølgen)

1. **Heve `OCR_TIMEOUT_MS` til 60 000** (60 s)
   - `shiftpay/lib/api.ts:30`
   - Begrunnelse: Claude Vision på komplekse bilder + cold-start.

2. **Fremdrifts-UI** mens forespørselen er ute
   - "OCR jobber fortsatt..." etter 5 s
   - "Tar lenger enn vanlig — bildet ditt er sannsynligvis vanskelig. Prøver fortsatt..." etter 20 s
   - Ingen feilmelding før reell timeout (60 s)

3. **Bedre feilstate ved timeout**
   - Tydelig "Prøv igjen"-knapp som bruker samme bilde
   - Tips ved sviktende OCR: "Ta bildet rett ovenfra uten refleksjon, eller bruk skjermbilde (Win + Shift + S) i stedet."

4. **(Valgfri) Pre-flight warm-up** ved app-start
   - Send en HEAD/OPTIONS til OCR-endepunktet ved første import-skjerm-mount → unngår cold-start på første reelle kall.

## Filer
- `shiftpay/lib/api.ts` — timeout-konstant + retry-/progress-håndtering
- `shiftpay/app/(tabs)/import.tsx` — fremdrifts-UI + feilstate (sjekk faktisk filsti)

## Akseptansekriterier
- [ ] Mamma sitt skjermfoto OCR'es uten timeout (manuell verifikasjon)
- [ ] Progress-tekst vises etter 5 s og 20 s mens forespørselen kjører
- [ ] Hvis 60 s timeout treffer, vises "Prøv igjen"-knapp + tips
- [ ] Eksisterende OCR-tester passerer (`lib/ocr-schema.test.ts`)

## Estimat
- Tradisjonelt: 1.5–2 t
- AI-assistert: 20–30 min

## Kilde / kontekst
- Beta-test 2026-05-11. Tester: Stians mor.
- Diskutert i Discord. Bilde-eksempel: Visma MinGat skift-tabell, foto av laptopskjerm.
- Edge Function svarer fint (OPTIONS 204 / 1.3 s), så det er ikke infrastruktur.
