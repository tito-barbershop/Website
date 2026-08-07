# BarberHub - Barbershop Management System

Production-ready MVP for a white-label barbershop booking platform.

## Features

- **Multi-role authentication**: Owner (Admin), Worker (Barber), Customer
- **Owner Dashboard**: Manage workers, services, appointments, and view analytics
  - View worker details with appointment counts and services offered
  - Clickable phone and email for easy worker contact
  - Customer management with callable phone and email
  - Appointment management with customer information displayed
- **Worker Dashboard**: View and manage their appointments
  - Real-time statistics (earnings, pending, upcoming appointments)
  - Schedule management with working hours configuration
  - Appointment approval and completion tracking
- **Customer Portal**: Browse barbers, book appointments, view appointment history
  - 3-step booking flow with service selection
  - Date/time selection with only upcoming time slots
  - Appointment rescheduling and cancellation
- **Real-time updates** via Firebase Realtime Database
- **Responsive design** for desktop, tablet, and mobile
- **Professional UI** with shadcn/ui components and Tailwind CSS
- **Standardized date formatting** across the entire application
- **Revenue tracking** - Only completed appointments count toward revenue
- **Callable contacts** - Phone and email links throughout the app

## Tech Stack

- React 18+ with Vite
- TypeScript
- Tailwind CSS
- React Router DOM
- React Hook Form + Zod validation
- Firebase Authentication & Realtime Database
- Recharts for analytics

## Setup

### Prerequisites

- Node.js 16+ and npm
- Firebase project (create at https://firebase.google.com)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a `.env.local` file from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Firebase credentials to `.env.local`

3. Set up Firebase Realtime Database security rules:

```json
{
  "rules": {
    "shopConfig": {
      ".read": true,
      "currentOwnerId": {
        ".write": "root.child('users').child(auth.uid).child('role').val() === 'owner'"
      }
    },
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
    },
    "customers": {
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'owner'",
      "$customerId": {
        ".write": "$customerId === auth.uid"
      }
    }
  }
}
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Firebase Database Structure

```
users/
  $userId/
    id: string
    name: string
    email: string
    phone: string
    role: 'owner' | 'worker' | 'customer'

workers/
  $workerId/
    id: string
    userId: string
    name: string
    email: string
    phone: string
    bio: string
    workingHours:
      monday: { start: "09:00", end: "18:00", isOpen: boolean }
      tuesday: { ... }
      wednesday: { ... }
      thursday: { ... }
      friday: { ... }
      saturday: { ... }
      sunday: { ... }

services/
  $serviceId/
    id: string
    workerId: string
    name: string
    description: string
    duration: number (minutes)
    price: number

customers/
  $customerId/
    id: string
    userId: string
    name: string
    email: string
    phone: string
    appointmentsCount: number

appointments/
  $appointmentId/
    id: string
    customerId: string
    workerId: string
    selectedServices: string[] (serviceIds)
    dateTime: number (timestamp)
    totalPrice: number
    totalDuration: number
    status: 'pending' | 'approved' | 'completed' | 'cancelled'
    notes: string
    createdAt: number (timestamp)
```

## Test Accounts

Create these accounts for testing:

**Owner Account:**
- Email: owner@example.com
- Password: password123
- Role: Owner

**Worker Account:**
- Email: worker@example.com
- Password: password123
- Role: Worker

**Customer Account:**
- Email: customer@example.com
- Password: password123
- Role: Customer

## Customizing Branding

Edit `src/config/branding.ts` to customize:
- Shop name
- Tagline
- Color palette
- Logo (emoji or URL)
- Date format

```typescript
export const branding = {
  shopName: 'Your Shop Name',
  tagline: 'Your tagline',
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#3b82f6',
    // ...
  },
  logo: '✂️',
  dateFormat: 'dd/MM/yyyy HH:mm a',
};
```

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

## Deploy to Vercel

### Option 1: Using Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Environment Variables in Vercel

Add these to your Vercel project settings:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   └── ProtectedRoute.tsx
├── config/
│   ├── branding.ts      # Branding configuration
│   └── firebase.ts      # Firebase setup
├── contexts/
│   └── ToastContext.tsx  # Global toast notifications
├── hooks/
│   ├── useAuth.ts       # Authentication hook
│   └── useFirebase.ts   # Firebase data hook
├── lib/
│   ├── auth.ts          # Authentication functions
│   └── utils.ts         # Utility functions
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── HomePage.tsx
│   ├── CustomerHomePage.tsx
│   ├── BookingPage.tsx
│   ├── CustomerAppointmentsPage.tsx
│   ├── OwnerDashboard.tsx
│   └── WorkerDashboard.tsx
├── types/
│   └── index.ts         # TypeScript types
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## Features Roadmap

### Phase 1 (✅ Complete)
- ✅ Authentication & Authorization (Owner, Worker, Customer roles)
- ✅ Basic routing with protected routes
- ✅ Owner Dashboard with full CRUD operations
- ✅ 3-step booking flow for customers
- ✅ Worker management and authentication
- ✅ Appointment management (create, view, approve, complete, cancel)
- ✅ Worker schedule configuration
- ✅ Customer appointments viewing and management
- ✅ Customer reschedule functionality
- ✅ Default working hours for new workers (11 AM - 9 PM)
- ✅ Revenue tracking (completed appointments only)
- ✅ Unified date formatting across application
- ✅ Callable phone and email throughout dashboard
- ✅ Customer information display in admin appointments
- ✅ Worker card enhancement with statistics

### Phase 2 (Next)
- ✅ Customer notifications (appointment confirmations)
- [ ] Appointment reminders (email/SMS)
- ✅ Email integration for notifications
- [ ] SMS notifications via Twilio
- ✅ Advanced analytics (charts, monthly revenue, service popularity)
- [ ] Export functionality (CSV/PDF reports)
- [ ] Customer feedback system

### Phase 3 (Future)
- [ ] Dark mode
- [ ] Internationalization (multi-language support)
- [ ] Payment processing (Fawry/Paymob integration)
- [ ] Review/rating system
- [ ] Google Calendar sync
- [ ] Staff performance metrics
- [ ] Waiting list management
- [ ] Automated rebooking on cancellations

## Development

### Format Code

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## Troubleshooting

### Firebase Connection Issues

1. Verify your Firebase credentials in `.env.local`
2. Check Firebase project security rules
3. Ensure Realtime Database is enabled in Firebase console

### Authentication Not Working

1. Check Firebase Authentication settings
2. Verify auth providers are enabled
3. Check browser console for errors

### Styling Issues

1. Ensure Tailwind CSS is imported in `index.css`
2. Clear `node_modules` and reinstall: `npm install`
3. Rebuild: `npm run build`

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
