import type { TranslationShape } from "./nb";

const sv: TranslationShape = {
  common: {
    back: "Tillbaka",
    error: "Fel",
    save: "Spara",
    cancel: "Avbryt",
    retry: "Försök igen",
    loading: "Laddar...",
  },
  tabs: {
    overview: "Översikt",
    import: "Importera",
    settings: "Inställningar",
  },
  dashboard: {
    empty: {
      title: "Redo att kolla lönen?",
      description: "Importera från fliken Importera eller lägg till skift manuellt.",
      subtitle: "Ta foto av din tidlista för att komma igång",
      cta: "Skanna din första tidlista",
    },
    nextShift: {
      title: "Nästa skift",
      confirm: "Bekräfta skift",
    },
    pending: {
      title: "Väntar på bekräftelse",
      more: "+ %{count} till",
      confirmBtn: "Bekräfta",
    },
    month: {
      title: "Den här månaden",
      planned: "Planerat: %{hours} t",
      actual: "Faktiskt: %{hours} t",
      expectedPay: "Förväntad lön: %{amount}",
      viewSummary: "Visa sammanfattning",
    },
    week: {
      title: "Veckans skift",
    },
    schedules: {
      title: "Dina scheman",
    },
    history: {
      title: "Historik",
      miniSummary: "%{shifts} skift · %{pay}",
    },
    countdown: {
      now: "Nu",
      days: { one: "Om 1 dag", other: "Om %{count} dagar" },
      hours: { one: "Om 1 timme", other: "Om %{count} timmar" },
      minutes: { one: "Om %{count} min", other: "Om %{count} min" },
    },
    error: {
      message: "Kunde inte ladda data",
      retry: "Försök igen",
    },
  },
  import: {
    disclaimer:
      "Beräkningen är vägledande och baseras på dina egna taxor. OCR kan innehålla fel — kontrollera alltid mot originaltidlistan.",
    rateZero: "Taxor ej inställda — beräkningen visar 0",
    rateZeroCta: "Gå till taxor →",
    cameraBtn: "📷 Ta foto av tidlistan",
    fileBtn: "Välj från telefonen",
    fileAlert: {
      title: "Välj källa",
      gallery: "Galleri",
      files: "Filer",
      cancel: "Avbryt",
    },
    moreOptions: "Fler alternativ",
    csvBtn: "Importera CSV-fil",
    manualBtn: "Lägg till skift manuellt",
    loading: "Bearbetar...",
    progress: "Bearbetar %{current} av %{total} bilder...",
    cameraPermissionError: "Kamerabehörighet krävs för att ta foto.",
    alerts: {
      ocrFailed: "OCR misslyckades",
      missingData: "Saknad data",
      missingDataSave:
        "Fyll i datum, starttid och sluttid för minst ett skift för att spara.",
      missingDataCalculate:
        "Fyll i datum, starttid och sluttid för minst ett skift. Rader markerade som fel inkluderas inte förrän de är korrigerade.",
      csvEmpty:
        "Inga datarader i CSV. Använd kolumner: date, start_time, end_time, shift_type.",
      csvError: "Vissa rader hoppades över (saknat eller ogiltigt datum/tid). Rätta eller ta bort felraderna.",
      saveError: "Kunde inte spara",
    },
    saved: {
      title: "Sparat!",
      description: "%{count} skift sparade för %{start} – %{end}",
      viewSchedule: "Visa schema",
      importMore: "Importera fler",
    },
    calculate: "Beräkna lön",
    save: "Spara tidlista",
  },
  settings: {
    description: "Taxor per timme. Tillägg läggs ovanpå grundlönen.",
    labels: {
      base: "Grundlön",
      evening: "Kvällstillägg",
      night: "Natttillägg",
      weekend: "Helgtillägg",
      holiday: "Helgdagstillägg",
      overtime: "Övertidstillägg",
    },
    sections: {
      basePay: "Grundlön",
      supplements: "Tillägg per timme",
      overtime: "Övertid",
    },
    save: "Spara",
    saved: "Sparat.",
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
      light: "Ljust",
      dark: "Mörkt",
    },
    about: {
      title: "Om ShiftPay",
      description: "ShiftPay hjälper skiftarbetare att kontrollera om de fått rätt lön. Ta foto av tidlistan, ange dina taxor och jämför med lönebeskedet.",
      privacy: "All data lagras lokalt på din enhet. Inga konton, ingen molnlagring, ingen spårning.",
    },
  },
  notifications: {
    title: "Skift avslutat?",
    body: "Slutförde du skiftet kl %{time}?",
    channel: "Skiftpåminnelser",
  },
  api: {
    ocrError: "OCR misslyckades: %{status}",
    ocrTimeout: "OCR tog för lång tid. Försök igen eller kontrollera anslutningen.",
    ocrNotConfigured: "OCR-endpoint är inte konfigurerat.",
  },
  errorBoundary: {
    title: "Något gick fel",
    retry: "Försök igen",
  },
  csvErrors: {
    missingDate: "saknat datum",
    missingStart: "saknad starttid",
    missingEnd: "saknad sluttid",
    invalidDate: "Ogiltigt datum (använd DD.MM.ÅÅÅÅ).",
    invalidStart: "Ogiltig starttid (använd HH:MM).",
    invalidEnd: "Ogiltig sluttid (använd HH:MM).",
    invalidRow: "Kunde inte tolka raden.",
    noHeader: "CSV måste ha en rubrikrad och minst en datarad.",
    missingColumns: "CSV måste ha kolumner: date, start_time, end_time (och valfritt shift_type).",
  },
  shiftTypes: {
    label: "Passtyp",
    tidlig: "Tidig",
    mellom: "Mitt på dagen",
    kveld: "Kväll",
    natt: "Natt",
  },
  confirm: {
    question: "Slutförde du skiftet?",
    editQuestion: "Ändra skiftets status",
    completed: "Ja, slutfört",
    missed: "Nej, inte slutfört",
    overtime: "Övertid",
    overtimeLabel: "Extra övertid",
    overtimeHoursLabel: "Timmar",
    overtimeMinsLabel: "Minuter",
    overtimeError: {
      title: "Ogiltigt värde",
      message: "Ange timmar och/eller minuter (större än 0).",
    },
    saveOvertime: "Spara övertid",
    backBtn: "Tillbaka",
    alreadyConfirmed: 'Det här skiftet har redan bekräftats som "%{status}".',
    success: "Skift bekräftat!",
    errors: {
      notFound: "Skiftet hittades inte.",
      loadError: "Kunde inte ladda skiftet.",
      saveError: "Kunde inte spara",
    },
    backBtnLabel: "Tillbaka",
    editFields: {
      title: "Redigera skift",
      date: "Datum",
      start: "Starttid",
      end: "Sluttid",
      save: "Spara ändringar",
    },
  },
  summary: {
    invalid: "Ogiltig månad eller ingen data.",
    expectedPay: {
      title: "Förväntad lön",
      subtitle: "Baserat på slutförda skift och övertid",
    },
    shifts: {
      title: "Skift",
      planned: "Planerat: %{count} skift, %{hours} t",
      completed: "Slutfört: %{count}",
      missed: "Missat: %{count}",
      overtime: "Övertid: %{count}",
      actual: "Faktisk tid: %{hours} t",
      overtimeHours: "Övertid: %{hours} t",
    },
    list: {
      title: "Skift den här månaden",
      empty: "Inga skift registrerade.",
    },
    export: "Exportera CSV",
    deleteShift: {
      title: "Ta bort skift",
      message: "Är du säker på att du vill ta bort det här skiftet?",
      confirm: "Ta bort",
      error: "Kunde inte ta bort skiftet.",
    },
    back: "Tillbaka",
  },
  period: {
    notFound: "Schemat hittades inte.",
    source: "Källa: %{source} · Tillagd %{date}",
    viewSummary: "Visa månadssammanfattning",
    shifts: {
      title: "Skift",
      empty: "Inga skift under den här perioden.",
    },
    delete: {
      btn: "Ta bort schema",
      title: "Ta bort schema",
      message: "Är du säker på att du vill ta bort det här schemat? Det går inte att ångra.",
      cancel: "Avbryt",
      confirm: "Ta bort",
    },
    errors: {
      deleteError: "Kunde inte ta bort",
    },
  },
  components: {
    shiftEditor: {
      header: "Skift (redigera vid behov) · %{source}",
      sources: {
        ocr: "OCR",
        csv: "CSV",
        gallery: "Galleri",
        manual: "Manuell",
      },
      errors: {
        check: "Kontrollera datum och tid: %{reason}",
      },
      addShift: "+ Lägg till nytt skift",
      calculate: "Beräkna lön",
      result: "Du borde ha fått: %{amount}",
      disclaimer:
        "Beräkningen är vägledande och baseras på dina egna taxor. Kontrollera mot originaltidlistan.",
      save: "Spara tidlista",
      saved: "Sparat. Du kan importera en ny.",
      shiftRow: "pass",
      reset: "Börja om",
      saveAndCalculate: "Spara & beräkna",
    },
    shiftCard: {
      confirm: "Bekräfta",
      confirmA11y: "Bekräfta skift %{date}",
      deleteA11y: "Ta bort skift %{date}",
      edit: "Ändra",
      overtime: "+%{minutes} min övertid",
    },
    camera: {
      instruction: "Håll tidlistan inom ramen",
      cancel: "Avbryt",
      capture: "Ta foto",
    },
  },
  format: {
    status: {
      planned: "Planerat",
      completed: "Slutfört",
      missed: "Missat",
      overtime: "Övertid",
    },
    source: {
      ocr: "OCR",
      gallery: "Galleri",
      csv: "CSV",
      manual: "Manuell",
    },
  },
  months: {
    jan: "Januari",
    feb: "Februari",
    mar: "Mars",
    apr: "April",
    may: "Maj",
    jun: "Juni",
    jul: "Juli",
    aug: "Augusti",
    sep: "September",
    oct: "Oktober",
    nov: "November",
    dec: "December",
  },
  onboarding: {
    title: "Ställ in dina lönetaxor",
    description:
      "För att ShiftPay ska kunna beräkna din förväntade lön behöver du ange grundlön och tillägg under Inställningar.",
    cta: "Gå till Inställningar",
  },
  initError: {
    title: "Kunde inte starta appen",
    retry: "Försök igen",
  },
  screens: {
    periodDetail: "Perioddetaljer",
    confirmShift: "Bekräfta skift",
    monthlySummary: "Månadssammanfattning",
  },
};

export default sv;
