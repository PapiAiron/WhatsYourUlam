# Firebase Setup

- Configuration lives in `/firebase-applet-config.json`.
- Security rules live in `/firestore.rules` and are validated with `npm run rules:lint` (`@firebase/eslint-plugin-security-rules`).
- Named Firestore database ID is passed explicitly to `getFirestore(app, firebaseConfig.firestoreDatabaseId)`.
- Bootstrapped admin email: `mcantal22@gmail.com`.
