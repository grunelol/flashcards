# Admin Login System Implementation Plan

This plan outlines the steps to add a simple but secure login system for an administrator to manage flashcards (Create, Update, Delete operations). Public viewing of cards will remain accessible without login.

**Goal:** Protect data modification endpoints (`POST`, `PUT`, `DELETE`) so they require admin authentication, while keeping the `GET /cards` endpoint public.

**Strategy:** Basic username/password authentication using JSON Web Tokens (JWT) for session management.

## 1. Backend Implementation (`backend/server.js`)

### 1.1. Install Dependencies

Install libraries for JWT handling and password hashing in the `backend` directory:

```bash
cd backend
npm install jsonwebtoken bcryptjs
cd ..
```

### 1.2. Configure Admin Credentials & JWT Secret (Environment Variables)

These **must** be set as environment variables in your Render service settings (or a local `.env` file for development, ensuring `.env` is in `.gitignore`). **Do not hardcode these in the source code.**

*   `ADMIN_USERNAME`: The desired username for the admin (e.g., `admin`).
*   `ADMIN_PASSWORD_HASH`: The **bcrypt-hashed** version of the desired admin password. You need to generate this hash offline once (see Appendix A).
*   `JWT_SECRET`: A long, random, secret string used to sign the JWTs. Generate a strong secret (e.g., using a password manager or online generator).

### 1.3. Add Login Endpoint (`POST /login`)

*   Create a new route handler for `POST /login`.
*   Accept `username` and `password` in the request body.
*   Compare the provided `username` with `process.env.ADMIN_USERNAME`.
*   If the username matches, use `bcrypt.compare(providedPassword, process.env.ADMIN_PASSWORD_HASH)` to compare the provided password with the stored hash.
*   If both username and password hash match:
    *   Generate a JWT using `jsonwebtoken.sign()`.
    *   The payload should contain identifying information (e.g., `{ userId: 'admin', role: 'admin' }`).
    *   Sign it with `process.env.JWT_SECRET`.
    *   Set an appropriate expiration time (e.g., `'1h'`, `'8h'`).
    *   Send the generated JWT back to the client in the response body (e.g., `{ token: '...' }`).
*   If credentials don't match, return a 401 Unauthorized error.

### 1.4. Create JWT Verification Middleware

*   Create a middleware function (e.g., `authenticateToken`).
*   This function will run before protected route handlers.
*   Extract the token from the `Authorization` header (expected format: `Bearer <token>`).
*   If no token is present, return 401 Unauthorized.
*   Verify the token using `jsonwebtoken.verify(token, process.env.JWT_SECRET)`.
*   If verification fails (invalid signature, expired), return 403 Forbidden or 401 Unauthorized.
*   If verification succeeds, attach the decoded payload (e.g., user info) to `req.user` and call `next()` to proceed to the route handler.

### 1.5. Protect Routes

*   Apply the `authenticateToken` middleware to all routes that modify data:
    *   `POST /cards`
    *   `PUT /cards/:id`
    *   `DELETE /cards/:id`
    *   `DELETE /cards/all`
    *   `POST /cards/bulk`
*   The `GET /cards` route should **not** have this middleware applied, allowing public viewing.

## 2. Frontend Implementation (`script.js`, `index.html`, `style.css`)

### 2.1. Add Login UI (`index.html`, `style.css`)

*   Add a "Login" button somewhere accessible (e.g., header).
*   Create a simple login modal (similar to existing modals) or a dedicated login section containing:
    *   Username input field.
    *   Password input field (`type="password"`).
    *   Login submit button.
    *   Close/Cancel button.
*   Style the login elements appropriately.

### 2.2. Implement Login/Logout Logic (`script.js`)

*   **Login:**
    *   Add an event listener to the login submit button.
    *   On submit, get username/password from the form.
    *   Send a `POST` request to the backend `/login` endpoint with credentials in the body.
    *   Handle the response:
        *   If successful (e.g., status 200), parse the JSON response to get the `token`.
        *   Store the received JWT securely. `sessionStorage` is a reasonable choice for this simple case (`sessionStorage.setItem('adminToken', token)`). It persists for the browser session but is cleared when the tab/browser is closed. Avoid `localStorage` if possible due to higher XSS risk.
        *   Close the login modal/hide the login section.
        *   Update the UI to show admin controls and a "Logout" button (see 2.4).
        *   Optionally display a success message.
        *   If login fails (e.g., status 401), display an error message to the user.
*   **Logout:**
    *   Add a "Logout" button (visible only when logged in).
    *   Add an event listener to the logout button.
    *   On click, remove the token from storage (`sessionStorage.removeItem('adminToken')`).
    *   Update the UI to hide admin controls and show the "Login" button.

### 2.3. Modify API Requests (`script.js`)

*   Create a helper function (e.g., `getAuthHeaders`) that checks if a token exists in `sessionStorage`. If it does, it returns an object like `{ 'Authorization': \`Bearer ${token}\` }`; otherwise, it returns an empty object.
*   Modify all `fetch` calls that go to protected backend endpoints (POST, PUT, DELETE for cards) to include the authorization header:
    ```javascript
    // Example for adding a card
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders() // Add Authorization header if token exists
    };
    const response = await fetch(`${API_BASE_URL}/cards`, {
        method: 'POST',
        headers: headers, // Include headers here
        body: JSON.stringify(newCardData)
    });
    // ... handle response (check for 401/403 errors too)
    ```
*   Ensure error handling for `fetch` calls checks for 401/403 status codes, which indicate an authentication/authorization problem (e.g., expired token, invalid token). If detected, potentially clear the stored token and prompt the user to log in again.

### 2.4. Update UI Based on Login State (`script.js`)

*   Create a function (e.g., `updateAdminUI`) that checks if a valid token exists in `sessionStorage`.
*   Based on the token's presence:
    *   Show/hide the "Login" button.
    *   Show/hide the "Logout" button.
    *   Show/hide admin-only controls:
        *   The entire "Add New Card" section.
        *   The "Edit" button in the card navigation.
        *   The "Delete This Card" button in the card navigation.
        *   The "Import JSON", "Export JSON", "Delete Options...", and potentially "Reset Deck" buttons in the "Manage Deck" section. (Decide if Reset/Export should also be admin-only).
*   Call `updateAdminUI` initially during `initializeApp` and after successful login/logout.

## 3. Deployment

*   Add the new environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`) to your Render backend service settings.
*   Deploy both backend and frontend changes.

## Appendix A: Generating the Password Hash

You need to generate the bcrypt hash for your chosen admin password *before* setting it as an environment variable. You can do this locally using Node.js:

1.  Install bcrypt globally (or locally in a temporary project): `npm install -g bcryptjs`
2.  Open Node REPL: `node`
3.  Run the following (replace `'your_strong_password'`):
    ```javascript
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10); // 10 is a good default cost factor
    const hash = bcrypt.hashSync('your_strong_password', salt);
    console.log(hash);
    // Example output: $2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJ/K.LMNOPQRSTUVWXYZabcdefghijklm
    ```
4.  Copy the entire generated hash string (starting with `$2a$...` or similar) and use that as the value for the `ADMIN_PASSWORD_HASH` environment variable.

---

This plan provides a solid foundation for a simple admin login system using standard, secure practices like JWT and bcrypt. Remember to handle the JWT secret and password hash securely as environment variables.