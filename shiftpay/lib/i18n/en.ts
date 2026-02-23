import type { TranslationShape } from "./nb";

const en: TranslationShape = {
  common: {
    back: "Back",
    error: "Error",
    save: "Save",
    cancel: "Cancel",
    retry: "Try again",
    loading: "Loading...",
  },
  tabs: {
    overview: "Overview",
    import: "Import",
    settings: "Settings",
  },
  dashboard: {
    empty: {
      title: "Ready to check your pay?",
      description: "Import from the Import tab or add shifts manually.",
      subtitle: "Take a photo of your timesheet to get started",
      cta: "Scan your first timesheet",
    },
    nextShift: {
      title: "Next shift",
      confirm: "Confirm shift",
    },
    pending: {
      title: "Pending confirmation",
      more: "+ %{count} more",
      confirmBtn: "Confirm",
    },
    month: {
      title: "This month",
      planned: "Planned: %{hours} h",
      actual: "Actual: %{hours} h",
      expectedPay: "Expected pay: %{amount}",
      viewSummary: "View summary",
    },
    week: {
      title: "This week's shifts",
    },
    schedules: {
      title: "Your schedules",
    },
    history: {
      title: "History",
      miniSummary: "%{shifts} shifts · %{pay}",
    },
    countdown: {
      now: "Now",
      days: { one: "In 1 day", other: "In %{count} days" },
      hours: { one: "In 1 hour", other: "In %{count} hours" },
      minutes: { one: "In %{count} min", other: "In %{count} min" },
    },
    error: {
      message: "Could not load data",
      retry: "Try again",
    },
  },
  import: {
    disclaimer:
      "This calculation is indicative and based on your own rates. OCR may contain errors — always verify against the original timesheet.",
    rateZero: "Rates not set up — calculation shows 0",
    rateZeroCta: "Go to rates →",
    cameraBtn: "📷 Take photo of timesheet",
    fileBtn: "Choose from phone",
    fileAlert: {
      title: "Choose source",
      gallery: "Gallery",
      files: "Files",
      cancel: "Cancel",
    },
    moreOptions: "More options",
    csvBtn: "Import CSV file",
    manualBtn: "Add shift manually",
    loading: "Processing...",
    progress: "Processing %{current} of %{total} images...",
    alerts: {
      missingData: "Missing data",
      missingDataSave:
        "Enter date, start time and end time for at least one shift to save.",
      missingDataCalculate:
        "Enter date, start time and end time for at least one shift. Rows marked as errors are not included until corrected.",
      csvEmpty:
        "No data rows in CSV. Use columns: date, start_time, end_time, shift_type.",
      csvError: "Some rows were skipped (missing or invalid date/time). Fix or remove the error rows.",
      saveError: "Could not save",
    },
    saved: {
      title: "Saved!",
      description: "%{count} shifts saved for %{start} – %{end}",
      viewSchedule: "View schedule",
      importMore: "Import more",
    },
    calculate: "Calculate pay",
    save: "Save timesheet",
  },
  settings: {
    description: "Per-hour rates. Supplements are added on top of base rate.",
    labels: {
      base: "Base rate",
      evening: "Evening supplement",
      night: "Night supplement",
      weekend: "Weekend supplement",
      holiday: "Holiday supplement",
      overtime: "Overtime supplement",
    },
    sections: {
      basePay: "Base pay",
      supplements: "Supplements per hour",
      overtime: "Overtime",
    },
    save: "Save",
    saved: "Saved.",
    language: {
      title: "Language",
      nb: "🇳🇴 Norsk",
      en: "🇬🇧 English",
      sv: "🇸🇪 Svenska",
      da: "🇩🇰 Dansk",
    },
    currency: {
      title: "Currency",
    },
    theme: {
      title: "Theme",
      system: "System",
      light: "Light",
      dark: "Dark",
    },
    about: {
      title: "About ShiftPay",
      description: "ShiftPay helps shift workers check if they've been paid correctly. Take a photo of your timesheet, enter your rates, and compare with your payslip.",
      privacy: "All data is stored locally on your device. No accounts, no cloud storage, no tracking.",
    },
  },
  notifications: {
    title: "Shift completed?",
    body: "Did you complete the shift at %{time}?",
    channel: "Shift reminders",
  },
  api: {
    ocrError: "OCR failed: %{status}",
    ocrTimeout: "OCR took too long. Try again or check your connection.",
    ocrNotConfigured: "OCR endpoint is not configured.",
  },
  errorBoundary: {
    title: "Something went wrong",
    retry: "Try again",
  },
  csvErrors: {
    missingDate: "missing date",
    missingStart: "missing start time",
    missingEnd: "missing end time",
    invalidDate: "Invalid date (use DD.MM.YYYY).",
    invalidStart: "Invalid start time (use HH:MM).",
    invalidEnd: "Invalid end time (use HH:MM).",
    invalidRow: "Could not parse the row.",
    noHeader: "CSV must have a header row and at least one data row.",
    missingColumns: "CSV must have columns: date, start_time, end_time (and optionally shift_type).",
  },
  shiftTypes: {
    label: "Shift type",
    tidlig: "Early",
    mellom: "Mid-day",
    kveld: "Evening",
    natt: "Night",
  },
  confirm: {
    question: "Did you complete the shift?",
    editQuestion: "Change shift status",
    completed: "Yes, completed",
    missed: "No, not completed",
    overtime: "Overtime",
    overtimeLabel: "Extra overtime",
    overtimeHoursLabel: "Hours",
    overtimeMinsLabel: "Minutes",
    overtimeError: {
      title: "Invalid value",
      message: "Enter hours and/or minutes (greater than 0).",
    },
    saveOvertime: "Save overtime",
    backBtn: "Back",
    alreadyConfirmed: 'This shift has already been confirmed as "%{status}".',
    success: "Shift confirmed!",
    errors: {
      notFound: "Shift not found.",
      loadError: "Could not load shift.",
      saveError: "Could not save",
    },
    backBtnLabel: "Back",
    editFields: {
      title: "Edit shift",
      date: "Date",
      start: "Start time",
      end: "End time",
      save: "Save changes",
    },
  },
  summary: {
    invalid: "Invalid month or no data.",
    expectedPay: {
      title: "Expected pay",
      subtitle: "Based on completed shifts and overtime",
    },
    shifts: {
      title: "Shifts",
      planned: "Planned: %{count} shifts, %{hours} h",
      completed: "Completed: %{count}",
      missed: "Missed: %{count}",
      overtime: "Overtime: %{count}",
      actual: "Actual time: %{hours} h",
      overtimeHours: "Overtime: %{hours} h",
    },
    list: {
      title: "Shifts this month",
      empty: "No shifts recorded.",
    },
    export: "Export CSV",
    deleteShift: {
      title: "Delete shift",
      message: "Are you sure you want to delete this shift?",
      confirm: "Delete",
      error: "Could not delete the shift.",
    },
    back: "Back",
  },
  period: {
    notFound: "Schedule not found.",
    source: "Source: %{source} · Added %{date}",
    viewSummary: "View monthly summary",
    shifts: {
      title: "Shifts",
      empty: "No shifts in this period.",
    },
    delete: {
      btn: "Delete schedule",
      title: "Delete schedule",
      message: "Are you sure you want to delete this schedule? This cannot be undone.",
      cancel: "Cancel",
      confirm: "Delete",
    },
    errors: {
      deleteError: "Could not delete",
    },
  },
  components: {
    shiftEditor: {
      header: "Shifts (edit if needed) · %{source}",
      sources: {
        ocr: "OCR",
        csv: "CSV",
        gallery: "Gallery",
        manual: "Manual",
      },
      errors: {
        check: "Check date and time: %{reason}",
      },
      addShift: "+ Add new shift",
      calculate: "Calculate pay",
      result: "You should have received: %{amount}",
      disclaimer:
        "This calculation is indicative and based on your own rates. Verify against original timesheet.",
      save: "Save timesheet",
      saved: "Saved. You can import a new one.",
      shiftRow: "shift",
      reset: "Start over",
      saveAndCalculate: "Save & calculate",
    },
    shiftCard: {
      confirm: "Confirm",
      confirmA11y: "Confirm shift %{date}",
      deleteA11y: "Delete shift %{date}",
      edit: "Edit",
      overtime: "+%{minutes} min overtime",
    },
    camera: {
      instruction: "Keep the timesheet within the frame",
      cancel: "Cancel",
      capture: "Take photo",
    },
  },
  format: {
    status: {
      planned: "Planned",
      completed: "Completed",
      missed: "Missed",
      overtime: "Overtime",
    },
    source: {
      ocr: "OCR",
      gallery: "Gallery",
      csv: "CSV",
      manual: "Manual",
    },
  },
  months: {
    jan: "January",
    feb: "February",
    mar: "March",
    apr: "April",
    may: "May",
    jun: "June",
    jul: "July",
    aug: "August",
    sep: "September",
    oct: "October",
    nov: "November",
    dec: "December",
  },
  onboarding: {
    title: "Set up your pay rates",
    description:
      "For ShiftPay to calculate your expected pay, you need to enter your base rate and supplements under Settings.",
    cta: "Go to Settings",
  },
  initError: {
    title: "Could not start the app",
    retry: "Try again",
  },
  screens: {
    periodDetail: "Period details",
    confirmShift: "Confirm shift",
    monthlySummary: "Monthly summary",
  },
};

export default en;
