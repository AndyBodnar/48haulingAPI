# Delivery API Hub 

Central API hub serving as the backend for:
- **Mobile App** (Android/iOS) - For delivery drivers
- **Web Admin Panel** - For management and monitoring

##  Project Structure

```
api/
├── supabase/
│   ├── functions/          # Edge Functions (API endpoints)
│   │   ├── _shared/        # Shared utilities (CORS, auth, rate limiting)
│   │   ├── heartbeat/      # Keep-alive endpoint
│   │   ├── log-error/      # Error reporting
│   │   ├── report-issue/   # User feedback
│   │   ├── check-app-version/
│   │   ├── get-optimized-route/
│   │   ├── update-job-status/
│   │   ├── create-job/
│   │   ├── assign-job/
│   │   ├── get-users/
│   │   ├── update-user-role/
│   │   ├── track-analytics/
│   │   ├── get-dashboard-stats/
│   │   └── submit-payroll/
│   └── migrations/         # Database schema migrations
│       ├── 20250101000000_initial_schema.sql
│   │   ├── 20250101000001_seed_data.sql
│       └── 20250101000002_realtime_config.sql
├── web-panel/             # Next.js admin dashboard
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   └── lib/         # Utilities (Supabase client, realtime)
│   └── package.json
├── mobile-sdk/           # Client libraries for mobile apps
│   ├── kotlin/          # Android (Kotlin)
│   ├── typescript/      # React Native
│   └── README.md        # Mobile SDK documentation
├── API_ENDPOINTS.md     # Complete API reference
├── DEPLOYMENT.md        # Deployment guide
└── README.md           # This file
```

##  Features

### Core Functionality
- ✅ User authentication (Supabase Auth)
- ✅ Job management (create, assign, track)
- ✅ Real-time updates (WebSocket)
- ✅ Error reporting & logging
- ✅ User issue tracking
- ✅ Analytics tracking
- ✅ Route optimization (Google Maps)
- ✅ Time tracking & payroll
- ✅ Version management
- ✅ Rate limiting
- ✅ CORS security

### Admin Dashboard
- 📊 Live device status monitoring
- 📝 Error logs with search/filter
- 🐛 User issue management
- 👥 User management
- 📈 Analytics dashboard
- 💰 Payroll processing

### Mobile SDK
- 📱 Easy integration
- 🔄 Automatic heartbeat
- 🔍 Error tracking
- 📍 Route optimization
- ⏱️ Time tracking
- 📊 Analytics

## 🗄️ Database Schema

### Core Tables
- **profiles** - User profiles (admin, driver, user)
- **jobs** - Delivery jobs with status tracking
- **time_logs** - Driver work hours
- **device_status** - Online/offline tracking
- **error_logs** - Application errors
- **reported_issues** - User feedback
- **app_versions** - Version control
- **analytics_events** - Usage metrics

## 📚 Documentation

- **[API Endpoints](./API_ENDPOINTS.md)** - Complete API reference
- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment
- **[Mobile SDK](./mobile-sdk/README.md)** - Mobile integration guide

## 🛠️ Tech Stack

- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Admin Panel**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Real-time**: Supabase Realtime (WebSockets)
- **Auth**: Supabase Auth
- **External APIs**: Google Maps, QuickBooks

## 🏃 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd api

# Install web panel dependencies
cd web-panel
npm install
```

### 2. Set up Environment Variables

Create `web-panel/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally

```bash
# Start web panel
cd web-panel
npm run dev
# Opens at http://localhost:3000
```

### 4. Deploy to Supabase

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Deploy functions
supabase functions deploy
```

##  Security Features

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Rate limiting (60 req/min default)
- CORS configuration
- Service role key for admin operations
- Encrypted secrets

## 📊 Monitoring

Access via Supabase Dashboard:
- **Database**: Monitor queries, performance
- **Auth**: User signups, logins
- **Functions**: Invocations, errors, logs
- **Realtime**: Active connections

## 🧪 Testing

### Test API Endpoints

```bash
# Test heartbeat
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/heartbeat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"app_type":"mobile"}'
```

### Test Admin Panel

1. Create admin user in Supabase Auth
2. Promote to admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
   ```
3. Login at your deployed URL

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📝 License

[Your License Here]

## 🆘 Support

- **Issues**: Create GitHub issue
- **Documentation**: See /docs folder
- **Email**: andy@bespokeseating.xyz

## 🎯 Roadmap

- [ ] Push notifications
- [ ] SMS alerts
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Driver ratings system
- [ ] Automated job assignment
- [ ] Route optimization AI

## 💡 Tips

### For Mobile Developers
- Use provided SDK in `/mobile-sdk`
- Follow rate limiting guidelines
- Implement offline mode with queue
- Handle version updates gracefully

### For Admins
- Monitor error logs daily
- Review user issues regularly
- Check device status for offline drivers
- Run payroll weekly

### For Maintainers
- Keep Supabase CLI updated
- Monitor function logs
- Review database performance
- Update app versions regularly

---

**Built By A driver For Drivers**
