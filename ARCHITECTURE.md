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
| `js/main.js` | Domain logic (customers, vehicles, invoices, OCR) |
| `supabase-config.js` | Cloud project keys |
| `js/plugins/` | Optional add-ons loaded after main |

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
