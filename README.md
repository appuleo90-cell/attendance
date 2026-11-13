# Attendance Percentage Counter

A small, dependency-free website for tracking attendance per subject. It shows your overall percentage on a dial, and for every subject it tells you how many classes you can still miss, or how many you must attend in a row to reach your target.

## Features

- Add subjects with classes attended and classes held
- One-tap **Present** and **Absent** buttons, with **Undo** for the last action
- Adjustable target percentage (default 75%) shown as a tick on the dial and on every bar
- "You can miss N more" and "Attend the next N in a row" guidance
- Overall percentage across all subjects
- Data is saved in your browser (`localStorage`), so nothing is uploaded
- Responsive layout, keyboard-friendly, respects reduced-motion settings

## Project structure

```
website/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    └── icons/
        └── favicon.svg
```

The project needs no photos, so there is no `assets/images/` folder. Git does not track empty folders, so add one yourself only if you later need it.

## Run it locally

Open `index.html` in any modern browser. No build step or server is required. An internet connection is only used to load the Google Fonts; the page falls back to system fonts without it.

## How the numbers are calculated

- Percentage = classes attended ÷ classes held × 100
- Classes you can miss = the largest `k` where `attended ÷ (held + k) ≥ target`
- Classes you must attend in a row = the smallest `n` where `(attended + n) ÷ (held + n) ≥ target`

## Host on GitHub Pages

1. Create a new repository on GitHub, for example `attendance-counter`.
2. Upload the **contents** of the `website` folder (`index.html`, `style.css`, `script.js`, `README.md` and the `assets` folder) to the root of the repository. `index.html` must be at the top level, not inside a sub-folder.
   - On GitHub: **Add file → Upload files**, drag everything in, then **Commit changes**.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose the **main** branch and the **/ (root)** folder, then click **Save**.
6. Wait a minute or two. Your site will be live at:
   `https://YOUR-USERNAME.github.io/attendance-counter/`

All file paths in the project are relative, so it works under a repository sub-path like this without changes.

## Customise

- Change the default target: set `target: 75` in the `state` object at the top of `script.js`, and the `value` attributes on the two target inputs in `index.html`.
- Change colours and fonts: edit the variables in the `:root` block at the top of `style.css`.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari.

## License

Free to use for learning and personal projects.
