# BayMeister architecture

Version: 1.3.0

The UI is a static PWA (GitHub Pages). Logic is split so a new workshop feature
does not require editing a 3000-line HTML file.

## Files

| Path | Role |
|---|---|
| `index.html` | Shell only |
| `css/app.css` | Theme and layout |
| `js/config.js` | Version, feature flags, `WP.registerPage` / `WP.hook` |
| `i18n.js` | UI language packs |
| `js/engine.js` | Status, validate, migrate |
| `js/core.js` | Storage, session, OpenAI vault |
| `js/ocr.js` | Fahrzeugschein parse + read |
| `js/scan.js` | Fill customer form from OCR |
| `js/lookup.js` | HSN/TSN / VIN lookup |
| `js/invoice-print.js` | German invoice HTML |
| `js/print.js` | Print / PDF / e-mail / WhatsApp |
| `js/camera.js` | Camera + WhatsApp ingest |
| `js/customers.js` | Customers, vehicles, Schein bind |
| `js/repairs.js` | Jobs and Schein-to-repair |
| `js/invoice-edit.js` | Invoice designer |
| `js/quality.js` | Legal field checklist |
| `js/app.js` | Shell, dashboard, remaining screens |
| `supabase-config.js` | Cloud project keys |
| `js/plugins/` | Optional add-ons |

## Extension points

```js
// Replace or add a screen
WP.registerPage('reports', function(){ /* render into #content */ });

// Run after login / render
WP.hook('afterLogin', function(session){ console.log(session.company.id); });
WP.hook('afterRender', function(session){ /* badge, telemetry */ });

// Turn a module off
WP.features.ocr = false;
```

## Data rules

- Every business row has `companyId`.
- `companyRows(name)` is the only list the UI should read.
- Legal invoice fields live in `session.company.profile`, not in global settings.
- Invoice print language follows the company country (DE → German).

## Adding a workshop module

1. Create `js/plugins/my-module.js`.
2. Register a page or hook.
3. Include the script in `index.html` after `js/main.js`.
4. Keep writes behind `save()` and `companyId`.
