# ShoeMaster Offline POS

An Electron + React + Vite desktop starter for a footwear store. The core product, stock, customer, supplier and sales data is stored locally in SQLite.

## Requirements
- Node.js 20 or newer (recommended LTS)
- Windows 10/11 for the current packaging target

## Install and run
```powershell
npm install
npm run dev
```

## Build Windows installer
```powershell
npm run dist:win
```
The installer is generated in `release/`.

## Important
- SQLite database is created in Electron's `app.getPath('userData')` directory as `shoemaster.sqlite`.
- Use Store Settings > Create backup to export a database backup to the Desktop.
- USB barcode scanners that act as a keyboard can be used in the POS search field. Scan the barcode and press Enter.
- The current POS supports one payment method per invoice. Split payment UI and persistent payment allocation tables should be added before using split payments in production.
- Purchase order tables and suggested reorder display are included; complete PO line-item receiving is a planned next implementation step.
- WhatsApp Business Cloud API requires an internet-connected server/webhook and Meta credentials. This offline desktop starter displays the integration workflow but does not receive live chats yet.
- Validate tax, receipt printer drivers, backup/restore, refund/exchange accounting and role-based permissions before live retail use.
