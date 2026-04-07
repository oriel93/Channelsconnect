# Channels Connect Frontend

React frontend application with Vite, TailwindCSS, and Supabase authentication.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS 3
- **UI Components**: Radix UI
- **Authentication**: Supabase Auth
- **HTTP Client**: Axios
- **Routing**: React Router 7
- **Forms**: React Hook Form + Zod
- **Language**: JavaScript/JSX

## Getting Started

### Prerequisites

- Node.js 18+
- API server running at http://localhost:3001
- Supabase account

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### Development

```bash
# Start dev server
npm run dev
```

App will be available at http://localhost:5173

### Building for Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

## Project Structure

```
app/
├── api/                   # API compatibility layer
│   ├── entities.js       # Entity wrappers
│   └── functions.js      # Function wrappers
├── components/
│   ├── agent/           # AI Assistant components
│   ├── app/             # App layout
│   ├── assistant/       # Help components
│   ├── auth/            # Authentication
│   ├── calendar/        # Calendar components
│   ├── channels/        # Channel management
│   ├── dashboard/       # Dashboard components
│   ├── import/          # Import functionality
│   ├── listings/        # Listing components
│   ├── marketing/       # Marketing pages
│   ├── pricing/         # Pricing components
│   ├── pwa/             # PWA installer
│   ├── translation/     # i18n components
│   └── ui/              # Reusable UI components
├── hooks/
│   └── use-mobile.jsx   # Mobile detection hook
├── lib/
│   ├── apiClient.js     # API client with auth
│   ├── supabase.js      # Supabase auth client
│   ├── utils.js         # Utility functions
│   └── generated/       # Auto-generated types
├── pages/               # Route pages
├── utils/               # Utilities
├── App.jsx              # App component
├── main.jsx             # Entry point
├── index.css            # Global styles
├── Dockerfile          # Production Dockerfile
├── Dockerfile.dev      # Development Dockerfile
└── package.json
```

## Key Features

### Authentication (Supabase)

```javascript
import { authHelpers } from '@/lib/supabase';

// Sign in with Google
await authHelpers.signInWithGoogle(redirectUrl);

// Sign in with email/password
await authHelpers.signIn(email, password);

// Get current user
const { user } = await authHelpers.getUser();

// Sign out
await authHelpers.signOut();
```

### API Client

```javascript
import { api } from '@/lib/apiClient';

// Listings
const listings = await api.listings.getAll();
const listing = await api.listings.getById(id);
await api.listings.create(data);

// Bookings
const bookings = await api.bookings.getAll();
await api.bookings.create(data);

// Calendar
await api.calendar.updateRate(data);
await api.calendar.blockDate(data);
```

### Compatibility Layer

For backward compatibility with existing components:

```javascript
// Old base44 API style still works
import { Listing, Booking } from '@/api/entities';
import { getDashboardData } from '@/api/functions';

const listings = await Listing.find();
const data = await getDashboardData();
```

## Type Generation

Generate TypeScript types from the backend API:

```bash
# Make sure API is running first
npm run generate-api-types
```

This creates `lib/generated/api-types.ts` with:
- Entity interfaces
- Endpoint types
- Request/response types

## Styling

### TailwindCSS

Utility-first CSS framework with custom configuration.

### Component Library

Uses Radix UI primitives with custom styling:
- Button, Dialog, Dropdown, Select
- Accordion, Tabs, Tooltip
- Form components
- And more...

### Theme

- Light/dark mode support
- Custom color palette
- Responsive breakpoints

## Routing

React Router 7 for client-side routing:

```
/ - Home/landing page
/dashboard - Main dashboard
/listings - Property listings
/bookings - Booking management
/channels - Channel configuration
/calendar - Calendar view
And more...
```

## Docker

### Development

```bash
# Build
docker build -f Dockerfile.dev -t channelsconnect-app-dev .

# Run
docker run -p 5173:5173 --env-file .env channelsconnect-app-dev
```

### Production

```bash
# Build
docker build -t channelsconnect-app .

# Run (serves on port 80)
docker run -p 80:80 --env-file .env channelsconnect-app
```

Production uses Nginx to serve static files.

## Code Quality

```bash
# Lint
npm run lint

# Fix lint issues
npm run lint -- --fix
```

## Common Tasks

### Adding a New Page

1. Create page component in `pages/`
2. Add route in `main.jsx`
3. Add navigation link in `AppLayout.jsx`

### Adding a New Component

1. Create component in appropriate `components/` subdirectory
2. Export from index if needed
3. Import and use in pages

### Using API Endpoints

1. Check `lib/apiClient.js` for available methods
2. Use in components with error handling
3. Handle loading states

## Environment Modes

- **Development**: Hot reload, source maps
- **Production**: Minified, optimized

## Troubleshooting

### Port Already in Use

Change Vite port in `vite.config.js` or run:
```bash
npm run dev -- --port 5174
```

### API Connection Errors

1. Verify API is running at `VITE_API_URL`
2. Check CORS configuration in API
3. Verify authentication token is valid

### Supabase Auth Issues

1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify OAuth provider is enabled in Supabase
3. Check redirect URLs are configured

### Build Errors

```bash
# Clear cache
rm -rf node_modules dist .vite
npm install
npm run build
```

## Performance

- Code splitting by route
- Lazy loading of components
- Image optimization
- Caching strategies

## PWA Support

Progressive Web App features:
- Installable
- Offline support (coming soon)
- Push notifications (coming soon)

## Contributing

1. Create feature branch
2. Follow component patterns
3. Test in development
4. Submit pull request

## License

Private - All rights reserved

