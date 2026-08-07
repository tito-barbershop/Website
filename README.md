# BarberHub - Barbershop Management System MVP

A production-ready, white-label SaaS platform for managing barbershop bookings, workers, services, and appointments. Built with React, TypeScript, Firebase, and Tailwind CSS.

## 🎯 Overview

BarberHub is a comprehensive barbershop management system designed as an MVP for cold outreach to barbershop owners. It's fully functional, easy to customize, and ready to deploy.

**Key Features:**
- 👥 Multi-role authentication (Owner, Worker, Customer)
- 📅 Advanced appointment booking system
- 👨‍💼 Worker and service management
- 📊 Owner dashboard with analytics
- 💅 Modern, responsive UI
- 🔐 Secure Firebase backend
- 🎨 Fully white-label & customizable

## 📁 Project Structure

```
barbershop/
├── barbershop-saas/          # Main application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── config/          # Firebase & branding config
│   │   ├── contexts/        # React contexts (Toast)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities & auth functions
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── public/              # Static assets
│   ├── .env.example         # Environment variables template
│   ├── SETUP.md             # Detailed setup guide
│   ├── QUICKSTART.md        # Quick start guide
│   ├── IMPLEMENTATION.md    # Feature roadmap
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Firebase account

### 1. Install Dependencies
```bash
cd barbershop-saas
npm install
```

### 2. Set Up Firebase

Create a Firebase project and get your credentials. Then:

```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local`.

### 3. Configure Firebase Realtime Database

Set these security rules in your Firebase console:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child($uid).child('role').val() === 'owner'",
        ".write": "$uid === auth.uid || root.child('users').child($uid).child('role').val() === 'owner'"
      }
    },
    "workers": {
      ".read": true,
      "$workerId": {
        ".write": "root.child('users').child(auth.uid).child('role').val() === 'owner'"
      }
    },
    "services": {
      ".read": true,
      "$serviceId": {
        ".write": "root.child('users').child(auth.uid).child('role').val() === 'owner'"
      }
    },
    "appointments": {
      ".read": "auth != null",
      "$appointmentId": {
        ".write": "root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('appointments').child($appointmentId).child('customerId').val() === auth.uid || root.child('appointments').child($appointmentId).child('workerId').val() === auth.uid"
      }
    }
  }
}
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

### 5. Test the App

**Create test accounts:**

1. **Owner Account** - Register with role "Owner"
2. **Worker Account** - Register with role "Worker"  
3. **Customer Account** - Register with role "Customer"

Then explore the different dashboards!

## 🎨 Customizing Branding

Edit `src/config/branding.ts` to customize:

```typescript
export const branding = {
  shopName: 'Your Shop Name',
  tagline: 'Your tagline',
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    // ... more colors
  },
  logo: '✂️', // or URL to image
  dateFormat: 'dd/MM/yyyy HH:mm a',
};
```

All styling uses Tailwind CSS classes and references this config for colors.

## 📋 Features

### ✅ Core Features (Complete)
- **Authentication & Authorization** - Multi-role system (Owner, Worker, Customer)
- **Protected routes** with role-based access control
- **Owner Dashboard** with full CRUD operations for workers, services, and appointments
  - View worker details with appointment counts and services offered
  - Callable phone and email for easy worker contact
  - Customer management with search and contact links
  - Appointment management with customer information display
  - Real-time statistics and analytics
- **Worker Dashboard** with appointment management
  - Real-time statistics (earnings, pending, upcoming appointments)
  - Schedule configuration with working hours per day
  - Appointment approval and completion tracking
  - Password management on first login
- **Customer Portal** for browsing and booking
  - Browse barbers with search and filters
  - 3-step booking flow (services → date/time → review)
  - Only upcoming time slots available for same-day bookings
  - Appointment management (view, cancel, reschedule)
- **Advanced Appointment Management**
  - Double-booking prevention
  - Reschedule functionality (modifies existing appointments)
  - Status tracking (pending, approved, completed, cancelled)
  - Revenue calculation (completed appointments only)
- **Login & Registration pages** for all user roles
- **Toast notifications** system for feedback
- **UI component library** (Button, Card, Input, Badge, Dialog)
- **Type-safe with TypeScript** - Strict mode enabled
- **Firebase Integration** - Real-time database and authentication
- **Standardized Date Formatting** across entire application
- **Callable Contacts** - Phone and email links throughout the app
- **Default Worker Schedule** - 11 AM to 9 PM, Monday off

### 📝 Documentation

- **[QUICKSTART.md](./barbershop-saas/QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP.md](./barbershop-saas/SETUP.md)** - Detailed setup & deployment guide
- **[IMPLEMENTATION.md](./barbershop-saas/IMPLEMENTATION.md)** - Feature roadmap & developer guide

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **Forms:** React Hook Form + Zod validation
- **Routing:** React Router DOM
- **Database:** Firebase Realtime Database
- **Auth:** Firebase Authentication
- **Components:** Custom built + Radix UI
- **Charts:** Recharts
- **Icons:** Lucide React

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

Then add your Firebase credentials as environment variables in Vercel.

### Deploy to Other Platforms
The app is a standard Vite build. Deploy the `dist/` folder to:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting

## 🗄️ Database Schema

```
users/
  $userId/
    id, name, email, phone, role

workers/
  $workerId/
    userId, name, email, phone, bio, workingHours

services/
  $serviceId/
    workerId, name, description, duration, price

customers/
  $customerId/
    userId, name, email, phone, appointmentsCount

appointments/
  $appointmentId/
    customerId, workerId, selectedServices[], dateTime,
    totalPrice, totalDuration, status, notes, createdAt
```

## 🔒 Security

- ✅ Firebase Authentication for secure login
- ✅ Role-based route protection
- ✅ Firebase Realtime Database security rules
- ✅ Input validation with Zod
- ✅ Environment variables for secrets
- ✅ Type-safe with TypeScript

## 🧪 Testing Workflow

1. **Owner Account:** Manage workers, services, and view analytics
2. **Worker Account:** View and approve appointments
3. **Customer Account:** Browse barbers and book appointments

Test each user type to ensure proper role-based access and functionality.

## 📞 Support & Troubleshooting

### Common Issues

**Firebase Connection Failed**
- Check `.env.local` has correct credentials
- Verify Realtime Database is enabled
- Check browser console for errors

**Styling Not Applied**
- Restart dev server
- Clear browser cache
- Verify Tailwind CSS is imported in `index.css`

**Authentication Issues**
- Verify Firebase Authentication is enabled
- Check security rules in Firebase console
- Ensure user exists in authentication

## 🚀 Next Steps (Phase 2)

1. **Customer Notifications:** Email/SMS confirmations and reminders
2. **Advanced Analytics:** Monthly revenue charts, service popularity
3. **Export Functionality:** CSV/PDF reports for business intelligence
4. **Appointment Notes:** Enhanced communication between staff and customers
5. **Customer Feedback System:** Reviews and ratings for services
6. **Payment Processing:** Stripe/Fawry integration for online payments
7. **Google Calendar Sync:** Synchronize appointments with external calendars
8. **Dark Mode:** Theme toggle for user preference
9. **Internationalization:** Multi-language support

## 📊 MVP Status

**BarberHub MVP is COMPLETE and PRODUCTION-READY** ✅

All core features have been implemented, tested, and optimized:
- ✅ Full authentication system with three user roles
- ✅ Comprehensive owner dashboard with analytics
- ✅ Worker management and scheduling
- ✅ Customer booking and appointment management
- ✅ Revenue tracking and reporting
- ✅ Date/time standardization
- ✅ Contact integration (callable phone and email)
- ✅ Responsive design for all devices

The system is ready for deployment and real-world use. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for complete feature list and technical details.

## 📄 License

MIT - Feel free to use this for your business!

## 👨‍💻 Development

### Available Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Check TypeScript types
npm run lint         # Lint code
```

### Project Standards

- **TypeScript:** Strict mode enabled
- **Naming:** camelCase for files, PascalCase for components
- **Components:** Functional components with hooks
- **Styling:** Tailwind CSS classes
- **Validation:** Zod schemas for all forms
- **Formatting:** Type-only imports where applicable

## 💡 Tips for Customization

1. **Change Colors:** Edit `src/config/branding.ts`
2. **Add Pages:** Create in `src/pages/` and add route to `App.tsx`
3. **Modify Components:** All components are in `src/components/`
4. **Firebase:** Update rules and structure in Firebase console
5. **Deployment:** Follow [SETUP.md](./barbershop-saas/SETUP.md) for deployment instructions

---

**Built with ❤️ for barbershop owners everywhere. Ready to scale your business!**
