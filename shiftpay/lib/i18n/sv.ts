import type { TranslationShape } from "./nb";

const sv: TranslationShape = {
  common: {
    back: "Tillbaka",
    error: "Fel",
    save: "Spara",
    cancel: "Avbryt",
    retry: "Försök igen",
  },
  tabs: {
    overview: "Översikt",
    import: "Importera",
    settings: "Inställningar",
  },
  dashboard: {
    empty: {
      title: "Inga scheman ännu",
      description: "Importera från fliken Importera eller lägg till skift manuellt.",
      cta: "Gå till Importera",
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
      expectedPay: "Förväntad lön: %{amount} kr",
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
    alerts: {
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
    calculate: "Beräkna lön",
    save: "Spara tidlista",
  },
  settings: {
    description: "Timlönetaxor (t.ex. NOK). Används för att beräkna förväntad lön.",
    labels: {
      base: "Grundlön",
      evening: "Kvällstillägg",
      night: "Natttillägg",
      weekend: "Helgtillägg",
      holiday: "Helgdagstillägg",
      overtime: "Övertidstillägg (%)",
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
  },
  confirm: {
    question: "Slutförde du skiftet?",
    editQuestion: "Ändra skiftets status",
    completed: "Ja, slutfört",
    missed: "Nej, inte slutfört",
    overtime: "Övertid",
    overtimeLabel: "Extra övertidsminuter",
    overtimePlaceholder: "0",
    overtimeError: {
      title: "Ogiltigt värde",
      message: "Ange antalet övertidsminuter (större än 0).",
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
      result: "Du borde ha fått: %{amount} kr",
      disclaimer:
        "Beräkningen är vägledande och baseras på dina egna taxor. Kontrollera mot originaltidlistan.",
      save: "Spara tidlista",
      saved: "Sparat. Du kan importera en ny.",
      reset: "Börja om",
    },
    shiftCard: {
      confirm: "Bekräfta",
      confirmA11y: "Bekräfta skift %{date}",
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
