const nb = {
  common: {
    back: "Tilbake",
    error: "Feil",
    save: "Lagre",
    cancel: "Avbryt",
    retry: "Prøv igjen",
  },
  tabs: {
    overview: "Oversikt",
    import: "Importer",
    settings: "Innstillinger",
  },
  dashboard: {
    empty: {
      title: "Ingen vaktplaner ennå",
      description: "Importer fra Import-fanen eller legg inn skift manuelt.",
      cta: "Gå til Import",
    },
    nextShift: {
      title: "Neste vakt",
      confirm: "Bekreft vakt",
    },
    pending: {
      title: "Venter på bekreftelse",
      more: "+ %{count} til",
      confirmBtn: "Bekreft",
    },
    month: {
      title: "Denne måneden",
      planned: "Planlagt: %{hours} t",
      actual: "Faktisk: %{hours} t",
      expectedPay: "Forventet lønn: %{amount} kr",
      viewSummary: "Se oppsummering",
    },
    week: {
      title: "Ukens vakter",
    },
    schedules: {
      title: "Dine vaktplaner",
    },
    countdown: {
      now: "Nå",
      days: { one: "Om 1 dag", other: "Om %{count} dager" },
      hours: { one: "Om 1 time", other: "Om %{count} timer" },
      minutes: { one: "Om %{count} min", other: "Om %{count} min" },
    },
    error: {
      message: "Kunne ikke laste data",
      retry: "Prøv igjen",
    },
  },
  import: {
    disclaimer:
      "Beregningen er veiledende og basert på dine egne satser. OCR kan inneholde feil — kontroller alltid mot original timeliste.",
    rateZero: "Satser ikke satt opp — beregningen viser 0 kr",
    rateZeroCta: "Gå til satser →",
    cameraBtn: "📷 Ta bilde av timeliste",
    fileBtn: "Velg fra telefonen",
    fileAlert: {
      title: "Velg kilde",
      gallery: "Galleri",
      files: "Filer",
      cancel: "Avbryt",
    },
    moreOptions: "Andre alternativer",
    csvBtn: "Importer CSV-fil",
    manualBtn: "Legg til skift manuelt",
    loading: "Behandler...",
    progress: "Behandler %{current} av %{total} bilder...",
    alerts: {
      missingData: "Manglende data",
      missingDataSave:
        "Fyll inn dato, starttid og sluttid for minst ett skift for å lagre.",
      missingDataCalculate:
        "Fyll inn dato, starttid og sluttid for minst ett skift. Rader merket «må rettes» inkluderes ikke før de er gyldige.",
      csvEmpty:
        "Ingen datarader i CSV. Bruk kolonner: date, start_time, end_time, shift_type.",
      csvError: "Noen rader ble ikke med (manglende eller ugyldig dato/tid). Retting eller fjern rader som må rettes.",
      saveError: "Kunne ikke lagre",
    },
    calculate: "Beregn lønn",
    save: "Lagre timeliste",
  },
  settings: {
    description: "Timelønnsatser (f.eks. NOK). Brukes til å beregne forventet lønn.",
    labels: {
      base: "Grunnlønn",
      evening: "Kveldstillegg",
      night: "Nattillegg",
      weekend: "Helgetillegg",
      holiday: "Helligdagstillegg",
    },
    save: "Lagre",
    saved: "Lagret.",
    language: {
      title: "Språk",
      nb: "🇳🇴 Norsk",
      en: "🇬🇧 English",
      sv: "🇸🇪 Svenska",
      da: "🇩🇰 Dansk",
    },
  },
  confirm: {
    question: "Fullførte du vakten?",
    completed: "Ja, fullført",
    missed: "Nei, ikke fullført",
    overtime: "Overtid",
    overtimeLabel: "Ekstra overtidsminutter",
    overtimePlaceholder: "0",
    overtimeError: {
      title: "Ugyldig verdi",
      message: "Skriv inn antall overtidsminutter (større enn 0).",
    },
    saveOvertime: "Lagre overtid",
    backBtn: "Tilbake",
    alreadyConfirmed: 'Denne vakten er allerede bekreftet som «%{status}».',
    success: "Vakt bekreftet!",
    errors: {
      notFound: "Vakten ble ikke funnet.",
      loadError: "Kunne ikke laste vakten.",
      saveError: "Kunne ikke lagre",
    },
    backBtnLabel: "Tilbake",
  },
  summary: {
    invalid: "Ugyldig måned eller ingen data.",
    expectedPay: {
      title: "Forventet lønn",
      subtitle: "Basert på fullførte vakter og overtid",
    },
    shifts: {
      title: "Vakter",
      planned: "Planlagt: %{count} vakter, %{hours} t",
      completed: "Fullført: %{count}",
      missed: "Ikke møtt: %{count}",
      overtime: "Overtid: %{count}",
      actual: "Faktisk tid: %{hours} t",
      overtimeHours: "Overtid: %{hours} t",
    },
    list: {
      title: "Vakter denne måneden",
      empty: "Ingen vakter registrert.",
    },
    back: "Tilbake",
  },
  period: {
    notFound: "Vaktplanen ble ikke funnet.",
    source: "Kilde: %{source} · Lagt til %{date}",
    viewSummary: "Se månedsoppsummering",
    shifts: {
      title: "Vakter",
      empty: "Ingen vakter i denne perioden.",
    },
    delete: {
      btn: "Slett vaktplan",
      title: "Slett vaktplan",
      message: "Er du sikker på at du vil slette denne vaktplanen? Dette kan ikke angres.",
      cancel: "Avbryt",
      confirm: "Slett",
    },
    errors: {
      deleteError: "Kunne ikke slette",
    },
  },
  components: {
    shiftEditor: {
      header: "Skift (rediger om nødvendig) · %{source}",
      sources: {
        ocr: "OCR",
        csv: "CSV",
        gallery: "Galleri",
        manual: "Manuell",
      },
      errors: {
        check: "Sjekk dato og tid: %{reason}",
      },
      addShift: "+ Legg til nytt skift",
      calculate: "Beregn lønn",
      result: "Du bør ha fått: %{amount} kr",
      disclaimer:
        "Beregningen er veiledende og basert på dine egne satser. Kontroller mot original timeliste.",
      save: "Lagre timeliste",
      saved: "Lagret. Du kan importere en ny.",
      reset: "Start på nytt",
    },
    shiftCard: {
      confirm: "Bekreft",
      confirmA11y: "Bekreft vakt %{date}",
      overtime: "+%{minutes} min overtid",
    },
    camera: {
      instruction: "Hold timelisten innenfor rammen",
      cancel: "Avbryt",
      capture: "Ta bilde",
    },
  },
  format: {
    status: {
      planned: "Planlagt",
      completed: "Fullført",
      missed: "Ikke møtt",
      overtime: "Overtid",
    },
    source: {
      ocr: "OCR",
      gallery: "Galleri",
      csv: "CSV",
      manual: "Manuell",
    },
  },
  months: {
    jan: "Januar",
    feb: "Februar",
    mar: "Mars",
    apr: "April",
    may: "Mai",
    jun: "Juni",
    jul: "Juli",
    aug: "August",
    sep: "September",
    oct: "Oktober",
    nov: "November",
    dec: "Desember",
  },
  onboarding: {
    title: "Sett opp lønnssatsene dine",
    description:
      "For at ShiftPay skal kunne beregne forventet lønn, må du legge inn grunnlønn og tillegg under Innstillinger.",
    cta: "Gå til Innstillinger",
  },
  initError: {
    title: "Kunne ikke starte appen",
    retry: "Prøv igjen",
  },
  screens: {
    periodDetail: "Periodedetaljer",
    confirmShift: "Bekreft vakt",
    monthlySummary: "Månedsoppsummering",
  },
};

export default nb;
export type TranslationShape = typeof nb;
