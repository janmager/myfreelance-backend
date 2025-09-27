# Clients API Documentation

## Overview
This API provides endpoints for managing clients in the Freelenzy.com application. There are two sets of endpoints:
- **Admin endpoints** (`/api/admin/clients/*`) - Require admin privileges
- **User endpoints** (`/api/clients/*`) - Require user authentication

## Authentication
All endpoints require proper user verification:
- Admin endpoints require `admin_user_id` in payload and verify user has `type='admin'`
- User endpoints require `user_id` in payload and verify user has `type='user'` or `type='admin'`

## Database Schema
```sql
CREATE TABLE clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    country VARCHAR(100),
    nip VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);
```

---

## Admin Endpoints

### GET All Clients (Admin)
**Endpoint:** `POST /api/admin/clients/all`

**Description:** Retrieve all clients from all users (admin only)

**Request Body:**
```json
{
    "admin_user_id": "uuid-string"
}
```

**Response:**
```json
{
    "clients": [
        {
            "client_id": "uuid",
            "name": "Jan Kowalski",
            "email": "jan@example.com",
            "phone": "+48 123 456 789",
            "address": "ul. Przykładowa 123",
            "city": "Warszawa",
            "state": "Mazowieckie",
            "zip": "00-001",
            "status": "active",
            "country": "Polska",
            "nip": "1234567890",
            "created_at": "2023-10-26T10:00:00Z",
            "updated_at": "2023-10-26T10:00:00Z",
            "user_id": "uuid",
            "user_name": "User Name",
            "user_email": "user@example.com"
        }
    ]
}
```

### Edit Client (Admin)
**Endpoint:** `POST /api/admin/clients/edit`

**Description:** Edit any client (admin only)

**Request Body:**
```json
{
    "admin_user_id": "uuid-string",
    "client_id": "uuid-string",
    "name": "Updated Name",
    "email": "updated@example.com",
    "phone": "+48 999 888 777",
    "address": "New Address",
    "city": "New City",
    "state": "New State",
    "zip": "00-002",
    "status": "active",
    "country": "Polska",
    "nip": "9876543210"
}
```

**Response:**
```json
{
    "message": "Client updated successfully",
    "client": {
        "client_id": "uuid",
        "name": "Updated Name",
        "email": "updated@example.com",
        // ... other fields
    }
}
```

---

## User Endpoints

### Get Client by ID
**Endpoint:** `POST /api/clients/get`

**Description:** Get a specific client by ID (must belong to user unless admin)

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "client_id": "uuid-string"
}
```

**Response:**
```json
{
    "client": {
        "client_id": "uuid",
        "name": "Jan Kowalski",
        "email": "jan@example.com",
        "phone": "+48 123 456 789",
        "address": "ul. Przykładowa 123",
        "city": "Warszawa",
        "state": "Mazowieckie",
        "zip": "00-001",
        "status": "active",
        "country": "Polska",
        "nip": "1234567890",
        "created_at": "2023-10-26T10:00:00Z",
        "updated_at": "2023-10-26T10:00:00Z",
        "user_id": "uuid"
    }
}
```

### Get Clients by User ID
**Endpoint:** `POST /api/clients/list`

**Description:** Get all clients for a specific user

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "target_user_id": "uuid-string" // optional, defaults to user_id
}
```

**Response:**
```json
{
    "clients": [
        {
            "client_id": "uuid",
            "name": "Jan Kowalski",
            "email": "jan@example.com",
            // ... other fields
        }
    ]
}
```

### Archive Client
**Endpoint:** `POST /api/clients/archive`

**Description:** Set client status to 'archived'

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "client_id": "uuid-string"
}
```

**Response:**
```json
{
    "message": "Client archived successfully",
    "client": {
        "client_id": "uuid",
        "status": "archived",
        // ... other fields
    }
}
```

### Add Client
**Endpoint:** `POST /api/clients/add`

**Description:** Create a new client

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "phone": "+48 123 456 789",
    "address": "ul. Przykładowa 123",
    "city": "Warszawa",
    "state": "Mazowieckie",
    "zip": "00-001",
    "country": "Polska",
    "nip": "1234567890"
}
```

**Response:**
```json
{
    "message": "Client created successfully",
    "client": {
        "client_id": "uuid",
        "name": "Jan Kowalski",
        "email": "jan@example.com",
        // ... other fields
    }
}
```

### Edit Client
**Endpoint:** `POST /api/clients/edit`

**Description:** Edit a client (must belong to user unless admin)

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "client_id": "uuid-string",
    "name": "Updated Name",
    "email": "updated@example.com",
    "phone": "+48 999 888 777",
    "address": "New Address",
    "city": "New City",
    "state": "New State",
    "zip": "00-002",
    "country": "Polska",
    "nip": "9876543210"
}
```

**Response:**
```json
{
    "message": "Client updated successfully",
    "client": {
        "client_id": "uuid",
        "name": "Updated Name",
        "email": "updated@example.com",
        // ... other fields
    }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
    "error": "user_id and client_id are required"
}
```

### 403 Forbidden
```json
{
    "error": "Access denied. Admin privileges required."
}
```

### 404 Not Found
```json
{
    "error": "Client not found or access denied"
}
```

### 409 Conflict
```json
{
    "error": "Client with this email already exists"
}
```

### 500 Internal Server Error
```json
{
    "error": "Internal server error"
}
```

---

## Usage Examples

### JavaScript/Fetch
```javascript
// Get all clients for a user
const response = await fetch('/api/clients/list', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        user_id: 'your-user-id'
    })
});

const data = await response.json();
console.log(data.clients);
```

### cURL
```bash
# Add a new client
curl -X POST http://localhost:3001/api/clients/add \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "name": "Jan Kowalski",
    "email": "jan@example.com",
    "phone": "+48 123 456 789"
  }'
```
