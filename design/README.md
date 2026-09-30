# Design handoff

Exported files from the CEOMaker project in Claude Design (claude.ai/design), kept as the
reference the app is built from. Upload the whole exported folder here, keeping its structure:

```
design/
  CEOMaker Start.dc.html
  support.js
  _ds/industry-0b546125-b657-4ed2-b39f-846f38c86be4/
    _ds_bundle.js
    styles.css
  ...any other files from the export
```

These files are reference material, not app code: formatting and lint checks skip this folder.
When the design changes, re-export and replace the files here so the repo always matches the
latest version.
