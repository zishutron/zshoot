ZShoot website, setup guide
===========================

FILES
  index.html, style.css, site.js, store.js, app.js   the website
  config.js                                           your settings (admin email and Firebase)
  firestore.rules                                     database security rules
  assets/                                             images and sounds

1. PUT THE SITE ONLINE
  Upload this whole folder to any static host: Netlify (drag and drop the folder), GitHub Pages,
  Cloudflare Pages or Firebase Hosting. Open index.html locally to try it first.
  Without step 2 the site runs in DEMO MODE: it works, but reviews, ideas and tickets are saved
  only in the visitor's own browser, so you will not receive them.

2. TURN ON REAL REVIEWS, IDEAS AND SUPPORT (Firebase, free plan is enough)
  a) console.firebase.google.com, create a project.
  b) Build > Authentication > Get started. Enable "Anonymous" and "Google".
     Under Settings > Authorized domains, add the domain of your website.
  c) Build > Firestore Database > Create database (production mode).
  d) Firestore > Rules: paste the contents of firestore.rules and Publish.
     Replace YOUR_ADMIN_EMAIL@gmail.com with your Google account email first.
  e) Project settings > Your apps > Web app. Copy the config values (apiKey, authDomain,
     projectId, appId) into config.js, and put your email in adminEmails.
  f) Upload the folder again.

3. USE THE ADMIN PANEL
  Open your site, click Admin in the footer (or add #admin to the address), sign in with Google.
  Only the email in adminEmails and firestore.rules can read submissions or make decisions.
  Ideas: Approve / Reject, pick Planned / In progress / Shipped, write how you will add it.
  Players see your decision, your note and the plan under My requests, with a badge for news.
  Reviews: Publish or Reject. Support: reply in the conversation and set the status.

4. WHEN YOU RELEASE A NEW APK
  Upload it to your GitHub release, then edit:
    site.js        APK_URL at the top
    index.html     the three href links that start with https://github.com/... and the checksum text
  Get the checksum with:  sha256sum ZShoot_vX.apk   (or certutil -hashfile file SHA256 on Windows)

5. EDITING TEXT
  Crate descriptions, gun names, world names and the 30 day rewards are the data arrays at the top of
  site.js. Privacy Policy and Terms are in index.html (search for "Privacy Policy").

EMAIL TO PLAYERS
  A website cannot send email by itself. Players see replies under My requests, and a badge appears
  on the button when you have answered. To also send email automatically, add the Firebase
  "Trigger Email from Firestore" extension. If a player gave an email, the admin panel shows it
  with a one-click mail link.

NOTE
  The Privacy Policy and Terms are starting templates written to match what the game and the site
  actually do. Read them, adjust them to your situation and have them checked if you can.
