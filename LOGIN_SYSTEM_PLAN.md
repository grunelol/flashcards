# Plan: Simple Login System for Flashcards App

This plan outlines the steps to add a basic user authentication system (login/register) to the flashcards application, ensuring compatibility with Render and Netlify free tiers.

**Goal:** Allow users to register accounts, log in, and manage their own set of flashcards (up to 500 per user).

**Assumptions:**
*   The backend is a Node.js/Express application currently deployed or deployable on Render's free tier.
*   A database (like Render's free PostgreSQL) will be used for persistent storage.
*   The frontend is hosted on Netlify's free tier.

## I. Backend Modifications (`backend/`)

1.  **Database Schema Changes:**
    *   **`users` Table:** Create a new table to store user credentials.
        *   `id`: Primary Key (e.g., SERIAL or UUID)
        *   `username`: VARCHAR, UNIQUE, NOT NULL
        *   `password_hash`: VARCHAR, NOT NULL (Store hashed passwords only)
        *   `created_at`: TIMESTAMP WITH TIME ZONE, default NOW()
    *   **`cards` Table:** Add a foreign key to associate cards with users.
        *   Add `user_id`: Integer/UUID (matching `users.id` type), FOREIGN KEY REFERENCES `users(id)` ON DELETE CASCADE, NOT NULL.
        *   Ensure existing cards (if any intended for testing/defaults) are either removed or assigned to a default/test user during migration.

2.  **Dependencies:**
    *   Add necessary npm packages:
        *   `bcrypt`: For securely hashing passwords.
        *   `jsonwebtoken`: For creating and verifying JWTs (JSON Web Tokens) for session management.
        *   `dotenv` (optional but recommended): For managing environment variables like JWT secrets.
    *   Run `npm install bcrypt jsonwebtoken dotenv` in the `backend` directory.

3.  **Authentication Logic (`server.js` or dedicated auth module):**
    *   **Registration (`POST /api/auth/register`):**
        *   Accept `username` and `password` in the request body.
        *   Validate input (non-empty, potentially username/password complexity rules).
        *   Check if username already exists in the `users` table.
        *   Hash the password using `bcrypt`.
        *   Insert the new user (`username`, `password_hash`) into the `users` table.
        *   Respond with success or error message.
    *   **Login (`POST /api/auth/login`):**
        *   Accept `username` and `password`.
        *   Find the user by `username` in the `users` table.
        *   If user exists, compare the provided password with the stored `password_hash` using `bcrypt.compare()`.
        *   If credentials are valid, generate a JWT containing the `user_id` (and potentially `username`). Sign it with a secret key (store securely, e.g., in environment variables).
        *   Respond with the JWT (e.g., `{ token: '...' }`) or an error message.
    *   **Authentication Middleware:**
        *   Create middleware to protect card-related routes.
        *   It should expect a JWT in the `Authorization: Bearer <token>` header.
        *   Verify the token using `jsonwebtoken.verify()` and the secret key.
        *   If valid, extract the `user_id` from the token payload and attach it to the request object (e.g., `req.user = { id: userId };`).
        *   If invalid or missing, respond with a 401 Unauthorized error.

4.  **API Endpoint Updates (`server.js` or card routes module):**
    *   **Apply Auth Middleware:** Add the authentication middleware to all existing `/api/cards` routes (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /all`, `POST /bulk`).
    *   **Scope Operations to User:**
        *   `GET /api/cards`: Modify the database query to fetch only cards where `user_id` matches `req.user.id`.
        *   `POST /api/cards`:
            *   Before inserting, count the user's current cards (`SELECT COUNT(*) FROM cards WHERE user_id = req.user.id`).
            *   If count >= 500, return an error (e.g., 403 Forbidden or 400 Bad Request) indicating the limit is reached.
            *   When inserting the new card, set the `user_id` column to `req.user.id`.
        *   `PUT /api/cards/:id`: Ensure the card being updated belongs to the authenticated user (`WHERE id = :cardId AND user_id = req.user.id`).
        *   `DELETE /api/cards/:id`: Ensure the card being deleted belongs to the authenticated user (`WHERE id = :cardId AND user_id = req.user.id`).
        *   `DELETE /api/cards/all`: Modify to delete only cards belonging to the authenticated user (`WHERE user_id = req.user.id`).
        *   `POST /api/cards/bulk`:
            *   Check the user's current card count + the number of cards being imported.
            *   If the total exceeds 500, return an error.
            *   Ensure the `user_id` is set to `req.user.id` for all imported cards.
    *   **API Base Path:** Consider prefixing all routes with `/api` (e.g., `/api/auth/login`, `/api/cards`) if not already done, to avoid conflicts.

## II. Frontend Modifications (`index.html`, `script.js`, `style.css`)

1.  **UI Changes (`index.html`, `style.css`):**
    *   **Login/Register View:**
        *   Create a dedicated section/div (e.g., `#authContainer`) that is shown initially. Hide the main flashcard container (`#main-container`).
        *   Add input fields for `username` and `password`. Add separate fields or a toggle for Login vs. Register mode.
        *   Add "Login" and "Register" buttons.
        *   Add an area for displaying authentication errors (e.g., "Invalid credentials", "Username taken").
    *   **Flashcard View:**
        *   Add a "Logout" button, perhaps in the header (`.app-header`).
        *   Initially hide the flashcard container (`.main-container`) using CSS (`display: none;`).

2.  **Logic Changes (`script.js`):**
    *   **State Management:**
        *   Add a variable to store the JWT (e.g., `let authToken = null;`).
        *   Add a variable to track login state (e.g., `let isLoggedIn = false;`).
    *   **Authentication Functions:**
        *   `handleRegister()`:
            *   Get username/password from inputs.
            *   Call `POST /api/auth/register` using `fetch`.
            *   Handle success (e.g., show message "Registration successful, please log in") or error (display error message).
        *   `handleLogin()`:
            *   Get username/password from inputs.
            *   Call `POST /api/auth/login` using `fetch`.
            *   On success:
                *   Parse the response to get the JWT.
                *   Store the token (e.g., `authToken = response.token; localStorage.setItem('authToken', response.token);`).
                *   Set `isLoggedIn = true`.
                *   Hide the auth container, show the main flashcard container.
                *   Call `loadData()` to fetch the user's cards.
            *   On failure: Display error message.
        *   `handleLogout()`:
            *   Clear the stored token (`authToken = null; localStorage.removeItem('authToken');`).
            *   Set `isLoggedIn = false`.
            *   Clear flashcard data (`flashcardsData = []`, `filteredIndices = []`).
            *   Hide the main flashcard container, show the auth container.
            *   Update UI elements (e.g., clear card display).
    *   **API Call Modifications:**
        *   Modify all `fetch` calls to `/api/cards` endpoints:
            *   Check if `authToken` exists.
            *   If yes, add the `Authorization` header: `headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer ${authToken}\` }`.
            *   If no token, potentially redirect to login or handle appropriately.
        *   Add error handling for 401 Unauthorized responses (e.g., call `handleLogout()` to clear state and show login).
    *   **Initialization (`initializeApp` or similar):**
        *   Check `localStorage` for a saved `authToken`.
        *   If found, set `authToken` and `isLoggedIn = true`. Show the main container and call `loadData()`.
        *   If not found, show the auth container.
        *   Attach event listeners for Login, Register, and Logout buttons.

## III. Deployment

1.  **Backend (Render):**
    *   Update the service with the new code and dependencies (`npm install` will run based on `package.json`).
    *   Configure environment variables (e.g., `DATABASE_URL`, `JWT_SECRET`).
    *   Ensure the database migration (schema changes) is executed. Render might have tools for this, or it might need to be done manually or via script.
2.  **Frontend (Netlify):**
    *   Deploy the updated frontend code (`index.html`, `script.js`, `style.css`). No specific Netlify configuration changes should be needed for this plan.

## IV. Considerations

*   **Error Handling:** Implement robust error handling on both frontend and backend (e.g., network errors, server errors, validation errors, card limits).
*   **Security:**
    *   Use HTTPS for all communication.
    *   Store JWT secret securely (environment variable).
    *   Never store passwords in plain text.
    *   Consider rate limiting on login/register endpoints.
*   **User Experience:** Provide clear feedback to the user during login, registration, logout, and when errors occur. Handle the initial loading state gracefully.
*   **Testing:** Thoroughly test registration, login, logout, all card operations for authenticated users, card limits, and error conditions.