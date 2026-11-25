# emel

A fully local, offline learning tracker built with React, TypeScript, and Vite.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm run build
npm run preview
```

## Local saving

All progress, checkbox states, topic notes, note blocks, and theme preferences are saved automatically in this browser's LocalStorage under `emel-learning-state-v3`. No database, account, API, or backend is used. No internet connection is needed for core functionality after the app is running from a local build or development server.

## Custom sheets

Use **+ Create Sheet** in the sidebar to create a sheet with a name, optional description, and topics entered one per line. The sheet pencil control provides rename, topic add/edit/delete/reorder, reset, and delete actions. Custom sheets and edits to predefined sheets are stored locally and included in backups.

## Export and restore backups

Open **Settings / Backup**:

- **Export backup** downloads a versioned JSON file containing the complete application data.
- **Import / Restore backup** selects a previously exported JSON file, validates it, and asks for confirmation before replacing the current progress and notes.

Keep exported JSON files somewhere safe. Browser data can be lost if browser storage is cleared or the browser profile is removed.
