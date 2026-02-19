# Testbilder for «Last opp fra galleri»

For å teste OCR med «Mine vakter»-screenshot på emulatoren:

1. **Legg screenshot-PNG-ene her** i denne mappen (de 5 bildene du vil teste med).
2. **Kjør scriptet** som skyver dem til emulatoren slik at de dukker opp i Galleri:

   **PowerShell (fra repo root):**
   ```powershell
   .\shiftpay\scripts\push-test-images-to-emulator.ps1
   ```

   **Eller manuelt med adb:**
   ```bash
   adb push shiftpay/assets/test-schedules/ /sdcard/DCIM/TestSchedules/
   ```

3. **På emulatoren:** Åpne ShiftPay → Import → **Last opp bilde fra galleri**. Velg et av bildene fra DCIM/TestSchedules (eller Galleri).

Når bildene ligger på enheten, fungerer de som alle andre bilder i galleriet.
