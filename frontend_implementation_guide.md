# Frontend Improvement Implementation Guide

_This guide provides detailed, step-by-step instructions to implement the improvements from the plan, carefully integrated with your existing vanilla JS, HTML, and CSS project._

---

## 1. Visual Design & Layout

- **Card Flip Animation:**
  - In `style.css`, enhance `.flashcard`:
    ```css
    .flashcard {
      transition: transform 0.6s ease-in-out, box-shadow 0.3s ease;
    }
    .flashcard:hover:not(.flipped) {
      transform: scale(1.02);
      box-shadow: 0 6px 20px var(--shadow-color);
    }
    ```
  - This builds on existing flip logic without changing JS.

- **Section Separation:**
  - Add subtle background colors to `.auth-container`, `.main-container`, `.admin-container`.
  - Use borders or `border-bottom` on headers.
  - Adjust margins/padding in CSS for spacing.

- **Icons:**
  - In `index.html`, add `<i>` icons inside buttons (e.g., `<button><i class="fas fa-plus"></i> Add Card</button>`).
  - No JS changes needed.

- **Color Contrast:**
  - Test palettes with tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).
  - Adjust CSS variables in `:root` and dark mode accordingly.
  - Verify visually after changes.

- **Tap Targets:**
  - In CSS, increase button padding on small screens:
    ```css
    @media (max-width: 640px) {
      button { padding: 12px 16px; }
    }
    ```
  - Test on mobile devices.

- **Loading Skeletons:**
  - Create `.skeleton` CSS class with shimmer animation.
  - In `script.js`, before data loads, insert skeleton elements.
  - Replace with real content after fetch completes.
  - This integrates smoothly with existing loading logic.

---

## 2. Accessibility & Password Manager Harmony

- **ARIA & Semantic HTML:**
  - In `index.html`:
    - Wrap main content in `<main role="main">`.
    - Use `<section>` for login, flashcards, admin.
    - Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modalTitleId"` to modals.
    - Add `aria-live="polite"` to status message containers.
  - No JS changes required.

- **Focus Management:**
  - In `script.js`, when opening modals, call `.focus()` on the first input or close button.
  - Trap focus inside modals by listening for Tab/Shift+Tab and cycling focus.
  - On modal close, return focus to the button that opened it.
  - Use visible focus styles in CSS for clarity.

- **Reduced Motion:**
  - Add the `prefers-reduced-motion` CSS snippet to `style.css`.
  - No JS changes needed.

- **Form Validation:**
  - In `script.js`, on form submit, validate inputs.
  - If invalid, add `.error` class, set `aria-invalid="true"`, and show inline error message with `aria-describedby`.
  - Remove error styles on input change.
  - This enhances existing validation without breaking it.

- **Password Manager Compatibility:**
  - In `index.html` login form:
    ```html
    <form id="loginForm" autocomplete="on">
      <label for="usernameInput">Username</label>
      <input type="text" id="usernameInput" name="username" autocomplete="username" required>
      <label for="passwordInput">Password</label>
      <input type="password" id="passwordInput" name="password" autocomplete="current-password" required>
      <button type="submit">Login</button>
    </form>
    ```
  - For registration, use `autocomplete="new-password"` on password.
  - In `script.js`, attach event listeners to the form's `submit` event instead of button clicks.
  - Avoid clearing inputs on page load.
  - Clear password fields **after** successful login.
  - This ensures harmony with browser extensions.

---

## 3. Interactivity & UX

- **Undo for Deletes:**
  - In `script.js`, after deleting a card, store its data temporarily.
  - Show a status message with "Undo" button.
  - If clicked within timeout, re-add the card via API or local state.
  - Otherwise, discard the temp data.
  - This integrates with existing delete logic.

- **Optimistic UI:**
  - When adding/deleting cards, update UI immediately.
  - If API call fails, revert change and show error.
  - Wrap API calls in try/catch and handle errors gracefully.

- **Progress Bar Animation:**
  - Already uses `.progress-bar`; add `transition: width 0.3s ease;` in CSS.
  - No JS changes needed beyond updating width.

- **Tooltips:**
  - Add `title` attributes to buttons.
  - For richer tooltips, create `.tooltip` divs shown on hover with CSS.
  - No JS changes required.

- **Drag-and-Drop Import:**
  - In `script.js`, add `dragover` and `drop` listeners to the import modal.
  - On drop, read file content and parse JSON.
  - Reuse existing import logic.
  - Style drop area with CSS for feedback.

---

## 4. Theming & Customization

- **Theme Transitions:**
  - Already uses CSS transitions; extend to dropdowns, modals, buttons.
  - Test transitions after theme switch.

- **Font Size Toggle:**
  - Add buttons or a dropdown for font size.
  - On change, update a CSS variable or root font size.
  - Save preference in `localStorage`.
  - Apply on page load.

- **Palette Previews:**
  - In palette dropdown, show small color swatches.
  - On hover, preview palette by temporarily applying it.
  - On click, save preference.

- **Lazy Loading:**
  - Use `<link rel="preload">` for fonts in `index.html`.
  - Load Font Awesome asynchronously with JS or `rel="preload"`.

---

## 5. Code Structure

- **Modularize JS:**
  - Split `script.js` into logical files: `auth.js`, `cards.js`, `admin.js`, `ui.js`.
  - Use ES6 `export` and `import`.
  - Update `index.html` to use `<script type="module" src="main.js"></script>`.
  - Test each module incrementally.

- **Documentation:**
  - Add JSDoc comments to all functions.
  - Document parameters, return values, and side effects.

- **Testing:**
  - Write manual test cases for login, card CRUD, admin actions.
  - Optionally add lightweight unit tests.

- **Progressive Enhancement:**
  - Implement changes one at a time.
  - Test thoroughly after each.
  - Use feature detection where needed.
  - Avoid breaking existing flows.

---

_This guide ensures all improvements are integrated carefully, respecting your current project structure and minimizing risk of breaking existing features._