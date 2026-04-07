# Test Webhook Endpoints

## Test Before User Created (Should Allow)

```bash
curl -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "uuid": "test-uuid-123",
      "time": "2025-12-19T14:00:00Z",
      "name": "before-user-created",
      "ip_address": "127.0.0.1"
    },
    "user": {
      "id": "user-test-123",
      "aud": "authenticated",
      "role": "",
      "email": "test@example.com",
      "phone": "",
      "app_metadata": {
        "provider": "email",
        "providers": ["email"]
      },
      "user_metadata": {
        "full_name": "Test User"
      },
      "identities": [],
      "created_at": "2025-12-19T14:00:00Z",
      "updated_at": "2025-12-19T14:00:00Z",
      "is_anonymous": false
    }
  }'
```

**Expected Response:**
```json
{}
```

## Test Before User Created (Should Reject - Disposable Email)

```bash
curl -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "uuid": "test-uuid-456",
      "time": "2025-12-19T14:00:00Z",
      "name": "before-user-created",
      "ip_address": "127.0.0.1"
    },
    "user": {
      "id": "user-test-456",
      "aud": "authenticated",
      "role": "",
      "email": "spam@tempmail.com",
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

**Expected Response:**
```json
{
  "error": {
    "http_code": 403,
    "message": "Signups from disposable email providers are not allowed."
  }
}
```

## Test After User Created

```bash
curl -X POST http://localhost:3001/users/webhooks/after-user-created \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "uuid": "test-uuid-789",
      "time": "2025-12-19T14:00:00Z",
      "name": "after-user-created",
      "ip_address": "127.0.0.1"
    },
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "aud": "authenticated",
      "role": "",
      "email": "newuser@example.com",
      "phone": "",
      "app_metadata": {
        "provider": "email",
        "providers": ["email"]
      },
      "user_metadata": {
        "full_name": "New User"
      },
      "identities": [],
      "created_at": "2025-12-19T14:00:00Z",
      "updated_at": "2025-12-19T14:00:00Z",
      "is_anonymous": false
    }
  }'
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "createdAt": "2025-12-19T14:00:00.000Z",
  "updatedAt": "2025-12-19T14:00:00.000Z"
}
```

## Run All Tests

Save this as `test-webhooks.sh`:

```bash
#!/bin/bash

echo "=== Testing Before User Created (Should Allow) ==="
curl -s -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"uuid":"test-1","time":"2025-12-19T14:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"user-1","aud":"authenticated","role":"","email":"test@example.com","phone":"","app_metadata":{"provider":"email","providers":["email"]},"user_metadata":{},"identities":[],"created_at":"2025-12-19T14:00:00Z","updated_at":"2025-12-19T14:00:00Z","is_anonymous":false}}' | jq .

echo -e "\n=== Testing Before User Created (Should Reject) ==="
curl -s -X POST http://localhost:3001/users/webhooks/before-user-created \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"uuid":"test-2","time":"2025-12-19T14:00:00Z","name":"before-user-created","ip_address":"127.0.0.1"},"user":{"id":"user-2","aud":"authenticated","role":"","email":"spam@tempmail.com","phone":"","app_metadata":{"provider":"email","providers":["email"]},"user_metadata":{},"identities":[],"created_at":"2025-12-19T14:00:00Z","updated_at":"2025-12-19T14:00:00Z","is_anonymous":false}}' | jq .

echo -e "\n✅ Tests Complete!"
```

Then run:
```bash
chmod +x test-webhooks.sh
./test-webhooks.sh
```
