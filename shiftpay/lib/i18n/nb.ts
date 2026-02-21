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
      expectedPay: "Forventet lønn: %{amount}",
      viewSummary: "Se oppsummering",
    },
    week: {
      title: "Ukens vakter",
    },
    schedules: {
      title: "Dine vaktplaner",
    },
    history: {
      title: "Historikk",
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
    description: "Satser per time. Tillegg legges oppå grunnlønnen.",
    labels: {
      base: "Grunnlønn (kr/time)",
      evening: "Kveldstillegg (kr/time)",
      night: "Nattillegg (kr/time)",
      weekend: "Helgetillegg (kr/time)",
      holiday: "Helligdagstillegg (kr/time)",
      overtime: "Overtidstillegg (%)",
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
    currency: {
      title: "Valuta",
    },
    theme: {
      title: "Tema",
      system: "System",
      light: "Lyst",
      dark: "Mørkt",
    },
    about: {
      title: "Om ShiftPay",
      description: "ShiftPay hjelper skiftarbeidere med å sjekke om de har fått riktig lønn. Ta bilde av timelisten, legg inn satsene dine, og sammenlign med lønnsslippen.",
      privacy: "All data lagres lokalt på enheten din. Ingen konto, ingen skylagring, ingen sporing.",
    },
  },
  notifications: {
    title: "Vakt fullført?",
    body: "Fullførte du vakten kl %{time}?",
    channel: "Vaktpåminnelser",
  },
  api: {
    ocrError: "OCR feilet: %{status}",
    ocrTimeout: "OCR tok for lang tid. Prøv igjen eller sjekk tilkoblingen.",
    ocrNotConfigured: "OCR-endepunkt er ikke konfigurert.",
  },
  errorBoundary: {
    title: "Noe gikk galt",
    retry: "Prøv igjen",
  },
  csvErrors: {
    missingDate: "manglende dato",
    missingStart: "manglende starttid",
    missingEnd: "manglende sluttid",
    invalidDate: "Ugyldig dato (bruk DD.MM.YYYY).",
    invalidStart: "Ugyldig starttid (bruk HH:MM).",
    invalidEnd: "Ugyldig sluttid (bruk HH:MM).",
    invalidRow: "Kunne ikke tolke raden.",
    noHeader: "CSV må ha en headerrad og minst én datarad.",
    missingColumns: "CSV må ha kolonner: date, start_time, end_time (og valgfritt shift_type).",
  },
  shiftTypes: {
    tidlig: "Tidlig",
    mellom: "Mellom",
    kveld: "Kveld",
    natt: "Natt",
  },
  confirm: {
    question: "Fullførte du vakten?",
    editQuestion: "Endre status på vakten",
    completed: "Ja, fullført",
    missed: "Nei, ikke fullført",
    overtime: "Overtid",
    overtimeLabel: "Ekstra overtid",
    overtimeHoursLabel: "Timer",
    overtimeMinsLabel: "Minutter",
    overtimeError: {
      title: "Ugyldig verdi",
      message: "Fyll inn timer og/eller minutter (større enn 0).",
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
    editFields: {
      title: "Rediger vakt",
      date: "Dato",
      start: "Starttid",
      end: "Sluttid",
      save: "Lagre endringer",
    },
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
    export: "Eksporter CSV",
    deleteShift: {
      title: "Slett vakt",
      message: "Er du sikker på at du vil slette denne vakten?",
      confirm: "Slett",
      error: "Kunne ikke slette vakten.",
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
      result: "Du bør ha fått: %{amount}",
      disclaimer:
        "Beregningen er veiledende og basert på dine egne satser. Kontroller mot original timeliste.",
      save: "Lagre timeliste",
      saved: "Lagret. Du kan importere en ny.",
      reset: "Start på nytt",
    },
    shiftCard: {
      confirm: "Bekreft",
      confirmA11y: "Bekreft vakt %{date}",
      deleteA11y: "Slett vakt %{date}",
      edit: "Endre",
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
