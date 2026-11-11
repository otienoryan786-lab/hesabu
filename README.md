# Hesabu

The daily record that owner and driver both agree on.

Boda, matatu and delivery owners hand vehicles to drivers who remit a daily target (the *hesabu*). Today that money is tracked in notebooks and M-Pesa message feeds, which leads to disputes, unverified repair deductions and drivers with no proof of honest work. Hesabu gives both sides one shared record for every day.

## The loop

1. **Record**: the owner logs what was paid. Pasting the M-Pesa message fills the amount and code, and a code already used is rejected.
2. **Agree**: the driver taps Agree or Dispute, with a note. An agreed day is locked. A disputed day is corrected as a new record, and the old one is kept. M-Pesa codes remain reserved in the history after a correction so they cannot be recorded twice.
3. **Verify deductions**: a driver requests a repair, tyre or fuel deduction with a reason and a receipt photo. It counts toward the hesabu only after the owner approves it.

## Also in this version

- Arrears carried over from earlier days
- Last 30 days per vehicle: cash received, costs paid by the owner, net earned, and a warning when repairs and tyres take 25% or more of earnings
- Remind on WhatsApp for drivers who are short (needs the driver's phone number)
- A welcome page (`index.html`) that opens the app with Demo data or My data
- Records page: each driver's Hesabu Record (agreed days only, with a record code) to share on WhatsApp, plus a weekly statement for the owner to send
- Backup and restore of all data, including when there are no vehicles yet, and a print view
- Receipt photos are checked before saving; unreadable or unprocessable images are reported and not saved as deductions
- Demo data and My data, stored in the browser

## Run it

Open `index.html` (the welcome page) in a browser, or publish the folder with GitHub Pages. No build step.

## How the numbers work

Covered = paid to owner + approved driver-paid deductions. Still owed = hesabu minus covered. Net earned = cash received minus costs the owner paid.

## Roadmap

- Phase 2: automatic M-Pesa matching (Daraja C2B Paybill or Till), a shareable driver link, login, a database and online receipt storage, SMS reminders
- Phase 3: online checking of Hesabu Record codes, Swahili and English, offline install on phones
- Phase 4: weekly owner reports

## Privacy

Data stays in the browser in this version. Do not commit real names or amounts to a public repository.
# hesabu
