# Pixelxcript Installations

(formerly "PX Doors" — code, file names, and infrastructure like the GitHub repo and live URL still use the old `px-doors` name; see the note at the bottom of this file.)

A storefront for selling internal, external and steel doors, where every door can include installation and an after-service care plan chosen at checkout. Built as a small Express backend + plain HTML/CSS/JS frontend — no build step, no framework.

Because it has a live backend (cart, checkout, order storage, admin area), it needs a Node host — it can't run on GitHub Pages, which only serves static files. GitHub is fine for the source code itself; deploy the running site to something like Render or Railway (steps below).

## Deploying it (Render)

1. Push this code to a GitHub repo (already done if you're reading this from the repo).
2. Go to [render.com](https://render.com), sign in, and choose **New → Web Service**, then connect this repo. Render reads `render.yaml` automatically and fills in the build/start commands.
   - Or use this one-click link once the repo is pushed: `https://render.com/deploy?repo=https://github.com/nethoth69/P-X-Doors`
3. Before the first deploy, set at least `ADMIN_PASSWORD` in Render's environment variables tab (it's marked `sync: false` in `render.yaml`, meaning Render will prompt you for it rather than storing a default). Add the SMTP/WhatsApp variables too if you want notifications live from day one.
4. Deploy. Render gives you a URL like `https://px-doors.onrender.com`.

**One thing to know:** orders are currently stored in a plain file (`data/orders.json`) on the server's own disk. On Render's free tier, that file does *not* survive a redeploy (a new deploy starts from a fresh container) — it does survive the service sleeping/waking from inactivity. That's fine for testing, but before you're taking real orders, either upgrade to a plan with a persistent disk or move order storage to a real database (see the note under "How ordering works" below). Don't rely on `data/orders.json` for real order history until one of those is in place.

## Running it locally

```bash
npm install
cp .env.example .env   # then fill in whatever sections you want to use
npm start
```

Then open http://localhost:3000

For auto-restart on file changes during development:

```bash
npm run dev
```

## How it's put together

```
server.js              Express app: serves the site + a small JSON API
.env.example           Template for SMTP, WhatsApp, admin and account settings — copy to .env
lib/notify.js          Order email notifications + WhatsApp click-to-chat link
lib/adminAuth.js        HTTP Basic Auth guard for the admin area
lib/users.js            Account store (email/password + Google users)
lib/passportConfig.js   Google OAuth setup (only activates if configured) + session handling
data/doors.json         The catalog — products, categories, prices, options
data/orders.json        Orders placed through the site (auto-created, git-ignored)
data/users.json         Registered accounts (auto-created, git-ignored)
admin/admin.html         Orders dashboard (only reachable via /admin, password-protected)
public/
  index.html             Homepage
  catalog.html           Full catalog with category filters
  product.html           Door configurator (size / finish / installation / after-service)
  cart.html              Cart
  checkout.html          Customer details form
  confirmation.html      Order confirmation
  login.html             Log in (email/password + Google)
  signup.html            Create an account (email/password + Google)
  account.html           Profile + order history, log out
  css/styles.css         Site styling
  css/admin.css          Extra styling for the admin table
  js/                    Page logic (cart is shared via localStorage)
  images/                SVG door illustrations
```

### How pricing works

Each product in `data/doors.json` has a `basePrice` plus four option groups — `size`, `finish`, `installation`, `afterService` — each with a price `delta`. The configurator adds the base price to whichever option is selected in each group to get the live total. Edit the JSON to change prices, add sizes/finishes, or add a new installation tier.

### How ordering works

There's no online payment yet. A customer builds a cart (stored in their browser), fills in their details at checkout, and submitting the form saves the order to `data/orders.json` with an order number like `PXD-12345678`. You follow up with them directly to confirm and take payment — on delivery or install day.

`data/orders.json` is a flat file for now, which is fine for getting started. When order volume grows, swap the `readJSON`/`writeJSON` calls in `server.js` for a real database (SQLite is a natural first step with this stack) without changing any of the frontend.

### Order notifications

When someone places an order, the server tries to email your team a summary. It's optional and fails silently if it isn't set up — the order is always saved either way. To turn it on, fill in the SMTP section of `.env` (a Gmail address with an [app password](https://myaccount.google.com/apppasswords) is the simplest option; any SMTP provider works).

There's also an optional `NOTIFY_WHATSAPP_NUMBER`. If you set it, every order response includes a WhatsApp click-to-chat link pre-filled with the order details, and the confirmation page shows a "Message us on WhatsApp" button. This opens WhatsApp with a drafted message — it doesn't send anything automatically. Fully automatic WhatsApp notifications require Meta's WhatsApp Business Platform, which is a separate account and approval process outside what a website itself can do.

### Admin area

Visiting `/admin` shows every order (newest first) with customer details and a dropdown to update status (received → confirmed → installed → completed, or cancelled). It's protected by HTTP Basic Auth — your browser will prompt for a username and password.

Set `ADMIN_PASSWORD` (and optionally `ADMIN_USER`, which defaults to `admin`) in `.env`. Until `ADMIN_PASSWORD` is set, `/admin` is blocked rather than left open with a default password.

### Accounts (sign up / log in)

Customers can create an account with name, email and password, or with "Continue with Google." Either way, they get a **My orders** page (`account.html`) that lists orders placed while logged in, and checkout pre-fills their name and email.

**Email/password** works with no setup beyond `SESSION_SECRET` in `.env` (any long random string — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Passwords are hashed with bcrypt before being stored.

**Google sign-in** needs a one-time setup in Google Cloud Console:
1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project (or use an existing one).
2. **APIs & Services → OAuth consent screen** — set it up for "External" users, add your app name and support email.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, application type "Web application."
4. Under "Authorized redirect URIs," add:
   - `http://localhost:3000/auth/google/callback` (for local testing)
   - `https://your-render-url.onrender.com/auth/google/callback` (your live site)
5. Copy the generated Client ID and Client Secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Set `GOOGLE_CALLBACK_URL` to match whichever URL you're running on.

If those two variables are left blank, the "Continue with Google" button automatically hides itself on the login and signup pages — email/password still works fine without it.

Accounts are stored the same way orders are (`data/users.json`, a flat file) — the same Render free-tier caveat applies: it doesn't survive a redeploy. Move to a real database at the same time you move orders over.

### Finish photo gallery

Each finish option in `data/doors.json` carries its own `image`. On the product page, this shows as a row of clickable photo thumbnails below the description — clicking one both previews it and selects that finish (and picking a finish from the list updates the preview photo too; the two stay in sync). This is how a customer confirms "yes, that's the exact one" before adding it to cart — the chosen photo travels with the order through cart, checkout, admin and the order email.

Right now these are the same illustrated SVG placeholders, just recolored per finish (e.g. a walnut-stained version, a painted white version). When real product photos are ready, replace each finish option's `image` with the matching photo filename — no code changes needed. If a future product's finish options all point to the same file, the gallery just doesn't render for that product (nothing to choose between) — give it distinct images per finish and the gallery appears automatically.

## Adding a new door

Add an entry to the `products` array in `data/doors.json` with a unique `id`, its `category` (`internal`, `external` or `steel` for now), a `basePrice`, an `image` filename (drop the SVG or photo into `public/images/`), and its four option groups. It'll appear in the catalog and configurator automatically — no code changes needed.

## Adding a new door category

Add an entry to `categories` in `data/doors.json`, then add a category tile for it on the homepage (`index.html`) if you want it featured there.

## Still to customize

- **Product photos**: the catalog (15 products across the three categories) currently uses simple illustrated SVGs as placeholders. Swap the `image` field in `doors.json` for real product photos once you have them — JPG/PNG/WebP all work, just update the filename and drop the file into `public/images/`. No other code changes needed.
- **`.env`**: copy `.env.example` to `.env` and fill in SMTP, WhatsApp, admin and account settings as you're ready to use them. `SESSION_SECRET` is worth setting even before Google sign-in is configured, so email/password accounts work properly.

## A note on the name

The site now displays as **Pixelxcript Installations** everywhere a visitor sees it (header, page titles, emails, admin area). The underlying project — the GitHub repo (`P-X-Doors`), the folder name, the live URL (`px-doors.onrender.com`), npm package name, and internal file names like `data/doors.json` — still use the original `px-doors` / "PX Doors" naming. Renaming those would change the live URL and break the Google OAuth login (which is registered against `px-doors.onrender.com`), so that's a separate, deliberate decision rather than an oversight. See the project notes if that ever needs to change too.
