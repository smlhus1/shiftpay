# Fase 2: Clustering & Scoring

> 55 raw problems -> deduplicated to ~35 unique -> scored to Top 8

## Scoring Criteria

| Kriterie | Vekt | Skala |
|----------|------|-------|
| Smerte-intensitet | 20% | 1-10: Hvor vondt gjor det? |
| Frekvens | 15% | 1-10: Daglig=10, Ukentlig=7, Manedlig=4, Arlig=1 |
| Losnings-gap | 20% | 1-10: Ingenting=10, Darlige losninger=7, Okse losninger=4, Gode losninger=1 |
| 5-dagers byggbarhet | 15% | 1-10: Enkel MVP=10, Moderat=6, Vanskelig=3, Umulig=1 |
| Traction-potensial | 15% | 1-10: Ferdig community=10, Identifiserbar gruppe=7, Bred/udefinerbar=3 |
| Visuelt/emosjonelt potensial | 15% | 1-10: Wow-faktor + folelsesmessig impact for dommere |

---

## Cluster Overview (Deduplicated)

### Cluster A: AI & Modern Work (7 problems)
- A1: AI Work Intensification Tracker
- A2: AI Content Flooding / "AI Slop" Detector
- A3: FOBO - AI Obsolescence Risk Score
- A4: AI Tool Fatigue / Decision Aid
- A5: Digital Presenteeism
- A6: Meeting Action Item Accountability
- A7: Notification Overload / Smart Triage

### Cluster B: Freelancer/Tradesperson (4 problems)
- B1: Multi-Income Freelancer Finance Dashboard
- B2: Freelance Time Tracking Across Clients
- B3: Contractor Quote & Estimate Generator
- B4: Solo Tradesperson Admin (Norwegian twist)

### Cluster C: Community & Connection (4 problems)
- C1: Adult Friendship / Social Connection Platform
- C2: Third Place Disappearance / Community Finder
- C3: Skill Exchange / Barter Platform
- C4: Personal CRM / Relationship Manager

### Cluster D: Caregiving (2 problems, merged)
- D1: Family Caregiver Coordination Hub (includes medication tracking)

### Cluster E: Norwegian Civic/Associations (4 problems, merged)
- E1: Small Club All-in-One (forening + FAU + dugnad + treasurer)
- E2: Borettslag/Sameie Communication

### Cluster F: Underserved Demographics Norway (3 problems)
- F1: Elderly Digital Exclusion / Family Tech Support
- F2: Immigrant Settlement Navigator (bureaucracy + healthcare)
- F3: Student Housing Alert + Finance

### Cluster G: Home/Property (4 problems)
- G1: Small Landlord Property Management
- G2: Home Maintenance Scheduling
- G3: Household Chore Fairness Tracker
- G4: Glassdoor for Landlords/Rental Properties

### Cluster H: Specific Verticals (7 problems)
- H1: ADHD-Friendly Productivity System
- H2: Nursing Documentation Burden
- H3: Teacher Tech Overload
- H4: Makeup/Cosmetic Reaction Tracker
- H5: Creator Economy Dashboard
- H6: Climate Anxiety-to-Action
- H7: Weather-Dependent Trade Scheduler

---

## Full Scoring (Top 20 Candidates)

| # | Problem | Smerte (20%) | Frekvens (15%) | Gap (20%) | Byggbar (15%) | Traction (15%) | Visuelt (15%) | TOTAL |
|---|---------|-------------|----------------|-----------|---------------|----------------|---------------|-------|
| 1 | AI Work Intensification Tracker | 9 | 10 | 10 | 8 | 7 | 8 | **8.75** |
| 2 | Family Caregiver Coordination | 9 | 10 | 8 | 7 | 8 | 9 | **8.55** |
| 3 | FOBO / AI Obsolescence Score | 8 | 8 | 9 | 9 | 8 | 8 | **8.40** |
| 4 | AI Slop Detector / Human Finder | 8 | 10 | 9 | 6 | 6 | 9 | **8.05** |
| 5 | Immigrant Settlement Navigator | 8 | 7 | 9 | 8 | 7 | 8 | **7.95** |
| 6 | Makeup/Cosmetic Reaction Tracker | 7 | 7 | 9 | 9 | 7 | 7 | **7.70** |
| 7 | Contractor Quote Generator | 9 | 10 | 7 | 9 | 6 | 5 | **7.55** |
| 8 | Small Club All-in-One (Norway) | 8 | 7 | 7 | 6 | 8 | 7 | **7.25** |
| 9 | Third Place / Community Finder | 8 | 8 | 8 | 6 | 6 | 8 | **7.40** |
| 10 | Meeting Action Item Tracker | 8 | 10 | 6 | 8 | 7 | 5 | **7.15** |
| 11 | ADHD Productivity System | 9 | 10 | 7 | 5 | 8 | 7 | **7.55** |
| 12 | Household Chore Fairness | 7 | 10 | 7 | 9 | 6 | 6 | **7.30** |
| 13 | Student Housing Alert (Norway) | 8 | 5 | 7 | 8 | 7 | 6 | **6.95** |
| 14 | Weather-Dependent Trade Scheduler | 6 | 8 | 9 | 8 | 5 | 7 | **7.15** |
| 15 | Freelancer Income Dashboard | 9 | 10 | 6 | 6 | 7 | 5 | **7.05** |
| 16 | Home Maintenance Scheduler | 7 | 5 | 7 | 9 | 6 | 5 | **6.55** |
| 17 | Glassdoor for Landlords | 8 | 3 | 9 | 7 | 6 | 6 | **6.80** |
| 18 | Elderly Digital Exclusion | 8 | 8 | 7 | 4 | 5 | 7 | **6.65** |
| 19 | Climate Anxiety-to-Action | 6 | 5 | 6 | 6 | 7 | 8 | **6.35** |
| 20 | Food Waste Marketplace | 7 | 8 | 5 | 5 | 6 | 8 | **6.40** |

### Scoring Calculation:
Total = (Smerte * 0.20) + (Frekvens * 0.15) + (Gap * 0.20) + (Byggbar * 0.15) + (Traction * 0.15) + (Visuelt * 0.15)

---

## TOP 8 - Rangert med begrunnelse

### #1: AI Work Intensification Tracker (Score: 8.75)
**Problemet:** AI-verktoy gjor ikke jobben enklere -- de intensifiserer den. Folk tar pa seg mer, jobber lenger, og brenner ut raskere. HBR-artikkel fra 9. feb 2026 bekrefter dette.
**Hvorfor top:** Brand new problem (4 dager gammel!), enormt gap (INGEN losninger), daglig smerte, byggbar som Chrome-extension + dashboard, og tidsaktuelt for dommere.
**Risiko:** Kan oppfattes som "enda et AI-verktoy." Posisjonering er kritisk.

### #2: Family Caregiver Coordination Hub (Score: 8.55)
**Problemet:** Nar en forelder blir syk, kollapser familien inn i kaos -- hvem besekte, hvilke medisiner ble gitt, hva sa legen? Alt skjer over WhatsApp og sticky notes.
**Hvorfor top:** Universell emosjonell resonans, 800,000 parorende i Norge, daglig bruk, og du kan demo det med en "day in the life"-historie som rorer dommerne.
**Risiko:** Medisinsk naerhet (liability). Framing som "familiekommunikasjon" ikke "medisinsk verktoy."

### #3: FOBO / AI-Proof Career Planner (Score: 8.40)
**Problemet:** 52% av arbeidstakere frykter a bli overflodige pga AI. Ingen verktoy hjelper dem vurdere reell risiko eller lage en plan.
**Hvorfor top:** Fun a demo (ta en quiz, fa en score), massiv malgruppe, bygges som quiz + scoring + handlingsplan. Viral potensial.
**Risiko:** Score-algoritmen kan virke overfladisk. Trenger solid data bak.

### #4: AI Slop Detector / Human Content Finder (Score: 8.05)
**Problemet:** 74% av nye nettsider er AI-generert. Folk kan ikke skille ekte fra falskt. "AI slop" var Merriam-Websters ord i 2025.
**Hvorfor top:** Visuelt og demo-bart (browser extension som highlighter AI vs human content). Rider pa en massiv trend. Wow-faktor.
**Risiko:** Teknisk krevende a faktisk detektere AI-innhold palitelig pa 5 dager.

### #5: Immigrant Settlement Navigator (Score: 7.95)
**Problemet:** Nyankomne til Norge ma navigere UDI, NAV, kommune, BankID, fastlege, Lanekassen -- alt samtidig, pa et sprak de ikke kan.
**Hvorfor top:** Sterkt emosjonelt, underserved gruppe, clear value prop, bygges som interaktiv sjekkliste.
**Risiko:** Sprakbarriere i demo. Begrenset marked. Krever oppdatert byrakrati-data.

### #6: Makeup/Cosmetic Reaction Tracker (Score: 7.70)
**Problemet:** 30M+ med kosmetiske allergier har ingen systematisk mate a spore hvilke produkter/ingredienser som gir reaksjoner. Smertefull trial-and-error.
**Hvorfor top:** Spesifikt, unik, og lett a bygge (logg produkt + reaksjon, finn monstre over tid). Validert av BigIdeasDB som "easiest to build as solo founder."
**Risiko:** Nisjemessig. Trenger nok data for monstergjenkjenning a gi verdi.

### #7: Contractor Quote Generator (Score: 7.55)
**Problemet:** Handverkere kaster bort timer pa a lage tilbud. Bruker Word-dokumenter eller papir. Sender feil tilbud til feil kunde.
**Hvorfor top:** Sky-hoy smerte, daglig frekvens, enkel MVP (skjema -> PDF), og klar verdiproporsjon.
**Risiko:** Ikke visuelt spennende for dommere. "Invoice-app" er ikke sexy.

### #8: Small Club All-in-One (Score: 7.25)
**Problemet:** 50,000+ norske foreninger bruker Excel, Vipps uten sporing, Facebook-grupper, og Word-dokumenter. Kasserer kvitter = all kunnskap forsvinner.
**Hvorfor top:** Enorm norsk relevans, alle kjenner problemet, og kan vise "before/after" tydelig.
**Risiko:** Scope creep -- "all-in-one" er ambisiost for 5 dager. Ma velge 2-3 features.

---

## Honorable Mentions (Sterke men utenfor top 8)

- **ADHD Productivity System** (7.55): Hoy smerte og stort community, men krever dyp UX-research
- **Third Place / Community Finder** (7.40): Emosjonelt, men trenger lokale data som er vanskelig a skaffe
- **Household Chore Fairness** (7.30): Morsomt konsept, men kanskje for "trivielt" for dommere
- **Weather-Dependent Trade Scheduler** (7.15): Novel, men smal malgruppe

---

## Cross-Cutting Observations

1. **AI-relaterte problemer dominerer toppen** -- de er ferske, uloste, og tidsaktuelt. Men risikoen er "enda et AI-verktoy."
2. **Emosjonell resonans matters** -- Caregiver og Immigrant-problemene scorer hoyt pa "visuelt/emosjonelt" selv om de er vanskeligere a bygge.
3. **Norge-spesifikke problemer** har begrenset marked men hoy relevans for dommerne (som sannsynligvis er norske).
4. **"Enklest a bygge" != "best for hackathon"** -- Contractor Quote er enklest men minst imponerende.
5. **Det ideelle problemet** kombinerer: fersk trend + emosjonell resonans + tydelig gap + wow-faktor demo.
