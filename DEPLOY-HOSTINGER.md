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
2. Create app:
   - **Node version:** 18 (or newer)
   - **Application root:** e.g. `boudi-cafe`
   - **Application startup file:** `server.js`
3. Upload the zip into the application root and extract it (File Manager).
4. In the panel, add **Environment variables**:
   - `SESSION_SECRET` = a long random string
   - `COOKIE_SECURE` = `true`  (only if the site uses HTTPS)
5. Click **Run NPM Install**, then **Start / Restart** the app.
6. Open your domain. Log in with `admin` / `admin123` and change the password.

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
