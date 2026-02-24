import type { TranslationShape } from "./nb";

const da: TranslationShape = {
  common: {
    back: "Tilbage",
    error: "Fejl",
    save: "Gem",
    cancel: "Annuller",
    retry: "Prøv igen",
    loading: "Indlæser...",
  },
  tabs: {
    overview: "Oversigt",
    import: "Importer",
    settings: "Indstillinger",
  },
  dashboard: {
    empty: {
      title: "Klar til at tjekke lønnen?",
      description: "Importer fra fanen Importer eller tilføj vagter manuelt.",
      subtitle: "Tag foto af din timeseddel for at komme i gang",
      cta: "Scan din første timeseddel",
    },
    nextShift: {
      title: "Næste vagt",
      confirm: "Bekræft vagt",
    },
    pending: {
      title: "Afventer bekræftelse",
      more: "+ %{count} mere",
      confirmBtn: "Bekræft",
    },
    month: {
      title: "Denne måned",
      planned: "Planlagt: %{hours} t",
      actual: "Faktisk: %{hours} t",
      expectedPay: "Forventet løn: %{amount}",
      viewSummary: "Se oversigt",
    },
    week: {
      title: "Ugens vagter",
    },
    schedules: {
      title: "Dine vagtplaner",
    },
    history: {
      title: "Historik",
      miniSummary: "%{shifts} vagter · %{pay}",
    },
    countdown: {
      now: "Nu",
      days: { one: "Om 1 dag", other: "Om %{count} dage" },
      hours: { one: "Om 1 time", other: "Om %{count} timer" },
      minutes: { one: "Om %{count} min", other: "Om %{count} min" },
    },
    error: {
      message: "Kunne ikke indlæse data",
      retry: "Prøv igen",
    },
  },
  import: {
    disclaimer:
      "Beregningen er vejledende og baseret på dine egne satser. OCR kan indeholde fejl — kontroller altid mod den originale timeseddel.",
    rateZero: "Satser ikke konfigureret — beregningen viser 0",
    rateZeroCta: "Gå til satser →",
    cameraBtn: "📷 Tag foto af timeseddel",
    fileBtn: "Vælg fra telefonen",
    fileAlert: {
      title: "Vælg kilde",
      gallery: "Galleri",
      files: "Filer",
      cancel: "Annuller",
    },
    moreOptions: "Flere muligheder",
    csvBtn: "Importer CSV-fil",
    manualBtn: "Tilføj vagt manuelt",
    loading: "Behandler...",
    progress: "Behandler %{current} af %{total} billeder...",
    cameraPermissionError: "Kameratilladelse kræves for at tage foto.",
    alerts: {
      ocrFailed: "OCR fejlede",
      missingData: "Manglende data",
      missingDataSave:
        "Udfyld dato, starttid og sluttid for mindst én vagt for at gemme.",
      missingDataCalculate:
        "Udfyld dato, starttid og sluttid for mindst én vagt. Rækker markeret som fejl medtages ikke, før de er rettet.",
      csvEmpty:
        "Ingen datarækker i CSV. Brug kolonnerne: date, start_time, end_time, shift_type.",
      csvError: "Nogle rækker blev sprunget over (manglende eller ugyldig dato/tid). Ret eller fjern fejlrækkerne.",
      saveError: "Kunne ikke gemme",
    },
    saved: {
      title: "Gemt!",
      description: "%{count} vagter gemt for %{start} – %{end}",
      viewSchedule: "Se vagtplan",
      importMore: "Importer flere",
    },
    calculate: "Beregn løn",
    save: "Gem timeseddel",
  },
  settings: {
    description: "Satser per time. Tillæg lægges oven på grundlønnen.",
    labels: {
      base: "Grundløn",
      evening: "Aftentillæg",
      night: "Nattillæg",
      weekend: "Weekendtillæg",
      holiday: "Helligdagstillæg",
      overtime: "Overarbejdstillæg",
    },
    sections: {
      basePay: "Grundløn",
      supplements: "Tillæg pr. time",
      overtime: "Overarbejde",
    },
    save: "Gem",
    saved: "Gemt.",
    language: {
      title: "Sprog",
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
      description: "ShiftPay hjælper vagtarbejdere med at kontrollere, om de har fået den rigtige løn. Tag foto af timesedlen, indtast dine satser og sammenlign med lønsedlen.",
      privacy: "Alle data gemmes lokalt på din enhed. Ingen konti, ingen cloudlagring, ingen sporing.",
    },
  },
  notifications: {
    title: "Vagt afsluttet?",
    body: "Fuldførte du vagten kl %{time}?",
    channel: "Vagtpåmindelser",
  },
  api: {
    ocrError: "OCR fejlede: %{status}",
    ocrTimeout: "OCR tog for lang tid. Prøv igen eller tjek forbindelsen.",
    ocrNotConfigured: "OCR-endpoint er ikke konfigureret.",
  },
  errorBoundary: {
    title: "Noget gik galt",
    retry: "Prøv igen",
  },
  csvErrors: {
    missingDate: "manglende dato",
    missingStart: "manglende starttid",
    missingEnd: "manglende sluttid",
    invalidDate: "Ugyldig dato (brug DD.MM.ÅÅÅÅ).",
    invalidStart: "Ugyldig starttid (brug TT:MM).",
    invalidEnd: "Ugyldig sluttid (brug TT:MM).",
    invalidRow: "Kunne ikke fortolke rækken.",
    noHeader: "CSV skal have en overskriftsrække og mindst én datarække.",
    missingColumns: "CSV skal have kolonnerne: date, start_time, end_time (og eventuelt shift_type).",
  },
  shiftTypes: {
    label: "Vagttype",
    tidlig: "Tidlig",
    mellom: "Midt på dagen",
    kveld: "Aften",
    natt: "Nat",
  },
  confirm: {
    question: "Fuldførte du vagten?",
    editQuestion: "Rediger vagtens status",
    completed: "Ja, fuldført",
    missed: "Nej, ikke fuldført",
    overtime: "Overarbejde",
    overtimeLabel: "Ekstra overarbejde",
    overtimeHoursLabel: "Timer",
    overtimeMinsLabel: "Minutter",
    overtimeError: {
      title: "Ugyldig værdi",
      message: "Angiv timer og/eller minutter (større end 0).",
    },
    saveOvertime: "Gem overarbejde",
    backBtn: "Tilbage",
    alreadyConfirmed: 'Denne vagt er allerede bekræftet som "%{status}".',
    success: "Vagt bekræftet!",
    errors: {
      notFound: "Vagten blev ikke fundet.",
      loadError: "Kunne ikke indlæse vagten.",
      saveError: "Kunne ikke gemme",
    },
    backBtnLabel: "Tilbage",
    editFields: {
      title: "Rediger vagt",
      date: "Dato",
      start: "Starttid",
      end: "Sluttid",
      save: "Gem ændringer",
    },
  },
  summary: {
    invalid: "Ugyldig måned eller ingen data.",
    expectedPay: {
      title: "Forventet løn",
      subtitle: "Baseret på fuldførte vagter og overarbejde",
    },
    shifts: {
      title: "Vagter",
      planned: "Planlagt: %{count} vagter, %{hours} t",
      completed: "Fuldført: %{count}",
      missed: "Ikke mødt: %{count}",
      overtime: "Overarbejde: %{count}",
      actual: "Faktisk tid: %{hours} t",
      overtimeHours: "Overarbejde: %{hours} t",
    },
    list: {
      title: "Vagter denne måned",
      empty: "Ingen vagter registreret.",
    },
    export: "Eksporter CSV",
    deleteShift: {
      title: "Slet vagt",
      message: "Er du sikker på, at du vil slette denne vagt?",
      confirm: "Slet",
      error: "Kunne ikke slette vagten.",
    },
    back: "Tilbage",
  },
  period: {
    notFound: "Vagtplanen blev ikke fundet.",
    source: "Kilde: %{source} · Tilføjet %{date}",
    viewSummary: "Se månedsoversigt",
    shifts: {
      title: "Vagter",
      empty: "Ingen vagter i denne periode.",
    },
    delete: {
      btn: "Slet vagtplan",
      title: "Slet vagtplan",
      message: "Er du sikker på, at du vil slette denne vagtplan? Det kan ikke fortrydes.",
      cancel: "Annuller",
      confirm: "Slet",
    },
    errors: {
      deleteError: "Kunne ikke slette",
    },
  },
  components: {
    shiftEditor: {
      header: "Vagter (rediger om nødvendigt) · %{source}",
      sources: {
        ocr: "OCR",
        csv: "CSV",
        gallery: "Galleri",
        manual: "Manuel",
      },
      errors: {
        check: "Kontroller dato og tid: %{reason}",
      },
      addShift: "+ Tilføj ny vagt",
      calculate: "Beregn løn",
      result: "Du burde have fået: %{amount}",
      disclaimer:
        "Beregningen er vejledende og baseret på dine egne satser. Kontroller mod den originale timeseddel.",
      save: "Gem timeseddel",
      saved: "Gemt. Du kan importere en ny.",
      shiftRow: "vagt",
      reset: "Start forfra",
      saveAndCalculate: "Gem & beregn",
    },
    shiftCard: {
      confirm: "Bekræft",
      confirmA11y: "Bekræft vagt %{date}",
      deleteA11y: "Slet vagt %{date}",
      edit: "Rediger",
      overtime: "+%{minutes} min overarbejde",
    },
    camera: {
      instruction: "Hold timesedlen inden for rammen",
      cancel: "Annuller",
      capture: "Tag foto",
    },
  },
  format: {
    status: {
      planned: "Planlagt",
      completed: "Fuldført",
      missed: "Ikke mødt",
      overtime: "Overarbejde",
    },
    source: {
      ocr: "OCR",
      gallery: "Galleri",
      csv: "CSV",
      manual: "Manuel",
    },
  },
  months: {
    jan: "Januar",
    feb: "Februar",
    mar: "Marts",
    apr: "April",
    may: "Maj",
    jun: "Juni",
    jul: "Juli",
    aug: "August",
    sep: "September",
    oct: "Oktober",
    nov: "November",
    dec: "December",
  },
  onboarding: {
    title: "Opsæt dine lønsatser",
    description:
      "For at ShiftPay kan beregne din forventede løn, skal du indtaste grundløn og tillæg under Indstillinger.",
    cta: "Gå til Indstillinger",
  },
  initError: {
    title: "Kunne ikke starte appen",
    retry: "Prøv igen",
  },
  screens: {
    periodDetail: "Periodedetaljer",
    confirmShift: "Bekræft vagt",
    monthlySummary: "Månedsoversigt",
  },
};

export default da;
