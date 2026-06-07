/**
 * ═══════════════════════════════════════════════════════
 *  THE DARK ROOM — firebase-config.js
 *  SETUP INSTRUCTIONS:
 *  1. Go to https://console.firebase.google.com
 *  2. Create a new project (e.g. "the-dark-room")
 *  3. Enable Authentication → Email/Password
 *  4. Create an admin user manually in Authentication
 *  5. Enable Firestore Database (production mode)
 *  6. Enable Firebase Storage
 *  7. Go to Project Settings → Your Apps → Add Web App
 *  8. Copy the firebaseConfig object below and replace
 *  9. Add your admin email to ADMIN_EMAILS array
 *  10. Deploy Firestore + Storage security rules (see admin panel)
 * ═══════════════════════════════════════════════════════
 */

export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/**
 * Only emails listed here can access the admin panel.
 * Add your email below. Multiple emails allowed.
 */
export const ADMIN_EMAILS = [
  "admin@yourdomain.com"
];
