# BudgetWise

This project starts from a serverless personal budgeting app and adds a production-ready Firebase architecture for:

- per-email user isolation
- secure cloud storage
- Excel export by user
- future Android / Google Play publishing

## Data model

Each user is stored under their email as a document in Firestore:

```text
users/
  user@example.com/
    budgets: [...]
    expenses: [...]
    settings: {...}
```

This keeps every user’s budget data separate and avoids mixing records across accounts.

## Firebase deployment steps

1. Install Firebase CLI
2. Login: `firebase login`
3. Init Firebase in the project root
4. Add `firebaseConfig.js` with your app values
5. Deploy functions and hosting:

```bash
npm install -g firebase-tools
firebase init functions hosting
firebase deploy --only functions,hosting
```

## Excel export flow

The exported sheet is created server-side from the user’s stored Firestore data and saved to Firebase Storage. The function returns a signed URL that the app can use to download the file.

## Notes for Play Store publishing

- Use Firebase Authentication for email login
- Keep the data keyed by email or UID
- For Android publishing, wrap this app in Flutter or Android Studio and package it as a native app
- Use Firestore as the live DB and generate Excel only as a report/export feature

## Current prototype

The browser app in this repo already handles:

- per-email local storage
- budgets
- expenses
- monthly savings
- charting
- Excel export button

The Firebase backend in `functions/index.js` is the next production step for real multi-device and Play Store deployment.
