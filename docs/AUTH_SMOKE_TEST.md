# Authentication Smoke Test Matrix

This document records the verification results for the Craftify Labs authentication system across both backend API and frontend client layers.

## Summary Matrix

| ID | Test Scenario | Target | Verification Method | Status | Notes & Observations |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **ST-01** | Register with valid credentials | `POST /api/auth/register` | Automated (`fetch`) | **PASS** | HTTP 201 Created. Returns JWT token, `_id`, `name`, `email`. |
| **ST-02** | Register with duplicate email | `POST /api/auth/register` | Automated (`fetch`) | **PASS** | HTTP 400 Bad Request. Returns `"An account with this email already exists. Please log in."` |
| **ST-03** | Register with weak password (< 6 chars) | `POST /api/auth/register` | Automated (`fetch`) | **PASS** | HTTP 400 Bad Request. Returns `"Password must be at least 6 characters long."` |
| **ST-04** | Register with invalid email syntax | `POST /api/auth/register` | Automated (`fetch`) | **PASS** | HTTP 400 Bad Request. Returns `"Please provide a valid email address"`. Verified safe from ReDoS. |
| **ST-05** | Register with mismatched confirmPassword | `POST /api/auth/register` | Automated (`fetch`) | **PASS** | HTTP 400 Bad Request. Returns `"Passwords do not match. Please verify your confirm password."` |
| **ST-06** | Login with valid credentials | `POST /api/auth/login` | Automated (`fetch`) | **PASS** | HTTP 200 OK. Returns JWT token and user profile. |
| **ST-07** | Login with wrong password | `POST /api/auth/login` | Automated (`fetch`) | **PASS** | HTTP 401 Unauthorized. Returns `"Invalid email or password. Please check your credentials."` |
| **ST-08** | Login with non-existent user | `POST /api/auth/login` | Automated (`fetch`) | **PASS** | HTTP 401 Unauthorized. Exact same error message as wrong password; no account enumeration disclosure. |
| **ST-09** | Protected endpoint access without token | `GET /api/auth/me` | Automated (`fetch`) | **PASS** | HTTP 401 Unauthorized. Returns `"Not authorized to access this route. No bearer token provided."` |
| **ST-10** | Protected endpoint with tampered token | `GET /api/auth/me` | Automated (`fetch`) | **PASS** | HTTP 401 Unauthorized. Returns `"Not authorized. Token invalid or expired."` |
| **ST-11** | Protected endpoint with valid token | `GET /api/auth/me` | Automated (`fetch`) | **PASS** | HTTP 200 OK. Returns user `_id`, `name`, `email`, `createdAt`. Password hash is excluded (`select: '-password'`). |
| **ST-12** | Password encryption in database | `Backend/models/User.js` | Automated (DB query) | **PASS** | Pre-save hook salts with bcrypt (10 rounds). Plain text is never stored or returned in queries. |
| **ST-13** | Frontend session persistence across reload | `AuthContext.jsx` | Code audit & State test | **PASS** | Mount effect pulls `craftify_token` and `craftify_user` from `localStorage`, preserving authenticated session. |
| **ST-14** | Frontend route protection on logout | `App.jsx` | Code audit & State test | **PASS** | `user ? <HomePage /> : <AuthPage />`. Logged out users cannot access `<HomePage />`. |
| **ST-15** | Logout token clearing | `authService.logout` | Code audit | **PASS** | Removes `craftify_token` and `craftify_user` from `localStorage`, resets React context state to null. |
| **ST-16** | Server-side token invalidation / revocation | `authController.js` | Protocol audit | **GAP / NOT TESTED** | Tokens are stateless JWTs (30d expiry). No server blacklist exists. Token remains valid until expiration if stolen. |
| **ST-17** | Brute-force & rate-limiting protection | `server.js` | Automated (10 rapid requests) | **FAIL (GAP)** | All 10 rapid failed login attempts returned 401 without rate limiting (no HTTP 429). Gap identified. |

---

## Detailed Test Procedures & Evidence

### 1. Registration Scenarios (`POST /api/auth/register`)
- **Valid Request**:
  - Request: `POST /api/auth/register` with `email`, `password` (>= 6 chars), `confirmPassword`.
  - Result: HTTP 201 Created. Response payload contains `success: true`, `data._id`, `data.token`.
- **Duplicate Email**:
  - Request: Same email submitted again.
  - Result: HTTP 400 Bad Request with message: `"An account with this email already exists. Please log in."`.
- **Validation Failures**:
  - Submitting short password (`"123"`): HTTP 400 with message `"Password must be at least 6 characters long."`.
  - Submitting invalid email (`"invalid-email-format"`): HTTP 400 with message `"Please provide a valid email address"`.
  - Submitting mismatched `confirmPassword`: HTTP 400 with message `"Passwords do not match. Please verify your confirm password."`.

### 2. Login Scenarios (`POST /api/auth/login`)
- **Credential Disclosure Prevention**:
  - Both "wrong password for known account" and "completely unknown email" produce identical JSON response:
    ```json
    {
      "success": false,
      "message": "Invalid email or password. Please check your credentials."
    }
    ```
  - This prevents malicious actors from enumerating valid account emails.

### 3. Protected Route Verification (`GET /api/auth/me`)
- Calling without an `Authorization` header produces:
  - HTTP 401: `{"success": false, "message": "Not authorized to access this route. No bearer token provided."}`
- Calling with a tampered token (signature modified) produces:
  - HTTP 401: `{"success": false, "message": "Not authorized. Token invalid or expired."}`
- Calling with a valid Bearer token returns:
  - HTTP 200: `{"success": true, "data": { "_id": "...", "name": "...", "email": "...", "createdAt": "..." }}`
  - The `password` field is omitted from the response.

### 4. Client Session & Route Protection
- **Session Hydration**:
  - On initial render, `Frontend/src/context/AuthContext.jsx` reads `localStorage.getItem('craftify_token')` and `craftify_user`.
  - If found, `user` and `token` state variables are initialized, preventing unwarranted redirect to login.
- **Route Guard**:
  - In `Frontend/src/App.jsx`, view routing is handled conditionally:
    ```jsx
    return user ? <HomePage /> : <AuthPage />;
    ```
  - When `logout()` is invoked, tokens are purged from `localStorage` and `user` is set to `null`, instantly dropping the user back to `<AuthPage />`.

---

## Testing Tooling Recommendation

Currently, neither `Backend/package.json` nor `Frontend/package.json` includes automated unit or integration test runners (such as Vitest, Jest, or Supertest). All smoke tests above were executed via native Node.js fetch scripts.

### Recommended Lightweight Testing Option:
- **`vitest` + `supertest` for Backend**:
  - Vitest provides native ESM support out of the box with zero configuration required.
  - Supertest allows testing Express endpoints in-memory without binding live network ports.
- **`vitest` + `@testing-library/react` for Frontend**:
  - Integrates directly with the existing Vite build toolchain without adding extra compilation layers.
- *Note*: Per project constraints, no test packages have been installed during this baseline phase.
