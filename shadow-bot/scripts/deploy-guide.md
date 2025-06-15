# دليل النشر - شادو بوت 🌑

دليل شامل لنشر بوت شادو على منصات الاستضافة المختلفة.

## 📋 المتطلبات العامة

### متطلبات النظام
- **Node.js**: الإصدار 18.0.0 أو أحدث
- **الذاكرة**: 512 MB كحد أدنى (1 GB مُوصى به)
- **التخزين**: 1 GB مساحة فارغة
- **الشبكة**: اتصال إنترنت مستقر

### الملفات المطلوبة
- جميع ملفات المشروع
- ملف `.env` مُعدّ بشكل صحيح
- قاعدة البيانات المُهيأة

## 🚀 النشر على Replit

### الخطوات التفصيلية

1. **إنشاء Repl جديد**
   - اذهب إلى [replit.com](https://replit.com)
   - انقر على "Create Repl"
   - اختر "Node.js" كقالب
   - أدخل اسم المشروع: `shadow-bot`

2. **رفع ملفات المشروع**
   ```bash
   # طريقة 1: رفع مباشر
   # اسحب وأفلت جميع ملفات المشروع في Replit
   
   # طريقة 2: استخدام Git
   git clone https://github.com/your-username/shadow-bot.git
   ```

3. **تثبيت التبعيات**
   ```bash
   npm install
   ```

4. **إعداد متغيرات البيئة**
   - انقر على "Secrets" في الشريط الجانبي
   - أضف المتغيرات التالية:
   ```
   BOT_NAME=شادو - الذي في حديقة الظل
   NODE_ENV=production
   PHONE_NUMBER=+966xxxxxxxxx
   DEVELOPER_NUMBERS=966xxxxxxxxx
   PAIRING_CODE=true
   BACKUP_ENABLED=true
   ```

5. **تهيئة قاعدة البيانات**
   ```bash
   npm run init-db
   ```

6. **تشغيل البوت**
   ```bash
   npm start
   ```

7. **الحفاظ على البوت نشطاً**
   - استخدم خدمة UptimeRobot لإبقاء البوت نشطاً
   - أضف URL الـ Repl إلى UptimeRobot

### إعدادات Replit الخاصة

**ملف `.replit`:**
```toml
run = "npm start"
entrypoint = "index.js"

[env]
PATH = "/home/runner/$REPL_SLUG/.config/npm/node_global/bin:/home/runner/$REPL_SLUG/node_modules/.bin"
npm_config_prefix = "/home/runner/$REPL_SLUG/.config/npm/node_global"

[gitHubImport]
requiredFiles = [".replit", "replit.nix"]

[packager]
language = "nodejs"

[packager.features]
packageSearch = true
guessImports = true
enabledForHosting = false

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"
syntax = "javascript"

[languages.javascript.languageServer]
start = "typescript-language-server --stdio"

[deployment]
run = ["sh", "-c", "npm start"]
```

## 🌐 النشر على Render

### الخطوات التفصيلية

1. **إعداد المشروع على GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/shadow-bot.git
   git push -u origin main
   ```

2. **إنشاء خدمة على Render**
   - اذهب إلى [render.com](https://render.com)
   - انقر على "New +" ثم "Web Service"
   - اربط حساب GitHub
   - اختر مستودع `shadow-bot`

3. **إعدادات الخدمة**
   ```yaml
   Name: shadow-bot
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **متغيرات البيئة**
   ```
   NODE_ENV=production
   BOT_NAME=شادو - الذي في حديقة الظل
   PHONE_NUMBER=+966xxxxxxxxx
   DEVELOPER_NUMBERS=966xxxxxxxxx
   PAIRING_CODE=true
   BACKUP_ENABLED=true
   LOG_LEVEL=info
   ```

5. **ملف `render.yaml`** (اختياري)
   ```yaml
   services:
     - type: web
       name: shadow-bot
       env: node
       buildCommand: npm install && npm run init-db
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: BOT_NAME
           value: شادو - الذي في حديقة الظل
   ```

## 🚂 النشر على Railway

### الخطوات التفصيلية

1. **إعداد المشروع**
   - اذهب إلى [railway.app](https://railway.app)
   - انقر على "Start a New Project"
   - اختر "Deploy from GitHub repo"

2. **إعدادات النشر**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

3. **متغيرات البيئة**
   - انتقل إلى تبويب "Variables"
   - أضف جميع المتغيرات المطلوبة

4. **إعداد قاعدة البيانات**
   ```bash
   # سيتم تشغيلها تلقائياً عند النشر
   npm run init-db
   ```

## 🟣 النشر على Heroku

### الخطوات التفصيلية

1. **تثبيت Heroku CLI**
   ```bash
   # Windows
   # تحميل من https://devcenter.heroku.com/articles/heroku-cli
   
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Ubuntu
   sudo snap install --classic heroku
   ```

2. **إعداد المشروع**
   ```bash
   heroku login
   heroku create shadow-bot-app
   ```

3. **إعداد متغيرات البيئة**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set BOT_NAME="شادو - الذي في حديقة الظل"
   heroku config:set PHONE_NUMBER="+966xxxxxxxxx"
   heroku config:set DEVELOPER_NUMBERS="966xxxxxxxxx"
   heroku config:set PAIRING_CODE=true
   heroku config:set BACKUP_ENABLED=true
   ```

4. **ملف `Procfile`**
   ```
   web: npm start
   ```

5. **النشر**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

6. **تشغيل البوت**
   ```bash
   heroku ps:scale web=1
   heroku logs --tail
   ```

## 🐳 النشر باستخدام Docker

### ملف `Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run init-db

EXPOSE 3000

CMD ["npm", "start"]
```

### ملف `docker-compose.yml`
```yaml
version: '3.8'
services:
  shadow-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - BOT_NAME=شادو - الذي في حديقة الظل
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
      - ./session:/app/session
    restart: unless-stopped
```

### أوامر Docker
```bash
# بناء الصورة
docker build -t shadow-bot .

# تشغيل الحاوية
docker run -d --name shadow-bot -p 3000:3000 shadow-bot

# تشغيل باستخدام docker-compose
docker-compose up -d
```

## ☁️ النشر على VPS

### إعداد الخادم (Ubuntu/Debian)

1. **تحديث النظام**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **تثبيت Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **تثبيت PM2**
   ```bash
   sudo npm install -g pm2
   ```

4. **رفع المشروع**
   ```bash
   git clone https://github.com/your-username/shadow-bot.git
   cd shadow-bot
   npm install
   npm run init-db
   ```

5. **إعداد PM2**
   ```bash
   # إنشاء ملف ecosystem.config.js
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'shadow-bot',
       script: 'index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   EOF
   
   # تشغيل البوت
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## 🔧 نصائح التحسين

### الأداء
- استخدم `NODE_ENV=production`
- فعّل ضغط gzip
- استخدم CDN للملفات الثابتة
- راقب استخدام الذاكرة

### الأمان
- استخدم HTTPS دائماً
- احم متغيرات البيئة
- فعّل جدار الحماية
- حدّث التبعيات بانتظام

### المراقبة
- استخدم خدمات مراقبة الوقت التشغيلي
- راقب السجلات بانتظام
- اعدّ تنبيهات للأخطاء
- راجع الإحصائيات دورياً

## 🚨 استكشاف الأخطاء

### مشاكل شائعة

1. **خطأ في الاتصال بـ WhatsApp**
   ```bash
   # تحقق من ملفات الجلسة
   ls -la session/
   
   # امسح الجلسة وأعد المصادقة
   rm -rf session/*
   npm start
   ```

2. **خطأ في قاعدة البيانات**
   ```bash
   # أعد تهيئة قاعدة البيانات
   rm database/shadow.db
   npm run init-db
   ```

3. **مشاكل الذاكرة**
   ```bash
   # راقب استخدام الذاكرة
   htop
   
   # أعد تشغيل البوت
   pm2 restart shadow-bot
   ```

4. **مشاكل الشبكة**
   ```bash
   # تحقق من الاتصال
   ping google.com
   
   # تحقق من البورتات
   netstat -tulpn | grep :3000
   ```

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع ملفات السجلات
2. تحقق من متغيرات البيئة
3. تأكد من تحديث التبعيات
4. راجع وثائق المنصة المستخدمة

---

**نجح النشر؟ شادو جاهز في حديقة الظل!** 🌑

