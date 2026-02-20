# ShiftPay Privacy Policy

**Effective Date:** February 20, 2026

ShiftPay ("we", "our", or "the app") is a mobile application developed by SMLHUS that helps shift workers verify their pay by importing timesheets, setting tariff rates, and calculating expected earnings. Your privacy is important to us, and this policy explains how the app handles your data.

## 1. Data Storage — Local Only

All personal data you enter into ShiftPay is stored **exclusively on your device** using a local database (SQLite). This includes:

- Your tariff rates and pay supplements
- Imported shift schedules and timesheet data
- Shift confirmation records and overtime entries
- Period summaries and calculated pay

**We do not operate any cloud database, user accounts, or synchronization service.** Your data never leaves your device except in the specific case described in Section 2 below.

## 2. OCR Image Processing

ShiftPay offers an optional feature that lets you take a photo of a paper timesheet and extract shift data automatically.

**How it works:**

1. You take a photo of your timesheet using the in-app camera.
2. The image is sent over an encrypted (HTTPS) connection to a server-side function hosted on Supabase for processing.
3. The function forwards the image to the Anthropic API (Claude), which reads the text and returns structured shift data.
4. The structured data is sent back to your device and stored locally.

**What happens to the image:**

- The image is processed **in memory only** and is **not stored** on any server.
- Neither Supabase nor we retain the image after processing is complete.
- The server-side function is stateless — it has no database and keeps no logs of image content.
- Anthropic's API processes the image to extract text and does not use it for model training. See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for details on their data handling practices.

**You are always in control:** OCR is entirely optional. You can enter shift data manually or import from a CSV file instead.

## 3. Camera Permission

ShiftPay requests camera access **solely** to let you photograph timesheets for OCR processing. The camera is never used for any other purpose. Photos are not saved to your device gallery — they are sent directly to the OCR service and then discarded from app memory.

You can deny camera permission and still use all other features of the app.

## 4. Notification Permission

ShiftPay can send **local notifications** to remind you to confirm whether you completed a shift. These notifications are:

- Generated and scheduled entirely on your device
- Not sent through any external push notification service
- Not used for marketing, advertising, or any other purpose

You can disable notifications at any time through your device's system settings.

## 5. Data We Do NOT Collect

To be explicit, ShiftPay does **not** collect, store, or transmit:

- Names, email addresses, or any personal identifiers
- Location data
- Device identifiers or advertising IDs
- Usage analytics or telemetry
- Crash reports to external services
- Cookies or tracking pixels
- Any data for advertising purposes

There are no third-party analytics, advertising, or tracking SDKs in the app.

## 6. Data Retention and Deletion

Since all data is stored locally on your device, **you have full control** over your data at all times:

- **Delete individual entries:** You can remove specific shifts, schedules, or rate configurations from within the app.
- **Delete all data:** Uninstalling the app removes all stored data from your device.
- **No remote copies:** Because we do not store your data on any server, there is nothing to request deletion of on our end.

## 7. Third-Party Services

ShiftPay uses two third-party services, both exclusively for OCR processing:

| Service | Purpose | Data Sent | Data Retained |
|---------|---------|-----------|---------------|
| **Supabase** (Edge Functions) | Hosts the stateless OCR processing function | Timesheet image (when you use OCR) | None — processed in memory and discarded |
| **Anthropic** (Claude API) | Extracts text from timesheet images | Timesheet image (forwarded by Supabase function) | Not used for training; see [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) |

No other third-party services receive any data from the app.

## 8. Data Security

- All network communication uses HTTPS encryption.
- Images sent for OCR processing are transmitted over encrypted connections.
- Local data is stored in your device's private application storage, which is sandboxed by the Android operating system.

## 9. Children's Privacy

ShiftPay is not directed at children under the age of 13 (or the applicable age in your jurisdiction). We do not knowingly collect data from children. The app is designed for working adults who want to verify their shift-based pay.

## 10. Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the app and on our website with an updated effective date. We encourage you to review this policy periodically.

## 11. Your Rights

Depending on your jurisdiction (including under the EU General Data Protection Regulation), you may have rights regarding your personal data, including the right to access, correct, delete, or port your data. Since ShiftPay stores all data locally on your device, you can exercise these rights directly — your data is already in your hands.

If you have questions about your rights, please contact us.

## 12. Contact Us

If you have any questions or concerns about this privacy policy or ShiftPay's data practices, please contact us at:

**Email:** shiftpay@smlhus.com

---

*This privacy policy applies to the ShiftPay Android application published on Google Play (package: com.smlhus.shiftpay).*
