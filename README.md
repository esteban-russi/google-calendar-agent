# Calendar Countdown

Real-time countdown to your next Google Calendar meeting. Dark minimal dashboard with big monospace digits.

## Setup

### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a new project
2. **Enable** the **Google Calendar API** (APIs & Services → Library → search "Google Calendar API")
3. Configure **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: **External**
   - Fill in app name and support email
   - Add scope: `https://www.googleapis.com/auth/calendar.events.readonly`
4. Create **OAuth 2.0 credentials** (APIs & Services → Credentials → Create Credentials → OAuth client ID):
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and see your countdown.

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add the same environment variables in Vercel project settings
4. Add your Vercel production URL as an authorized redirect URI in Google Cloud Console:
   `https://your-app.vercel.app/api/auth/callback/google`
