# Refactoring Plan: Frontend/Backend Separation and Spam Prevention

This document outlines the steps to refactor the application, moving non-critical logic to the frontend and implementing measures to prevent backend spam.

## Goals

1.  **Identify Logic for Frontend Migration:** Analyze `backend/server.js` to find functionalities that don't require server-side processing or access to sensitive data. Examples include UI-related calculations, data formatting for display, and simple state management.
2.  **Implement Frontend Logic:** Move the identified logic from `backend/server.js` to `script.js`. Ensure the frontend handles these tasks efficiently.
3.  **Identify Backend Spam Vectors:** Review API endpoints in `backend/server.js` for potential vulnerabilities to spamming or denial-of-service attacks (e.g., endpoints without rate limiting, insufficient input validation).
4.  **Implement Backend Spam Prevention:**
    *   **Rate Limiting:** Introduce rate limiting on critical or resource-intensive API endpoints.
    *   **Input Validation:** Strengthen input validation on all endpoints to reject malicious or malformed requests early.
    *   **Authentication/Authorization (if applicable):** Ensure proper checks are in place if user accounts or sessions are involved.
5.  **Update Documentation:** Document the changes made in this file.

## Implementation Steps

*   **Analysis (2025-04-02):**
    *   Reviewed `backend/server.js`. Found minimal non-critical logic suitable for frontend migration. Most backend logic involves security (auth, validation, sanitization), database interaction, or specific backend configurations (rate limiting, card limits).
    *   Frontend validation/sanitization can be added/enhanced in `script.js` for better UX, but backend checks must remain for security.
    *   Existing spam prevention measures (rate limiting on auth, input sanitization, auth middleware, security headers, card limits) are good.
    *   Identified `/api/cards/bulk` endpoint as a potential target for spam/abuse due to lack of rate limiting.
*   **Backend Spam Prevention (2025-04-02):**
    *   Added rate limiting (`bulkLimiter`) to the `POST /api/cards/bulk` endpoint in `backend/server.js` to prevent abuse.
*   **Frontend UX Enhancement (2025-04-02):**
    *   Added client-side input validation (length checks) in `script.js` for registration (`handleRegister`), adding cards (`addCard`), and editing cards (`saveEdit`) to mirror backend rules and provide immediate feedback.