# Supabase Auth Webhook Setup Guide

This guide explains how to set up the Supabase "Before User Created" auth hook to validate user signups before they're created in the database.

## Overview

Instead of using database triggers, we use Supabase's **Before User Created** auth hook, which:
- ✅ Runs BEFORE a user is created in `auth.users`
- ✅ Can validate and reject signups
- ✅ Creates user profile in `public.users` table
- ✅ Provides full control over signup policies
- ✅ Works via HTTPS webhook to your backend

## Architecture

```
User Signs Up
    ↓
Supabase Auth receives signup
    ↓
🔄 Supabase calls your webhook (BEFORE creating user)
    ↓
Your API validates the signup
    ↓
Your API creates profile in public.users
    ↓
Return {} to allow OR {error: ...} to reject
    ↓
If allowed: Supabase creates user in auth.users
    ↓
✅ User is ready! (profile already exists in public.users)
```

## Setup Instructions

### Step 1: Add Webhook Secret to Environment

Add the webhook secret to your `api/.env` file:

```env
# Supabase Auth Webhook
SUPABASE_WEBHOOK_SECRET=v1,whsec_r7eL+9bA8RbcrPfeaNxlyhtj+ygBgTivgGS0A9xfjdVi4rx2hGaQbyg+kddb7CjL4H7DrCJ3eOHQtrKU
```

### Step 2: Configure Supabase Auth Hook

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Hooks**
3. Click **Add Auth Hook** or **Enable Before User Created hook**
4. Configure:

```
Hook Type: HTTPS
URL: https://your-api-domain.com/users/webhooks/before-user-created
Secret: v1,whsec_r7eL+9bA8RbcrPfeaNxlyhtj+ygBgTivgGS0A9xfjdVi4rx2hGaQbyg+kddb7CjL4H7DrCJ3eOHQtrKU
```

For local development:
```
URL: http://localhost:3001/users/webhooks/before-user-created
```

**Important:** For local testing, you may need to use a tunneling service like:
- ngrok: `ngrok http 3001`
- localtunnel: `lt --port 3001`
- Supabase CLI local development

### Step 3: Deploy Your API

Make sure your API is deployed and accessible from Supabase:

```bash
# Build and run
cd api
npm run build
npm run start:prod
```

### Step 4: Create User Profile After Signup

In your frontend, after successful signup, create the user profile:

```typescript
// Sign up the user
const { data: authData, error: signupError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
    },
  },
});

if (signupError) {
  // Handle signup error (could be rejected by webhook)
  console.error('Signup failed:', signupError.message);
  return;
}

// ✅ User profile is ALREADY created in public.users by the webhook!
// You can immediately use the user
if (authData.user) {
  console.log('User created:', authData.user.id);
  // Fetch user profile from /users/me if needed
  const { data: profile } = await api.users.me();
  console.log('User profile:', profile);
}
```

## Webhook Endpoint

The webhook endpoint is located at:
```
POST /users/webhooks/before-user-created
```

**What it does:**
1. Validates the signup (email domain, IP, etc.)
2. Creates user profile in `public.users`
3. Returns `{}` to allow or `{error: ...}` to reject

**Request Headers:**
```
Content-Type: application/json
x-webhook-signature: v1,<signature>
```

**Request Body:**
```json
{
  "metadata": {
    "uuid": "8b34dcdd-9df1-4c10-850a-b3277c653040",
    "time": "2025-04-29T13:13:24.755552-07:00",
    "name": "before-user-created",
    "ip_address": "127.0.0.1"
  },
  "user": {
    "id": "ff7fc9ae-3b1b-4642-9241-64adb9848a03",
    "aud": "authenticated",
    "role": "",
    "email": "user@example.com",
    "phone": "",
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "full_name": "John Doe"
    },
    "identities": [],
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "is_anonymous": false
  }
}
```

**Success Response (Allow Signup):**
```json
{}
```
or HTTP 204 No Content

**Error Response (Reject Signup):**
```json
{
  "error": {
    "http_code": 403,
    "message": "Signups from disposable email providers are not allowed."
  }
}
```

## Validation Rules

The webhook currently implements these validation rules:

### 1. Block Disposable Email Domains

Automatically blocks signups from temporary email services:
- tempmail.com
- guerrillamail.com
- mailinator.com
- 10minutemail.com
- throwaway.email

### 2. Custom Rules (Examples)

You can add more rules in `users.service.ts` → `validateUserSignup()`:

```typescript
// Example: Require specific email domain
if (email && !email.endsWith('@yourcompany.com')) {
  return {
    allowed: false,
    reason: 'Only company emails are allowed to sign up.',
    httpCode: 403,
  };
}

// Example: Block specific IP addresses
const blockedIps = ['192.168.1.1'];
if (blockedIps.includes(metadata.ip_address)) {
  return {
    allowed: false,
    reason: 'Signups from this IP address are not allowed.',
    httpCode: 403,
  };
}

// Example: Check against external API
const isBlacklisted = await checkBlacklist(email);
if (isBlacklisted) {
  return {
    allowed: false,
    reason: 'This email address is not allowed to sign up.',
    httpCode: 403,
  };
}
```

## Testing

### Test the Webhook Locally

1. Start your API:
```bash
cd api
npm run start:dev
```

2. Use curl or Postman to test:
```bash
curl -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "uuid": "test-uuid",
      "time": "2025-12-19T14:00:00Z",
      "name": "before-user-created",
      "ip_address": "127.0.0.1"
    },
    "user": {
      "id": "test-user-id",
      "aud": "authenticated",
      "role": "",
      "email": "test@example.com",
      "phone": "",
      "app_metadata": {
        "provider": "email",
        "providers": ["email"]
      },
      "user_metadata": {},
      "identities": [],
      "created_at": "2025-12-19T14:00:00Z",
      "updated_at": "2025-12-19T14:00:00Z",
      "is_anonymous": false
    }
  }'
```

### Test with Disposable Email (Should Be Rejected)

```bash
curl -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "uuid": "test-uuid",
      "time": "2025-12-19T14:00:00Z",
      "name": "before-user-created",
      "ip_address": "127.0.0.1"
    },
    "user": {
      "id": "test-user-id",
      "aud": "authenticated",
      "role": "",
      "email": "test@tempmail.com",
      "phone": "",
      "app_metadata": {
        "provider": "email",
        "providers": ["email"]
      },
      "user_metadata": {},
      "identities": [],
      "created_at": "2025-12-19T14:00:00Z",
      "updated_at": "2025-12-19T14:00:00Z",
      "is_anonymous": false
    }
  }'
```

Expected response:
```json
{
  "error": {
    "http_code": 403,
    "message": "Signups from disposable email providers are not allowed."
  }
}
```

### Test End-to-End Signup

1. Try to sign up with a valid email - should succeed
2. Try to sign up with `test@tempmail.com` - should fail with error message
3. Check Supabase logs to see webhook calls
4. Check your API logs for webhook processing

## Monitoring

### Check Webhook Logs

Your API will log all webhook calls:

```
[UsersService] Received Before User Created webhook { userId: '...', email: '...', metadata: {...} }
[UsersService] User signup allowed { email: 'user@example.com' }
```

or

```
[UsersService] User signup rejected: Signups from disposable email providers are not allowed. { email: 'test@tempmail.com' }
```

### Supabase Dashboard

Go to **Authentication** → **Hooks** → **Logs** to see:
- Webhook calls
- Response status codes
- Error messages
- Execution times

## Security Considerations

### 1. Webhook Signature Verification

The endpoint verifies webhook signatures using HMAC-SHA256:

```typescript
const hmac = crypto
  .createHmac('sha256', secretValue)
  .update(payload)
  .digest('base64');
```

This ensures webhooks are actually from Supabase.

### 2. Rate Limiting

Consider adding rate limiting to prevent abuse:

```typescript
@Throttle(10, 60) // 10 requests per minute
@Post('webhooks/before-user-created')
async handleBeforeUserCreated(...) {
  // ...
}
```

### 3. IP Allowlisting

For production, consider allowing webhooks only from Supabase IPs.

## Troubleshooting

### Webhook Not Being Called

1. Check your API is accessible from the internet
2. Verify the URL in Supabase Dashboard
3. Check API logs for incoming requests
4. Use ngrok/localtunnel for local testing

### Signature Verification Failing

1. Ensure `SUPABASE_WEBHOOK_SECRET` matches Supabase Dashboard
2. Secret must include the `v1,whsec_` prefix
3. Check that body is not modified before verification

### Signups Still Going Through Despite Rejection

1. Check that you're returning the correct error format
2. Verify HTTP status code (should be 4xx)
3. Check Supabase hook logs for actual responses

### All Signups Being Blocked

1. Check validation logic in `validateUserSignup()`
2. Review API logs for specific rejection reasons
3. Temporarily return `{ allowed: true }` to debug

## Production Checklist

- [ ] API deployed and accessible from internet
- [ ] `SUPABASE_WEBHOOK_SECRET` configured in production
- [ ] Webhook URL updated in Supabase Dashboard
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Tested end-to-end signup flow
- [ ] Tested rejection scenarios
- [ ] Checked webhook logs in Supabase
- [ ] Documented custom validation rules

## References

- [Supabase Auth Hooks Documentation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created)
- [Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created)
- [Auth Hook Examples](https://github.com/supabase/supabase/tree/master/examples/auth/auth-hooks)

---

**Status:** ✅ Ready for Production

The webhook endpoint is fully implemented and ready to validate user signups!
