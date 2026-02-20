import type { TranslationShape } from "./nb";

const da: TranslationShape = {
  common: {
    back: "Tilbage",
    error: "Fejl",
    save: "Gem",
    cancel: "Annuller",
    retry: "Prøv igen",
  },
  tabs: {
    overview: "Oversigt",
    import: "Importer",
    settings: "Indstillinger",
  },
  dashboard: {
    empty: {
      title: "Ingen vagtplaner endnu",
      description: "Importer fra fanen Importer eller tilføj vagter manuelt.",
      cta: "Gå til Importer",
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
      expectedPay: "Forventet løn: %{amount} kr",
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
    alerts: {
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
    calculate: "Beregn løn",
    save: "Gem timeseddel",
  },
  settings: {
    description: "Timelønsatser (f.eks. NOK). Bruges til at beregne forventet løn.",
    labels: {
      base: "Grundløn",
      evening: "Aftentillæg",
      night: "Nattillæg",
      weekend: "Weekendtillæg",
      holiday: "Helligdagstillæg",
      overtime: "Overarbejdstillæg (%)",
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
  },
  confirm: {
    question: "Fuldførte du vagten?",
    editQuestion: "Rediger vagtens status",
    completed: "Ja, fuldført",
    missed: "Nej, ikke fuldført",
    overtime: "Overarbejde",
    overtimeLabel: "Ekstra overarbejdsminutter",
    overtimePlaceholder: "0",
    overtimeError: {
      title: "Ugyldig værdi",
      message: "Angiv antallet af overarbejdsminutter (større end 0).",
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
      result: "Du burde have fået: %{amount} kr",
      disclaimer:
        "Beregningen er vejledende og baseret på dine egne satser. Kontroller mod den originale timeseddel.",
      save: "Gem timeseddel",
      saved: "Gemt. Du kan importere en ny.",
      reset: "Start forfra",
    },
    shiftCard: {
      confirm: "Bekræft",
      confirmA11y: "Bekræft vagt %{date}",
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
