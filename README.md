# BudgetWise

BudgetWise is a lightweight personal budgeting app designed as a mobile-friendly static web app.

## Features

- per-email local storage
- budget categories and limits
- expense tracking
- monthly savings overview
- pie chart summary
- dark mode
- Excel export support
- installable PWA experience

## GitHub Pages deployment

This project is designed to run as a static website and can be deployed with GitHub Pages for free.

### Steps

1. Push the repository to GitHub.
2. Open the repository in GitHub.
3. Go to Settings > Pages.
4. Select the main branch as the source.
5. Save the settings.
6. GitHub will publish the site at a URL like:

```text
https://<username>.github.io/BudgetWise/
```

## Local usage

You can run the app locally with a simple static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Data storage

The app stores each user's data in the browser localStorage using their email as the key. This keeps data separated per account in the same browser profile and is intended for personal use.

## Notes

- Best for a free, simple personal budgeting tool
- Not a replacement for a cloud database for production multi-device use
- For Play Store publishing or cloud sync, a native app with Firebase or another backend would be required later
