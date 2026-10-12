/* ZShoot site settings. Fill this in to turn on real reviews, ideas and support tickets.
   Leave firebase empty and the site runs in demo mode (data stays in the visitor's own browser). */
window.ZS_CONFIG = {
  // Google accounts that can open the Admin panel. Must match the list in firestore.rules.
  adminEmails: ["YOUR_ADMIN_EMAIL@gmail.com"],

  // Paste your Firebase web app config here (Project settings, Your apps).
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  }
};
