# Deploy BOUDI CAFE POS to Hostinger

This is a **Node.js + SQLite** app, so it needs Hostinger **VPS** or a plan with
the **"Node.js" app** feature in hPanel (Business / Cloud). It will NOT run on
plain shared/static hosting.

---

## What to upload
Upload everything in this folder EXCEPT:
- `node_modules/`  (rebuilt on the server with `npm install`)
- `data/boudicafe.db*`  (created automatically on first run)
- `.env`  (create it on the server from `.env.example`)

A ready zip named **boudi-cafe-deploy.zip** was generated next to this folder
with the correct files already excluded.

---

## Option A — hPanel "Setup Node.js App" (easiest)
1. hPanel -> **Advanced** -> **Node.js** (or "Setup Node.js App").
2. Connect GitHub and select:
   - **Repository:** `beirutbitesofficial-crypto/BOUDI`
   - **Branch:** `main`
   - **Framework:** Express.js (or Other if Express is not detected)
   - **Node.js version:** 18.x
   - **Package manager:** npm
   - **Build command:** leave empty / none
   - **Start command:** `npm start`
   - **Entry file (if Hostinger asks for one instead of Start command):** `scripts/start-hostinger.js`

   **Important:** Do NOT use `server.js` as the production entry file on Hostinger. The start script prepares persistent SQLite/uploads storage before loading `server.js`.
3. Add **Environment variables**:
   - `HOST` = `0.0.0.0`
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = a long random string
   - `COOKIE_SECURE` = `true`
   - Leave `PORT` unset unless Hostinger explicitly requires it.
   - Leave `DATA_DIR` unset; persistent storage is configured automatically.
4. Deploy the application. Hostinger installs npm dependencies automatically.
5. Open the temporary domain and confirm the login screen loads.
6. Log in with `admin` / `admin123`, immediately change the password, then connect the final domain.

---

## Option B — Hostinger VPS
```bash
ssh root@YOUR_SERVER_IP

# Install Node 18 + build tools (better-sqlite3 compiles natively)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs build-essential
npm install -g pm2

# Put files in /var/www/boudi-cafe (upload zip & unzip, or rsync)
cd /var/www/boudi-cafe
cp .env.example .env        # then edit .env (set SESSION_SECRET)
npm install

# Start & keep alive
pm2 start server.js --name boudi-cafe
pm2 save
pm2 startup                 # auto-start on reboot
```

### Put it on your domain (Nginx reverse proxy)
```bash
apt-get install -y nginx
```
Create `/etc/nginx/sites-available/boudi-cafe`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/boudi-cafe /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Free HTTPS
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```
After enabling HTTPS, set `COOKIE_SECURE=true` in `.env` and `pm2 restart boudi-cafe`.

---

## After first login (important)
1. Change the default admin password (`admin` / `admin123`) in Settings.
2. Make sure `SESSION_SECRET` is set to a long random value.
3. Back up the database file `data/boudicafe.db` regularly (Settings has a backup route).
