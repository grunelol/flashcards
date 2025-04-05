# Security Hardening Plan for Frontend

_This document outlines changes to improve frontend security based on recent observations._

---

## 1. Remove Sensitive Console Logs

- **JWT Payloads:**
  - Currently, decoded JWT payloads are logged:
    ```js
    console.log("Decoded JWT Payload:", decodedPayload);
    ```
  - **Change:** Remove or comment out this line in production builds to avoid leaking token contents.

- **Login and Registration Errors:**
  - Avoid logging full error objects or sensitive backend responses.
  - Instead, show user-friendly messages and log minimal info:
    ```js
    console.error("Login error:", error.message);
    ```

- **API Request Details:**
  - Avoid logging full fetch options with headers and bodies.
  - Log only URLs or minimal info during development.

---

## 2. Sanitize User Feedback

- Display generic error messages like:
  - "Invalid username or password" instead of "Invalid credentials."
  - "Registration failed. Please check your input."

- Avoid exposing backend validation details to users (e.g., "Username must be 4-25 chars") unless intended.

---

## 3. Rate Limiting Feedback

- If backend enforces rate limits (e.g., 429 Too Many Requests), show a countdown timer before retry.
- Already partially implemented; ensure it's user-friendly and prevents brute force attempts.

---

## 4. Production Build Considerations

- Add a global `isProduction` flag or use environment variables.
- Wrap console logs in:
  ```js
  if (!isProduction) {
    console.log(...);
  }
  ```
- Or, strip console logs during build/minification.

---

## 5. Summary

- **Remove sensitive console logs** before deploying.
- **Sanitize error messages** shown to users.
- **Handle rate limiting gracefully**.
- **Avoid leaking JWT contents** or internal API details.
- These changes improve security without affecting functionality.