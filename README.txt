ZShoot website, setup guide
===========================

PAGES
  /            home: download, guns, worlds, rewards, web demo
  /feedback/   player reviews
  /ideas/      "Shape ZShoot": send an idea + community roadmap
  /ticket/     support tickets, FAQ and support email
  /about/      about the game and the developer
  /privacy/    Privacy Policy
  /terms/      Terms of Service
  /admin/      your private command center (Google sign-in)

FILES
  config.js         your Firebase config (already filled in for project zshoot-official)
  firestore.rules   database security rules (you must publish these, step 3)
  firebase.json     hosting settings for Firebase Hosting
  site.js store.js app.js style.css   the website code
  assets/           images and sounds

STEP 1. FIREBASE CONSOLE (project zshoot-official)
  a) Build > Authentication > Get started > Sign-in method:
       enable "Anonymous"  (lets visitors send reviews/ideas/tickets without making an account)
       enable "Google"     (this is how you sign in to /admin)
  b) Authentication > Settings > Authorized domains: add your website domain
       (zshoot-official.web.app and zshoot-official.firebaseapp.com are already there; add a custom
       domain or a netlify/github.io domain here if you use one, or Google sign-in will fail).
  c) Build > Firestore Database > Create database (production mode, pick a region near India,
       for example asia-south1).

STEP 2. PUT THE SITE ONLINE
  Firebase Hosting (recommended, it already has your domain authorized):
    npm install -g firebase-tools
    firebase login
    firebase init hosting     (choose project zshoot-official, public directory ".", do NOT overwrite
                               index.html or 404.html, and say No to single-page app)
    firebase deploy --only hosting
  Any other static host works too (Netlify drag and drop, Cloudflare Pages, GitHub Pages). Upload this
  whole folder and keep the folder structure so /admin/, /ticket/ and the others exist.
  Do not open the pages by double clicking the files: Google sign-in needs http(s).

STEP 3. PUBLISH THE RULES
  Firestore Database > Rules: paste the full contents of firestore.rules and press Publish.
  (or: firebase deploy --only firestore:rules  after firebase init firestore)

STEP 4. MAKE YOURSELF ADMIN
  1. Open https://YOUR-SITE/admin/ and press "Sign in with Google" with your developer account.
  2. The page says the account is not an admin yet and shows YOUR UID. Press Copy.
  3. Firebase console > Firestore Database > Start collection:
       Collection ID:  admins
       Document ID:    paste your UID
       Field:          admin   type boolean   value true
  4. Reload /admin/. The command center opens. Nobody else can become admin: the rules do not let
     the website write to the admins collection, only you can, in the console.
  (You can also copy the UID from Authentication > Users.)

USING THE ADMIN PANEL
  Overview     counts, ratings, what needs your attention
  Ideas        Approve / Keep in review / Reject. For approved ideas pick Planned, In progress or Shipped,
               priority, target version, estimate, and write "How you will add it". Choose whether it shows
               on the public roadmap and whether the player is credited by name.
  Reviews      Publish or Reject, write a public reply, pin a review to the top.
  Support      Read the ticket, reply in the conversation, set Open / Answered / Resolved / Closed.
  The player sees your decision, your notes and your plan under My requests (top right of every page),
  and a red badge shows when you have answered. If they left an email, the panel shows it with a mail link.

WHEN YOU RELEASE A NEW VERSION (no file editing needed)
  1. Upload the new APK to your GitHub release and copy its download link.
  2. Open /admin/ > Release. Change: APK download link, big version number (the 3 in "ZShoot 3"),
     version, build, file size, minimum Android, file name and the SHA-256 checksum.
       Checksum: sha256sum ZShoot_vX.apk   (Windows: certutil -hashfile ZShoot_vX.apk SHA256)
  3. Press "Save and publish". Every download button, the logo number, headings, spec table and
     checksum on the site update for all visitors within seconds.
  The values are stored in Firestore at site/release (readable by everyone, writable only by you).
  The numbers written inside site.js (REL_DEFAULTS) are only a fallback if Firestore cannot be reached.
  Text that talks about a specific version in sentences (for example the About story or the Privacy
  Policy line "Version 3.0.0 of the app...") is not automatic. Edit those files when a release changes it.

EDITING TEXT
  Crate descriptions, gun names, world names and the 30 day rewards are data arrays at the top of site.js.
  Privacy Policy and Terms are in privacy/index.html and terms/index.html.

EMAIL TO PLAYERS
  A website cannot send email by itself. Players see replies under My requests. To also send email
  automatically, add the Firebase "Trigger Email from Firestore" extension (needs the Blaze plan and an
  SMTP account).

SECURITY NOTES
  The apiKey in config.js is not a secret, every Firebase web app publishes it. Safety comes from
  firestore.rules. Players can only read their own items; only admins can read everyone's, change a
  decision, or write public reviews and roadmap entries.

NOTE
  The Privacy Policy and Terms are starting templates written to match what the game and the site
  actually do. Read them and adjust them to your situation.
