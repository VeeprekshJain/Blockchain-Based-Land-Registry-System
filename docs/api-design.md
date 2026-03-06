# API Design — Land Registry Backend

## Conventions

| Convention | Value |
|------------|-------|
| Base URL   | `/api/v1` |
| Auth       | `Bearer <JWT>` header |
| Format     | JSON |
| Envelope   | `{ success, message, data, meta? }` |
| Paginate   | `?page=1&limit=20&sortBy=createdAt&order=desc` |

---

## Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Wallet-based login (sign message) |
| POST | `/auth/refresh` | Public | Refresh JWT access token |
| POST | `/auth/logout` | User | Logout and invalidate refresh token |
| GET  | `/auth/me` | User | Get authenticated user profile |

---

## Users (`/api/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/users` | Admin | List all users (paginated) |
| GET    | `/users/:id` | Admin/Officer | Get user by ID |
| PATCH  | `/users/:id` | Admin | Update user details |
| DELETE | `/users/:id` | Admin | Deactivate user account |
| POST   | `/users/:id/kyc` | User | Submit KYC documents |
| PATCH  | `/users/:id/kyc` | Officer | Approve/reject KYC |

---

## Land Parcels (`/api/v1/lands`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/lands` | User | List all parcels (paginated, filterable) |
| GET    | `/lands/:id` | User | Get parcel details |
| POST   | `/lands` | Officer/Admin | Register new land parcel |
| PATCH  | `/lands/:id` | Officer/Admin | Update parcel details |
| DELETE | `/lands/:id` | Admin | Soft-delete/freeze parcel |
| POST   | `/lands/:id/documents` | Officer | Upload land documents |
| GET    | `/lands/:id/history` | User | Get ownership history |

---

## Transfers (`/api/v1/transfers`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/transfers` | Admin/Officer | List all transfers |
| GET    | `/transfers/:id` | User | Get transfer by ID |
| POST   | `/transfers` | User | Initiate ownership transfer |
| PATCH  | `/transfers/:id/approve` | Officer/Admin | Approve transfer |
| PATCH  | `/transfers/:id/reject` | Officer/Admin | Reject transfer |
| PATCH  | `/transfers/:id/cancel` | User | Cancel pending transfer |

---

## Documents (`/api/v1/documents`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/documents/:ipfsHash` | User | Get document metadata |
| POST   | `/documents/upload` | User | Upload to IPFS |
| DELETE | `/documents/:id` | Admin | Remove document reference |

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate parcel) |
| 422 | Unprocessable entity (Zod errors) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
