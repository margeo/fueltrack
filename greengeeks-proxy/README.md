# GreenGeeks FatSecret Proxy

Tiny PHP proxy που δίνει στο FuelTrack μια σταθερή IP (107.6.176.102)
για calls στο FatSecret REST API. Το Netlify Lambda rotates δυναμικά
AWS IPs — το FatSecret IP whitelist δεν μπορεί να τα πιάσει. Εδώ όλα
τα FatSecret calls περνούν από το GreenGeeks shared hosting account
(`fueltrac`), που έχει ένα και μόνο static IP — αυτό το IP είναι η
ΜΟΝΗ εγγραφή που χρειάζεται να υπάρχει στο FatSecret IP Restrictions.

## Upload

1. Στον τοπικό repo: αντίγραψε `_config.sample.php` → `_config.php` και
   γέμισε τα 3 placeholder values:
   - `FATSECRET_CLIENT_ID` — από FatSecret Platform → API Keys
   - `FATSECRET_CLIENT_SECRET` — αν έχει χαθεί: Reset + copy immediately
   - `FATSECRET_PROXY_SECRET` — νέο long random string (π.χ. από `openssl rand -hex 32`)

2. Στο GreenGeeks cPanel → **File Manager** → πήγαινε στο
   `/home/fueltrac/api.fueltrack.me/` (το document root του subdomain)
   και ανέβασε τα 3 αρχεία:
   - `fatsecret-proxy.php`
   - `_config.php` (το πραγματικό, όχι το `.sample`)
   - `.htaccess`

3. **ΜΗΝ** κάνεις commit το `_config.php` με πραγματικά credentials.

## Netlify side

Πρόσθεσε στα Netlify env vars (All scopes, Same value in all contexts):

- `FATSECRET_PROXY_URL` = `https://api.fueltrack.me/fatsecret-proxy.php`
- `FATSECRET_PROXY_SECRET` = ίδιο string με το `_config.php` πιο πάνω

Ο `food-search.js` Netlify function θα καλεί αυτό το URL αντί για το
FatSecret απευθείας.

## FatSecret whitelist

Πήγαινε στο FatSecret Platform → API Keys → IP Restrictions και:
- Διέγραψε τα 6-7 `44.x.x.x` / `34.x.x.x` AWS Lambda IPs (άχρηστα)
- Πρόσθεσε **μόνο** το `107.6.176.102` (GreenGeeks shared IP)

## Security model

- `fatsecret-proxy.php` **δεν δουλεύει** χωρίς σωστό `X-Proxy-Secret` header
- Μόνο ο Netlify function ξέρει το secret
- Το `_config.php` δεν σερβίρεται από τον Apache λόγω `.htaccess` Require all denied
- Αν το secret διαρρεύσει: rotate και το env var και το `_config.php`

## Testing το proxy μόνο του

Από terminal:

```bash
curl -H "X-Proxy-Secret: <το secret>" \
  "https://api.fueltrack.me/fatsecret-proxy.php?q=big+mac"
```

Αναμένεται JSON με `foods.food` array. Αν πάρεις `{"error":"Unauthorized"}`
→ λάθος secret. Αν `{"error":"FatSecret token failed"}` → λάθος
credentials στο `_config.php` ή το `107.6.176.102` δεν είναι ακόμα
whitelisted στο FatSecret.
