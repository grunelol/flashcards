# Enhanced Flashcards Web Application Documentation

This document provides an overview of the Enhanced Flashcards web application, its structure, functionalities, and the backend API it expects to interact with.

## Project Structure

The frontend consists of three main files:

1.  **`index.html`**: Defines the HTML structure of the application, including the flashcard display area, navigation buttons, management controls, input forms, and modal windows (Import, Edit, Delete Options). It links to `style.css` and `script.js`.
2.  **`style.css`**: Contains all the CSS rules for styling the application, including layout, colors, typography, animations, responsiveness, and dark/light themes. It uses CSS variables for theming.
3.  **`script.js`**: Contains all the client-side JavaScript logic. It handles user interactions, DOM manipulation, state management (current card, filters, etc.), theme switching, modal operations, and communication with the backend API via `fetch`.

## Frontend Functionalities

*   **Card Display**: Shows the question and answer on a flippable card.
*   **Navigation**: Allows users to move to the previous/next card in the current view or jump to a random card.
*   **Add Card**: Form to add a new card (sends data to the backend).
*   **Edit Card**: Opens a modal to edit the question/answer of the current card (sends updated data to the backend).
*   **Delete Card (Current)**: Button to delete the currently displayed card (sends delete request to the backend).
*   **Delete Options (Modal)**:
    *   Opens a modal listing all cards with checkboxes.
    *   Allows deleting selected cards.
    *   Allows deleting ALL cards in the deck.
    *   (Sends delete requests to the backend).
*   **Search**: Filters the displayed cards based on text input matching question or answer. Filtering is debounced.
*   **Shuffle View**: Randomizes the order of cards within the currently filtered/searched view.
*   **Import JSON**: Opens a modal to paste JSON data representing an array of cards (`[{question, answer}, ...]`) to be added to the deck (sends data to the backend).
*   **Export JSON**: Downloads the current deck (all cards) as a JSON file.
*   **Theme Toggle**: Switches between light and dark modes (preference saved in `localStorage`).
*   **Show Answer First**: Toggles whether the answer or question side of the card is shown initially.
*   **Progress Bar**: Visually indicates the user's position within the currently filtered/searched set of cards.
*   **Reset Deck**: Reloads all card data from the backend (effectively resetting the view, does not delete backend data unless the backend endpoint is designed to do so).

## Expected Backend API

The frontend (`script.js`) expects a backend server running and exposing the following RESTful API endpoints (relative to `API_BASE_URL`, currently set to `/api`):

*   **`GET /cards`**
    *   **Purpose**: Fetch all flashcards.
    *   **Response Body**: `[{ "id": "unique_id_1", "question": "Q1", "answer": "A1" }, ...]` (Array of card objects, each *must* have a unique `id`).

*   **`POST /cards`**
    *   **Purpose**: Add a new flashcard.
    *   **Request Body**: `{ "question": "New Question", "answer": "New Answer" }`
    *   **Response Body**: `{ "id": "new_unique_id", "question": "New Question", "answer": "New Answer" }` (The newly created card object with its backend-assigned `id`).

*   **`PUT /cards/:id`** (or `PATCH /cards/:id`)
    *   **Purpose**: Update an existing flashcard.
    *   **URL Parameter**: `:id` - The unique ID of the card to update.
    *   **Request Body**: `{ "question": "Updated Question", "answer": "Updated Answer" }`
    *   **Response Body**: `{ "id": "unique_id", "question": "Updated Question", "answer": "Updated Answer" }` (The full updated card object).

*   **`DELETE /cards/:id`**
    *   **Purpose**: Delete a specific flashcard.
    *   **URL Parameter**: `:id` - The unique ID of the card to delete.
    *   **Response**: Success status (e.g., 200 OK or 204 No Content). Body optional.

*   **`DELETE /cards/all`** (Optional, but used by "Delete ALL Cards" button)
    *   **Purpose**: Delete all flashcards in the deck.
    *   **Response**: Success status. Body optional.
    *   *Note*: If this endpoint isn't implemented, the "Delete ALL Cards" button will fail. An alternative would be to send multiple `DELETE /cards/:id` requests from the frontend, but this is less efficient.

*   **`POST /cards/bulk`** (Optional, but used by "Import JSON")
    *   **Purpose**: Add multiple flashcards at once.
    *   **Request Body**: `[{ "question": "Q1", "answer": "A1" }, { "question": "Q2", "answer": "A2" }, ...]` (Array of new card data).
    *   **Response Body**: Information about the import, e.g., `{ "importedCount": 15 }`. The exact response structure can be adapted in the frontend's `importFromJson` function.
    *   *Note*: If this endpoint isn't implemented, the "Import JSON" feature will fail. An alternative would be multiple `POST /cards` requests from the frontend.

## Backend Requirement

**This frontend application requires a separate backend server and database.** The backend must implement the API endpoints described above to handle data persistence. Without a running backend providing this API, the application will load with errors and most functionalities (adding, editing, deleting, loading cards) will not work.

## Running the Frontend

Simply open the `index.html` file in a web browser. Ensure the backend server (if implemented) is running and accessible at the configured `API_BASE_URL` in `script.js`.