# 🚀 Freelenzy Backend API

<div align="center">

![Freelenzy Logo](https://via.placeholder.com/200x60/6366f1/ffffff?text=Freelenzy)

**Platforma dla freelancerów - Backend API**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-14.21.0-635BFF?style=for-the-badge&logo=stripe)](https://stripe.com/)

[![API Status](https://img.shields.io/badge/API-Status%3A%20Active-brightgreen?style=for-the-badge)](#api-status)
[![Security](https://img.shields.io/badge/Security-High-green?style=for-the-badge)](#security)
[![Rate Limiting](https://img.shields.io/badge/Rate%20Limit-1000%2Fh-blue?style=for-the-badge)](#rate-limiting)

</div>

## 📋 Spis treści

- [🎯 O projekcie](#-o-projekcie)
- [✨ Funkcje API](#-funkcje-api)
- [🛠️ Technologie](#️-technologie)
- [🚀 Szybki start](#-szybki-start)
- [📁 Struktura projektu](#-struktura-projektu)
- [🔐 Autoryzacja](#-autoryzacja)
- [💳 Płatności](#-płatności)
- [📧 Email](#-email)
- [🗄️ Baza danych](#️-baza-danych)
- [🔧 Konfiguracja](#-konfiguracja)
- [📊 Monitoring](#-monitoring)
- [🧪 Testowanie](#-testowanie)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

## 🎯 O projekcie

**Freelenzy Backend API** to nowoczesne, skalowalne API dla platformy freelancerów. Zapewnia bezpieczne, wydajne i niezawodne usługi backendowe dla aplikacji frontend.

### 🎨 Architektura
- **RESTful API** - Standardowe endpointy REST
- **Modular Design** - Czytelna struktura modułów
- **Security First** - Zaawansowane zabezpieczenia
- **High Performance** - Optymalizacja wydajności
- **Scalable** - Gotowe do skalowania

## ✨ Funkcje API

### 👥 **Zarządzanie użytkownikami**
- Rejestracja i logowanie
- Zarządzanie profilami
- Autoryzacja JWT
- Reset hasła
- Weryfikacja konta

### 🏢 **Zarządzanie klientami**
- CRUD operacje klientów
- Statusy i kategorie
- Historia współpracy
- Integracja z projektami
- Panel administracyjny

### 📋 **Projekty i zadania**
- Tworzenie i zarządzanie projektami
- System zadań z priorytetami
- Timeline i deadlines
- Progress tracking
- Statusy projektów

### 📄 **Umowy i wycenienia**
- Generowanie umów
- System wycenień
- Statusy umów
- Historia zmian
- Eksport dokumentów

### 📝 **Notatki i dokumenty**
- Organizacja notatek
- Tagowanie i kategoryzacja
- Wyszukiwanie
- Załączniki
- Wersjonowanie

### 💰 **Płatności i subskrypcje**
- Integracja z Stripe
- Subskrypcje premium
- Faktury
- Webhook'i płatności
- Zarządzanie limitami

### 📊 **Raportowanie i statystyki**
- Dashboard analytics
- Statystyki przychodów
- Raporty dla klientów
- Eksport danych
- Metryki wydajności

### 🔍 **Wyszukiwanie**
- Pełnotekstowe wyszukiwanie
- Filtrowanie i sortowanie
- Sugestie wyszukiwania
- Historia wyszukiwań

## 🛠️ Technologie

### **Backend Stack**
- **[Node.js 18+](https://nodejs.org/)** - Runtime environment
- **[Express.js 4.21.2](https://expressjs.com/)** - Web framework
- **[PostgreSQL](https://postgresql.org/)** - Relational database
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL
- **[Redis](https://redis.io/)** - Caching & sessions

### **Security & Auth**
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Password hashing
- **[JWT](https://jwt.io/)** - JSON Web Tokens
- **[CORS](https://www.npmjs.com/package/cors)** - Cross-origin requests
- **[Rate Limiting](https://www.npmjs.com/package/@upstash/ratelimit)** - API protection

### **Payments & Integrations**
- **[Stripe](https://stripe.com/)** - Payment processing
- **[Resend](https://resend.com/)** - Email service
- **[Cloudinary](https://cloudinary.com/)** - Image management
- **[Firebase Admin](https://firebase.google.com/)** - Push notifications

### **Development Tools**
- **[Nodemon](https://nodemon.io/)** - Development server
- **[dotenv](https://www.npmjs.com/package/dotenv)** - Environment variables
- **[Multer](https://www.npmjs.com/package/multer)** - File uploads
- **[Cron](https://www.npmjs.com/package/cron)** - Scheduled tasks

## 🚀 Szybki start

### **Wymagania**
- Node.js 18+
- npm 8+
- PostgreSQL 15+
- Redis (opcjonalnie)

### **Instalacja**

```bash
# Klonowanie repozytorium
git clone https://github.com/your-username/freelenzy.git
cd freelenzy/my-freelance-backend

# Instalacja zależności
npm install

# Konfiguracja środowiska
cp .env.example .env
# Edytuj .env z odpowiednimi wartościami

# Uruchomienie w trybie development
npm run dev
```

API będzie dostępne pod adresem: `http://localhost:5001`

### **Dostępne skrypty**

```bash
# Development
npm run dev          # Uruchomienie z nodemon
npm start            # Uruchomienie production
npm run migrate:*    # Migracje bazy danych
```

## 📁 Struktura projektu

```
src/
├── config/                  # Konfiguracja
│   ├── db.js               # Konfiguracja bazy danych
│   ├── stripe.js           # Konfiguracja Stripe
│   ├── upstash.js          # Konfiguracja Redis
│   ├── password.js         # Konfiguracja hashowania
│   └── cron.js             # Harmonogram zadań
├── controllers/            # Kontrolery API
│   ├── usersController.js  # Zarządzanie użytkownikami
│   ├── clientsController.js # Zarządzanie klientami
│   ├── projectsController.js # Zarządzanie projektami
│   ├── tasksController.js  # Zarządzanie zadaniami
│   ├── contractsController.js # Zarządzanie umowami
│   ├── notesController.js  # Zarządzanie notatkami
│   ├── filesController.js  # Zarządzanie plikami
│   ├── subscriptionController.js # Subskrypcje
│   ├── stripeWebhookController.js # Webhook'i Stripe
│   └── ...
├── middleware/             # Middleware
│   ├── adminAuth.js        # Autoryzacja admin
│   └── rateLimiter.js      # Rate limiting
├── routes/                 # Definicje tras
│   ├── usersRoute.js       # Trasy użytkowników
│   ├── clientsUserRoutes.js # Trasy klientów
│   ├── projectsRoutes.js   # Trasy projektów
│   ├── tasksRoutes.js      # Trasy zadań
│   ├── contractsRoutes.js  # Trasy umów
│   ├── notesRoutes.js      # Trasy notatek
│   ├── filesRoutes.js      # Trasy plików
│   ├── subscriptionRoutes.js # Trasy subskrypcji
│   └── ...
├── templates/              # Szablony email
│   └── emails/             # Szablony wiadomości
├── utils/                  # Funkcje pomocnicze
│   ├── timezone.js         # Obsługa stref czasowych
│   └── testPriceMapping.js # Mapowanie cen
├── database/               # Migracje bazy danych
│   └── migrations/         # Pliki migracji
└── server.js               # Główny plik serwera
```

## 🔐 Autoryzacja

### **JWT Tokens**
```javascript
// Generowanie tokena
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Weryfikacja tokena
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### **Middleware Autoryzacji**
```javascript
// Sprawdzenie autoryzacji
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### **Role i uprawnienia**
- **User** - Podstawowe uprawnienia
- **Premium** - Rozszerzone funkcje
- **Admin** - Pełne uprawnienia administracyjne

## 💳 Płatności

### **Stripe Integration**
```javascript
// Tworzenie płatności
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  customer: customerId,
});

// Webhook handler
app.post('/webhook/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Obsługa udanej płatności
      break;
    case 'customer.subscription.created':
      // Obsługa nowej subskrypcji
      break;
  }
});
```

### **Subskrypcje**
- **Free** - Podstawowe funkcje
- **Premium** - Rozszerzone funkcje
- **Gold** - Pełne funkcje + priority support

## 📧 Email

### **Resend Integration**
```javascript
// Wysyłanie email
const { data, error } = await resend.emails.send({
  from: 'Freelenzy <noreply@freelenzy.com>',
  to: [user.email],
  subject: 'Witamy w Freelenzy!',
  html: emailTemplate,
});
```

### **Szablony Email**
- Potwierdzenie konta
- Reset hasła
- Powiadomienia o zadaniach
- Newsletter
- Powiadomienia o płatnościach

## 🗄️ Baza danych

### **PostgreSQL Schema**
```sql
-- Użytkownicy
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  premium_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Klienci
CREATE TABLE clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projekty
CREATE TABLE projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  client_id UUID REFERENCES clients(client_id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Migracje**
```bash
# Uruchomienie migracji
npm run migrate:league-fk
npm run migrate:team-fk
```

## 🔧 Konfiguracja

### **Zmienne środowiskowe**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/freelenzy
NEON_DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/db

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Server
PORT=5001
NODE_ENV=development
```

### **Konfiguracja Express**

```javascript
// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import rateLimit from '@upstash/ratelimit';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const ratelimit = new RateLimit({
  redis: Redis.fromEnv(),
  limiter: RateLimit.slidingWindow(1000, '1 h'),
});

app.use('/api/', ratelimit);
```

## 📊 Monitoring

### **Health Check**
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### **Logging**
```javascript
// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error logging
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});
```

### **Performance Monitoring**
- Response time tracking
- Error rate monitoring
- Database query optimization
- Memory usage monitoring

## 🧪 Testowanie

### **API Testing**
```bash
# Testowanie endpointów
curl -X GET http://localhost:5001/api/health
curl -X POST http://localhost:5001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### **Database Testing**
```sql
-- Test połączenia
SELECT version();

-- Test tabel
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM projects;
```

### **Load Testing**
```bash
# Użyj narzędzi jak Apache Bench lub Artillery
ab -n 1000 -c 10 http://localhost:5001/api/health
```

## 🚀 Deployment

### **Docker**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5001

CMD ["npm", "start"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5001:5001"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/freelenzy
      - JWT_SECRET=your-secret
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=freelenzy
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### **Environment Variables**
```bash
# Production
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/freelenzy
JWT_SECRET=your-production-secret
STRIPE_SECRET_KEY=sk_live_...
```

## 🤝 Contributing

### **Workflow**
1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### **Code Standards**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Conventional Commits** - Commit messages
- **JSDoc** - Code documentation

### **Security Guidelines**
- Używaj HTTPS w production
- Waliduj wszystkie inputy
- Sanityzuj dane przed zapisem
- Używaj prepared statements
- Implementuj rate limiting

## 📄 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 🙏 Podziękowania

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [PostgreSQL](https://postgresql.org/) - Advanced open source database
- [Stripe](https://stripe.com/) - Online payment processing
- [Node.js](https://nodejs.org/) - JavaScript runtime

---

<div align="center">

**Stworzone z ❤️ dla freelancerów**

[🌐 Website](https://freelenzy.com) • [📧 Support](mailto:support@freelenzy.com) • [🐛 Issues](https://github.com/your-username/freelenzy/issues)

</div>