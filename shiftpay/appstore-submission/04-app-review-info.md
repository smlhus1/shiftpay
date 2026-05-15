# App Review Information

Sted: App Store Connect → 1.1.0 Prepare → App Review Information.

Dette er informasjon Apple-reviewer ser når de tester appen. Målet er at de skal komme seg gjennom hele appens funksjonalitet uten friksjon.

---

## Contact Information

```
First Name:     Stian
Last Name:      Melhus
Phone Number:   +47 [legg inn ditt nummer]
Email:          stian@melhus.com
```

---

## Demo Account

```
☐ Sign-in required (FALSE)
```

ShiftPay har ingen autentisering. Brukeren åpner appen og kommer rett inn. Ingen demo-credentials trengs.

---

## Notes for the App Reviewer

Kopier hele blokka under inn i feltet "Notes":

```
ShiftPay is a verification tool for shift workers. There is no account, no sign-in, and no remote storage. All user data lives locally in the app.

How to test the full flow (estimated 3 minutes):

1. ONBOARDING
   Open the app. You will be prompted to set your base hourly rate. Enter any value (e.g. 250) and tap "Done".

2. TEST OCR (PHOTO IMPORT) — recommended
   On the Import tab, tap "Take photo".
   You can either:
   a) Take a photo of any timesheet image you have, OR
   b) Use a sample timesheet from this URL we have prepared for review:
      https://shiftpay.no/assets/review-timesheet.jpg
      (Download the image to your device's photo library first, then choose "Choose from phone".)
   The image is sent to a stateless Edge Function on Supabase that calls Anthropic's Claude Haiku Vision model. Neither service stores the image. Processing typically completes in 15–45 seconds. Be patient — large or angled photos take longer. A progress indicator updates after 5 and 20 seconds.

3. REVIEW PARSED SHIFTS
   The OCR result is shown in an editable table. Edit any incorrect rows. Tap "Calculate" to see expected pay for the period.

4. MANUAL ENTRY (faster than OCR for review)
   Alternatively: on Import, tap "Add shift manually". Enter date, start/end times, save. Tap "Calculate".

5. CONFIRM A SHIFT
   On the Dashboard, tap any upcoming shift card. Confirm worked / missed / overtime. Monthly summary updates.

6. EXPORT
   Settings → Export → CSV.

7. PRIVACY
   Settings → About → Privacy. Confirms no account and no cloud storage.

NO ACCOUNT IS REQUIRED. NO REMOTE LOGIN.
The app works fully offline except for the OCR photo upload (step 2). All other features work without internet.

ABOUT THE DATA SENT TO ANTHROPIC FOR OCR:
- Only the user-selected photo is sent
- No user identifier, no device ID, no IP-linking
- Image is processed and discarded; not stored
- This is reflected in the App Privacy questionnaire as: User Content → Photos or Videos, Not Linked to User, For App Functionality

ENCRYPTION:
- usesNonExemptEncryption: false
- The app uses only standard HTTPS for the OCR endpoint

KNOWN ISSUE WE'RE TRACKING (not blocking for this review):
- Photo OCR can take up to 60 seconds on hard images (glare, angle, dense tables). We have a progress indicator. We are working on better client-side preprocessing.

Thank you for reviewing.
```

---

## Sign-In / Notarisering / IDFA

Apple stiller standardspørsmål. Svar for ShiftPay:

- **Sign in with Apple required?** No (appen har ingen autentisering)
- **Does your app use Advertising Identifier (IDFA)?** No
- **Does your app use encryption?** Yes (HTTPS for OCR). Eksempelvalg: "Only encryption that is exempt from export compliance regulations" → matcher `usesNonExemptEncryption: false`.

---

## Review-bilde — handlingsplan

Vi har ikke en `review-timesheet.jpg` på shiftpay.no enda. Du må:

1. Lage ett tydelig, godt belyst bilde av en eksempel-timeliste (ikke bruk ekte personopplysninger — lag noe som "Test Tester, uke 19, 5 vakter")
2. Lagre som `review-timesheet.jpg` i `shiftpay-site/assets/`
3. Push og deploy så det er live på `https://shiftpay.no/assets/review-timesheet.jpg`

Alternativt: fjern URL-linja fra review notes og la reviewer ta sitt eget bilde. Apple-reviewere har ofte sin egen test-pipeline med generiske testbilder.
