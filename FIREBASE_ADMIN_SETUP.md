# A/L Paper Hub Admin Panel Setup

## What is included

This version includes a full Firebase admin panel:

- Hidden admin route: `/admin/`
- Firebase Email/Password admin login
- Admin allow-list in `firebase-config.js`
- Upload resources to Firebase Storage
- Save resource metadata to Firestore
- Edit resources
- Delete resources and files
- Draft / published status
- Dashboard counts
- Broken-link report management
- Announcements
- Subject management
- Site settings
- Firestore and Storage rules inside the admin panel

## Files

- `admin/index.html` - admin panel page for `/admin/`
- `admin.html` - redirects to `/admin/`
- `admin.css` - admin panel styles
- `admin.js` - full admin panel logic
- `firebase-config.js` - Firebase project config and admin email allow-list
- `resources.js` - public Firebase resource helper functions

## Firebase setup

1. Open Firebase Console.
2. Create a Firebase project.
3. Enable Authentication > Sign-in method > Email/Password.
4. Create your admin user manually in Authentication.
5. Enable Firestore Database.
6. Enable Firebase Storage.
7. Go to Project Settings > Your Apps > Web App.
8. Copy your Firebase config into `firebase-config.js`.
9. Add your admin email to `ADMIN_EMAILS` in `firebase-config.js`.
10. Open `/admin/` and sign in.
11. Open Security Rules inside the admin panel and paste those rules into Firebase Firestore Rules and Storage Rules.

## Important

Do not add admin links to the public navigation. The admin panel is intentionally hidden and protected by Firebase login plus email allow-list.

For the public website to show uploaded Firebase resources dynamically, connect the resource listing UI to `resources.js` functions such as `loadPublishedResources()` and `renderResourceCards()`.
