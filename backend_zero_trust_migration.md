# Backend Migration to Zero Trust Session Authentication

_This plan outlines how to modify the backend to support a zero trust frontend without exposing tokens._

---

## 1. Replace JWT with Cookie-Based Sessions

- **Stop issuing JWT tokens** on login.
- Instead, create a **server-side session** (e.g., using `express-session`).
- Set a **HttpOnly, Secure, SameSite cookie** containing the session ID.
- Example:
  ```js
  const session = require('express-session');
  app.use(session({
    secret: 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // true in production with HTTPS
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15 // 15 minutes
    }
  }));
  ```

---

## 2. Update Login Endpoint

- On successful login:
  - **Create a session**: `req.session.user = { id, isAdmin }`
  - **Do NOT return a JWT token**.
- Example:
  ```js
  req.session.user = { id: user.id, isAdmin: user.is_admin };
  res.json({ success: true });
  ```

---

## 3. Update Logout Endpoint

- Destroy the session:
  ```js
  req.session.destroy();
  res.json({ success: true });
  ```

---

## 4. Update Authentication Middleware

- Replace JWT verification with session check:
  ```js
  function authenticate(req, res, next) {
    if (req.session && req.session.user) {
      req.user = req.session.user;
      next();
    } else {
      res.sendStatus(401);
    }
  }
  ```
- Use `authenticate` middleware on protected routes.

---

## 5. Update Admin Middleware

- Check `req.user.isAdmin` from session:
  ```js
  function authenticateAdmin(req, res, next) {
    authenticate(req, res, () => {
      if (req.user.isAdmin) next();
      else res.sendStatus(403);
    });
  }
  ```

---

## 6. Remove JWT Dependencies

- Remove `jsonwebtoken` usage.
- Remove JWT secret configs.
- Remove Authorization header parsing.

---

## 7. CORS and Cookies

- Allow credentials in CORS:
  ```js
  app.use(cors({
    origin: 'https://your-frontend-url',
    credentials: true,
    // other options
  }));
  ```
- Frontend fetch requests must include `credentials: 'include'`.

---

## 8. Summary

- Use **HttpOnly, Secure cookies** for sessions.
- **No tokens sent to or stored on the client.**
- **All auth handled server-side** via sessions.
- **Frontend becomes zero trust** with no sensitive data.

---

_This migration will fully support a zero trust frontend architecture._