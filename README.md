# Hesabu

The daily record that owner and driver both agree on.

Boda, matatu and delivery owners hand vehicles to drivers who remit a daily target (the *hesabu*). Today that money is tracked in notebooks and WhatsApp, which leads to disputes and to drivers with no proof of their honest work. Hesabu gives both sides one shared record for every day.

## The three-step loop

1. **Record**: the owner logs what was paid and any deduction (repair, fuel) with a reason and receipt code.
2. **Agree**: the driver taps Agree or Dispute, with a note.
3. **Lock**: an agreed day cannot be edited. A disputed day is corrected as a new record, and the old one is kept.

## Run it

Open `index.html` in a browser, or publish the folder with GitHub Pages. No build step.

## How the numbers work

Covered = paid to owner + driver-paid deductions. Still owed = hesabu minus covered. Unpaid amounts from earlier days show as arrears.

## Phase 1 (this version)

- Today view with progress, status per vehicle and arrears
- Record, agree and dispute flow, with owner and driver views on one device
- Demo data and My data, stored in the browser (localStorage)

## Roadmap

- Phase 2: a shareable driver link, receipt photos, login and a database
- Phase 3: the Hesabu Record, a verified, shareable summary of a driver's agreed days
- Phase 4: weekly owner reports and per-vehicle net earnings

## Privacy

Data stays in the browser in Phase 1. Do not commit real names or amounts to a public repository.
