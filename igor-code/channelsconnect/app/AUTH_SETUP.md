# Authentication Setup Guide

## Overview

The application uses **Supabase Authentication** with support for:
- ✅ **Email/Password** (Default)
- ✅ **Google OAuth** (Optional)

## Architecture

### Authentication Flow

1. **Protected Routes** → Check if user is authenticated
2. **Not Authenticated** → Redirect to `/login` page
3. **Login Page** → User can choose:
   - Email/Password login (default)
   - Google OAuth login
4. **After Login** → Redirect back to original page

### Key Files

```
app/
├── pages/
│   └── Login.jsx                    # New centralized login page
├── components/
│   └── auth/
│       ├── NewLoginRequired.jsx     # Auth guard (redirects to /login)
│       ├── LoginRequired.jsx        # Wrapper (uses NewLoginRequired)
│       └── EmailSignup.jsx          # Email signup form component
└── lib/
    └── supabase.js                  # Supabase client & auth helpers
```

## Features

### Login Page (`/login`)

**Default: Email/Password Authentication**
- Email input
- Password input
- Sign in / Sign up toggle
- Form validation
- Error handling
- Success messages

**Optional: Google OAuth**
- "Continue with Google" button
- Automatic redirect to Google
- Returns to original page after authentication

### Protected Routes

Any component wrapped with `<NewLoginRequired>` or `<LoginRequired>` will:
1. Check if user is authenticated
2. If not → redirect to `/login?redirect=/current-page`
3. After login → redirect back to `/current-page`

## Setup Instructions

### 1. Configure Supabase

Create a `.env` file in the `app/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
```

**Get your credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add redirect URLs:
   ```
   Development: http://localhost:5173
   Production: https://yourdomain.com
   ```

### 3. Enable Email Authentication

In Supabase Dashboard:
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email templates (optional)
4. Enable email confirmation (recommended)

## Usage Examples

### Protecting a Page

```jsx
import NewLoginRequired from '@/components/auth/NewLoginRequired';

export default function Dashboard() {
  return (
    <NewLoginRequired>
      <div>
        {/* Your protected content */}
      </div>
    </NewLoginRequired>
  );
}
```

### Getting Current User

```jsx
import { authHelpers } from '@/lib/supabase';

// Get current user
const { user, error } = await authHelpers.getUser();

// Get session
const { session, error } = await authHelpers.getSession();

// Listen to auth changes
authHelpers.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});
```

### Sign Out

```jsx
import { authHelpers } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

function SignOutButton() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authHelpers.signOut();
    navigate('/login');
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

## API Reference

### Auth Helpers

```javascript
import { authHelpers } from '@/lib/supabase';

// Sign up with email
authHelpers.signUp(email, password, { full_name: 'John Doe' })

// Sign in with email
authHelpers.signIn(email, password)

// Sign in with Google
authHelpers.signInWithGoogle(redirectTo)

// Sign out
authHelpers.signOut()

// Get current user
authHelpers.getUser()

// Get session
authHelpers.getSession()

// Listen to auth state changes
authHelpers.onAuthStateChange(callback)
```

## User Experience

### Email/Password Flow

1. User visits protected page → `/dashboard`
2. Not authenticated → redirected to `/login?redirect=/dashboard`
3. **Default view:** Email/Password form is shown
4. User enters email & password
5. Click "Sign In" or "Create Account"
6. On success → redirected to `/dashboard`

### Google OAuth Flow

1. User clicks "Continue with Google"
2. Redirected to Google consent screen
3. After approval → redirected back to app
4. User is authenticated
5. Redirected to original page (from `?redirect` parameter)

### Sign Up Flow

1. User toggles to "Sign up" mode
2. Fills in:
   - Full name
   - Email
   - Password
   - Confirm password
3. Submits form
4. Receives verification email
5. Clicks verification link
6. Account is activated
7. Can now sign in

## Security Notes

1. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in frontend
2. Use `SUPABASE_ANON_KEY` for client-side operations
3. Backend API validates JWT tokens
4. Row Level Security (RLS) in Supabase enforces data access
5. Passwords are hashed by Supabase
6. Email verification is recommended

## Troubleshooting

### "Missing Supabase environment variables"

**Solution:** Create `.env` file with correct variables.

### Google OAuth not working

**Solutions:**
1. Check Google OAuth credentials in Supabase
2. Verify redirect URLs are correct
3. Ensure Google provider is enabled

### Email not sending

**Solutions:**
1. Check Supabase email settings
2. Verify email templates are configured
3. Check spam folder

### User not staying logged in

**Solutions:**
1. Check browser cookies are enabled
2. Verify session persistence settings
3. Check token expiration time

## Testing

### Test Email/Password

```bash
# Visit login page
http://localhost:5173/login

# Try signing up with:
Email: test@example.com
Password: password123

# Check email for verification link
```

### Test Google OAuth

```bash
# Visit login page
http://localhost:5173/login

# Click "Continue with Google"
# Sign in with Google account
# Should redirect back to app
```

### Test Protected Routes

```bash
# Visit protected page without login
http://localhost:5173/dashboard

# Should redirect to:
http://localhost:5173/login?redirect=/dashboard

# After login, should redirect back to:
http://localhost:5173/dashboard
```

## Migration from Old System

If you were using the old `base44` authentication:

1. ✅ **Removed:** base44 login system
2. ✅ **Added:** Supabase authentication
3. ✅ **Updated:** All protected components use new auth
4. ✅ **Maintained:** Same user experience
5. ⚠️ **Note:** Existing users need to re-register

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs/guides/auth
- Review this guide
- Check browser console for errors
- Verify environment variables are set correctly


