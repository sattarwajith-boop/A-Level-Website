/**
 * =======================================================
 *  A/L PAPER HUB - firebase-config.js
 *  SETUP INSTRUCTIONS:
 *  1. Go to https://console.firebase.google.com
 *  2. Create a new project (e.g. "al-paper-hub")
 *  3. Enable Authentication -> Email/Password
 *  4. Create an admin user manually in Authentication
 *  5. Enable Firestore Database (production mode)
 *  6. Enable Firebase Storage
 *  7. Go to Project Settings -> Your Apps -> Add Web App
 *  8. Copy the firebaseConfig object below and replace
 *  9. Create your admin user in Firebase Authentication
 *  10. Deploy Firestore + Storage security rules (see admin panel)
 * =======================================================
 */

export const firebaseConfig = {
  apiKey:            "AIzaSyDBsZdp9ZMbuFgttRX4udrVFmIV0VVnbiM",
  authDomain:        "alevel-21d9c.firebaseapp.com",
  projectId:         "alevel-21d9c",
  storageBucket:     "alevel-21d9c.firebasestorage.app",
  messagingSenderId: "835479382760",
  appId:             "1:835479382760:web:c21519dd59565c23b3b75d",
  measurementId:     "G-H8M49FTXKD"
};

/**
 * Admin access is controlled by Firebase Authentication.
 * Keep public sign-up disabled and create admin users manually in Firebase.
 */
export const ADMIN_EMAILS = {
  includes: () => true
};
