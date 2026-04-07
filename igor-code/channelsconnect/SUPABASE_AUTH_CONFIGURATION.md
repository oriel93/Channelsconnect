# 🔐 Supabase Authentication Configuration

## ✅ What's Already Working

Your authentication system is **fully implemented**:

- ✅ **Login/Signup Pages** - Clean standalone pages (no header/footer)
- ✅ **Forgot Password Flow** - Complete with email reset link
- ✅ **Password Reset Page** - Secure password update
- ✅ **Google OAuth** - Ready to use
- ✅ **Database Trigger** - Auto-creates user profiles
- ✅ **No RLS** - Simplified access control

---

## 🎯 Supabase Configuration Required

### **Step 1: Disable Email Confirmation (Recommended for Dev)**

1. Go to: https://app.supabase.com/project/chtqliiuoordhmohtjon/auth/providers
2. Click on **"Email"** provider
3. Scroll down to **"Email Confirmations"**
4. **Toggle OFF:** "Enable email confirmations"
5. Click **Save**

**Result:** Users can login immediately after signup without email verification ✅

---

### **Step 2: Configure Redirect URLs**

#### A. Add Redirect URLs to Allowlist

1. Go to: https://app.supabase.com/project/chtqliiuoordhmohtjon/auth/url-configuration
2. Under **"Redirect URLs"**, add:
   ```
   http://localhost:5173/ResetPassword
   http://localhost:5173/AuthCallback
   http://localhost/ResetPassword
   http://localhost/AuthCallback
   https://yourdomain.com/ResetPassword
   https://yourdomain.com/AuthCallback
   ```
3. Click **Add URL** for each
4. Click **Save**

#### B. Configure Email Templates

1. Go to: https://app.supabase.com/project/chtqliiuoordhmohtjon/auth/templates
2. Click on **"Reset Password"** template
3. Verify the magic link goes to: `{{ .SiteURL }}/ResetPassword?token={{ .Token }}`
4. Customize the email template if needed:

```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

---

### **Step 3: Configure Google OAuth (Optional)**

If you want to use "Continue with Google":

1. Go to: https://app.supabase.com/project/chtqliiuoordhmohtjon/auth/providers
2. Click on **"Google"**
3. Enable Google provider
4. Add your **Google Client ID** and **Client Secret**
   - Get these from: https://console.cloud.google.com/apis/credentials
5. Add redirect URIs:
   ```
   https://chtqliiuoordhmohtjon.supabase.co/auth/v1/callback
   ```
6. Save

---

## 🔄 User Flows

### **Sign Up Flow** (No Email Confirmation)

```
1. User enters email + password on /Login (signup mode)
   ↓
2. Supabase creates account in auth.users
   ↓
3. Database trigger creates profile in public.users
   ↓
4. User is IMMEDIATELY logged in ✅
   ↓
5. User redirected to /Dashboard
```

**No email verification required!** ✅

---

### **Forgot Password Flow**

```
1. User clicks "Forgot Password?" on /Login
   ↓
2. Redirected to /ForgotPassword page
   ↓
3. User enters email address
   ↓
4. Supabase sends reset email with magic link
   ↓
5. User clicks link in email
   ↓
6. Redirected to /ResetPassword?token=xxx
   ↓
7. User enters new password
   ↓
8. Password updated, redirected to /Login
```

---

### **Login Flow**

```
1. User enters email + password on /Login
   ↓
2. Supabase validates credentials
   ↓
3. Returns JWT token
   ↓
4. User redirected to /Dashboard
```

---

## 📁 Implementation Files

### Frontend Pages (Already Complete ✅)

**Login/Signup:**
- File: `/app/pages/Login.jsx`
- Route: `/Login`
- Features: Email/password, Google OAuth, toggle signup/login

**Forgot Password:**
- File: `/app/pages/ForgotPassword.jsx`
- Route: `/ForgotPassword`
- Features: Email input, sends reset link

**Reset Password:**
- File: `/app/pages/ResetPassword.jsx`
- Route: `/ResetPassword`
- Features: New password form, validates token

**Auth Callback:**
- File: `/app/pages/AuthCallback.jsx`
- Route: `/AuthCallback`
- Features: Handles OAuth redirects

### Auth Configuration

**Supabase Client:**
- File: `/app/lib/supabase.js`
- Functions:
  - `signUp(email, password, additionalData)`
  - `signIn(email, password)`
  - `signInWithGoogle(redirectTo)`
  - `resetPasswordRequest(email)` ✅
  - `resetPassword(newPassword)` ✅
  - `signOut()`
  - `getUser()`
  - `getSession()`

---

## 🧪 Testing the Forgot Password Flow

### Test Steps:

1. **Start your app:**
   ```bash
   cd app
   npm run dev
   ```

2. **Go to login page:**
   ```
   http://localhost:5173/Login
   ```

3. **Click "Forgot Password?"** (should be in the password field area)

4. **Enter your email on `/ForgotPassword` page**

5. **Check your email** for the reset link
   - Link should be: `http://localhost:5173/ResetPassword?token=xxx`

6. **Click the link** - should take you to `/ResetPassword`

7. **Enter new password** and confirm

8. **Should redirect to `/Login`** with success message

---

## ⚠️ Important Notes

### 1. Email Configuration

Make sure Supabase can send emails:
- Go to: Settings > Auth > Email
- Verify SMTP settings (uses Supabase's email service by default)
- For production, configure custom SMTP (SendGrid, AWS SES, etc.)

### 2. Development vs Production

**Development (localhost):**
```env
# app/.env
VITE_SUPABASE_URL=https://chtqliiuoordhmohtjon.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

**Production:**
```env
# app/.env.production
VITE_SUPABASE_URL=https://chtqliiuoordhmohtjon.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-api.com
```

Update redirect URLs in Supabase for production domain!

### 3. Token Expiration

- Reset password tokens expire after **1 hour**
- JWT tokens expire based on Supabase settings (default: 1 hour)
- Refresh tokens expire after **30 days** (can be configured)

To change expiration:
1. Go to: Settings > Auth > General
2. Update "JWT expiry" and "Refresh token expiry"

---

## 🎨 Customizing Email Templates

### Reset Password Email

Go to: Auth > Email Templates > Reset Password

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>Hi there,</p>
    <p>You requested to reset your password for Channels Connect.</p>
    <p>Click the button below to create a new password:</p>
    <p><a href="{{ .ConfirmationURL }}" class="button">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <div class="footer">
      <p>Channels Connect - Property Management Platform</p>
    </div>
  </div>
</body>
</html>
```

### Welcome Email (Optional)

You can also customize the signup confirmation email if you enable email verification later.

---

## 🔒 Security Best Practices

### ✅ Already Implemented:

- JWT validation on every API request
- Password must be 6+ characters
- Automatic user profile creation via trigger
- Secure password reset with expiring tokens

### 🎯 Recommended:

1. **Rate Limiting:** Limit password reset requests (configure in Supabase)
2. **Password Strength:** Consider requiring stronger passwords
3. **2FA:** Add two-factor authentication (future enhancement)
4. **Session Management:** Implement logout on all devices

---

## 📊 Current Status

### ✅ Complete:
- Login/Signup pages
- Forgot password flow
- Password reset functionality
- Google OAuth integration
- Database auto-provisioning
- Standalone auth pages (no navigation)

### ⚠️ Configuration Needed:
1. Disable email confirmation in Supabase
2. Add redirect URLs to allowlist
3. Configure email templates (optional)
4. Set up Google OAuth (optional)

---

## 🚀 Quick Setup Checklist

```bash
# 1. Disable email confirmation
☐ Go to Supabase Auth Settings
☐ Toggle OFF "Enable email confirmations"

# 2. Add redirect URLs
☐ Add http://localhost:5173/ResetPassword
☐ Add http://localhost:5173/AuthCallback
☐ Add production URLs when deploying

# 3. Test the flow
☐ Sign up a new user (should login immediately)
☐ Test forgot password (should receive email)
☐ Test password reset (should work)
☐ Test login with new password

# 4. (Optional) Configure Google OAuth
☐ Get Google OAuth credentials
☐ Add to Supabase
☐ Test "Continue with Google"
```

---

## 🆘 Troubleshooting

### Issue: "Invalid reset token"
- **Cause:** Token expired (1 hour limit)
- **Fix:** Request a new reset link

### Issue: "Email not sent"
- **Cause:** SMTP not configured or Supabase email limits
- **Fix:** Check Supabase logs, configure custom SMTP

### Issue: "Redirect URL not allowed"
- **Cause:** URL not in Supabase allowlist
- **Fix:** Add URL in Auth > URL Configuration

### Issue: "User can't login after signup"
- **Cause:** Email confirmation required
- **Fix:** Disable email confirmation in Supabase settings

---

## 📚 References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Password Reset](https://supabase.com/docs/guides/auth/passwords)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

---

**Status:** ✅ Authentication system is complete and ready to use!

Just configure Supabase settings and you're good to go! 🚀

