// --- DOM Elements ---
// Auth Elements
const authContainer = document.getElementById('authContainer');
const mainContainer = document.getElementById('mainContainer');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMessageEl = document.getElementById('authMessage');

// Main App Elements (Existing)
const flashcardContainer = document.querySelector('.flashcard-container');
const flashcard = document.querySelector('.flashcard');
const flashcardFront = document.querySelector('.flashcard-front p');
const flashcardBack = document.querySelector('.flashcard-back p');
const prevBtn = document.getElementById('prevBtn');
const flipBtn = document.getElementById('flipBtn');
const editBtn = document.getElementById('editBtn');
const deleteThisCardBtn = document.getElementById('deleteThisCardBtn');
const randomBtn = document.getElementById('randomBtn');
const nextBtn = document.getElementById('nextBtn');
const deleteOptionsBtn = document.getElementById('deleteOptionsBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const importJsonBtn = document.getElementById('importJsonBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const currentCardNumEl = document.getElementById('currentCardNum');
const totalCardsEl = document.getElementById('totalCards');
const questionInput = document.getElementById('questionInput'); // Add card form
const answerInput = document.getElementById('answerInput');   // Add card form
const addCardBtn = document.getElementById('addCardBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const statusMessageEl = document.getElementById('statusMessage'); // For general app status
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
const filterStatusSelect = document.getElementById('filterStatus');
const searchInput = document.getElementById('searchInput');
const showAnswerFirstToggle = document.getElementById('showAnswerFirstToggle');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingIndicatorText = loadingIndicator ? loadingIndicator.querySelector('p') : null;
const reconnectBtn = document.getElementById('reconnectBtn');

// Modal Elements
let importModal = null;
let closeImportModalBtn = null;
let jsonInput = null;
let processImportBtn = null;
let cancelImportBtn = null;

let editModal = null;
let closeEditModalBtn = null;
let editQuestionInput = null;
let editAnswerInput = null;
let saveEditBtn = null;
let cancelEditBtn = null;
let editCardIndexInput = null;

let deleteOptionsModal = null;
let closeDeleteOptionsModalBtn = null;
let deleteCardList = null;
let deleteAllCardsBtn = null;
let deleteSelectedCardsBtn = null;
let cancelDeleteBtn = null;

// --- API Endpoint ---
// Ensure the base URL points to where your backend API is hosted
const API_BASE_URL = 'https://fcg-backend-dev.onrender.com/api'; // Added /api prefix

// --- State Variables ---
let flashcardsData = [];
let currentCardIndex = -1;
let isFlipped = false;
let statusTimeout;
let authStatusTimeout; // Separate timeout for auth messages
let currentTheme = 'light';
const THEME_PREFERENCE_KEY = 'flashcardThemePreference';
const PALETTE_PREFERENCE_KEY = 'flashcardPalettePreference';
let currentFilter = 'all';
let searchTerm = '';
let showAnswerFirst = false;
let filteredIndices = [];
let currentFilteredIndex = 0;
let searchTimeout;
const MANAGE_DECK_COLLAPSED_KEY = 'manageDeckCollapsed';
let authToken = null; // Stores the JWT
let isLoggedIn = false;

// --- Helper: API Fetch with Auth ---
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding content-type or adding others
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fetchOptions = {
        ...options,
        headers,
    };

    console.log(`Fetching: ${url} with options:`, { ...fetchOptions, body: options.body ? '...' : undefined }); // Log fetch details (hide body)

    try {
        const response = await fetch(url, fetchOptions);

        // Check for auth errors specifically
        if (response.status === 401 || response.status === 403) {
            console.warn(`Auth error (${response.status}) fetching ${url}. Logging out.`);
            handleLogout(); // Log out user if token is invalid/expired
            // Throw an error to stop further processing in the calling function
            throw new Error(`Authentication failed (${response.status})`);
        }

        return response; // Return the raw response for the caller to handle
    } catch (error) {
        // Handle network errors or the auth error thrown above
        console.error(`Fetch error for ${url}:`, error);
        // Show a generic error or re-throw for specific handling
        showStatusMessage(`Network error or authentication issue. Please try again.`, 'error', 5000);
        throw error; // Re-throw the error so the calling function knows it failed
    }
}


// --- Authentication Functions ---

function showAuthMessage(message, type = 'info', duration = 4000) {
    if (!authMessageEl) return;
    authMessageEl.textContent = message;
    authMessageEl.className = `status-message status-${type}`; // Apply type class
    authMessageEl.style.display = 'block';
    clearTimeout(authStatusTimeout);
    if (duration > 0) {
        authStatusTimeout = setTimeout(() => {
            if (authMessageEl) authMessageEl.style.display = 'none';
        }, duration);
    }
}

async function handleRegister() {
    console.log("Action: handleRegister triggered");
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) {
        showAuthMessage("Username and password are required.", 'error');
        return;
    }

    showAuthMessage("Registering...", 'info', 0); // Show indefinitely until response
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json(); // Try to parse JSON regardless of status

        if (!response.ok) {
            // Use error message from backend if available, otherwise generic
            throw new Error(data.error || `Registration failed (status: ${response.status})`);
        }

        showAuthMessage("Registration successful! Please log in.", 'success', 5000);
        // Clear password field after successful registration
        if (passwordInput) passwordInput.value = '';

    } catch (error) {
        console.error("Registration error:", error);
        showAuthMessage(`Registration failed: ${error.message}`, 'error');
    }
}

async function handleLogin() {
    console.log("Action: handleLogin triggered");
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) {
        showAuthMessage("Username and password are required.", 'error');
        return;
    }

    showAuthMessage("Logging in...", 'info', 0); // Show indefinitely
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json(); // Try to parse JSON

        if (!response.ok) {
             throw new Error(data.error || `Login failed (status: ${response.status})`);
        }

        if (!data.token) {
            throw new Error("Login successful, but no token received from server.");
        }

        // --- Login Success ---
        authToken = data.token;
        isLoggedIn = true;
        localStorage.setItem('authToken', authToken); // Store token

        // Clear auth form and message
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (authMessageEl) authMessageEl.style.display = 'none';

        // Switch UI
        if (authContainer) authContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block'; // Show the main app

        console.log("Login successful, loading user data...");
        loadData(); // Load user-specific cards

    } catch (error) {
        console.error("Login error:", error);
        showAuthMessage(`Login failed: ${error.message}`, 'error');
        // Ensure main app is hidden if login fails after a previous session
        if (mainContainer) mainContainer.style.display = 'none';
        if (authContainer) authContainer.style.display = 'block';
    }
}

function handleLogout() {
    console.log("Action: handleLogout triggered");
    authToken = null;
    isLoggedIn = false;
    localStorage.removeItem('authToken');

    // Clear app state
    flashcardsData = [];
    filteredIndices = [];
    currentCardIndex = -1;
    currentFilteredIndex = 0;
    searchTerm = '';
    if (searchInput) searchInput.value = '';
    // Don't clear theme/palette preferences on logout

    // Reset UI
    displayCard(); // Clear card display
    updateNavigationButtons(); // Disable buttons

    // Switch UI
    if (mainContainer) mainContainer.style.display = 'none';
    if (authContainer) authContainer.style.display = 'block';

    // Clear any lingering status messages
    clearStatusMessage();
    if (authMessageEl) authMessageEl.style.display = 'none'; // Clear auth message too

    console.log("User logged out.");
}


// --- Core Functions (Modified for Auth) ---

// Load data from Backend API (User-specific)
async function loadData() {
    console.log("Action: loadData triggered");
    if (!isLoggedIn || !authToken) {
        console.warn("loadData called but user is not logged in.");
        handleLogout(); // Ensure user is logged out if state is inconsistent
        return;
    }

    if (loadingIndicator && loadingIndicatorText) {
        loadingIndicatorText.textContent = 'Loading your cards...';
        loadingIndicator.style.display = 'flex';
    }
    clearStatusMessage(); // Clear previous messages

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards`); // Uses fetchWithAuth

        if (!response.ok) { // fetchWithAuth handles 401/403, this catches other errors
            const errorData = await response.json().catch(() => ({})); // Try to get error details
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || !data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'question' in item && 'answer' in item)) {
             console.error("Invalid data structure received from API:", data);
             throw new Error("Invalid data format from server.");
        }
        flashcardsData = data;
        console.log(`Loaded ${flashcardsData.length} cards for user.`);
    } catch (error) {
        // Auth errors are handled by fetchWithAuth (logout)
        // Handle other errors (network, server 500, invalid data)
        if (error.message.includes('Authentication failed')) {
             // Already handled by fetchWithAuth, just log
             console.log("Authentication error during loadData, logout initiated.");
        } else {
            console.error("Error loading cards:", error);
            flashcardsData = []; // Reset to empty on error
            showStatusMessage(`Error loading cards: ${error.message}.`, 'error', 10000);
        }
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    // Apply filters and display, even if data loading failed (will show 'no cards')
    applyFiltersAndSearch();
}

// Apply Filters and Search (No auth changes needed)
function applyFiltersAndSearch() {
    // ... (keep existing logic) ...
    console.log("Action: applyFiltersAndSearch triggered");
    const searchLower = searchTerm.toLowerCase();
    filteredIndices = flashcardsData
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => {
            if (searchLower) {
                return card.question.toLowerCase().includes(searchLower) || card.answer.toLowerCase().includes(searchLower);
            }
            return true;
        })
        .map(({ index }) => index);

    const previousOriginalIndex = currentCardIndex;
    const newIndexInFiltered = filteredIndices.indexOf(previousOriginalIndex);
    currentFilteredIndex = (newIndexInFiltered !== -1) ? newIndexInFiltered : 0;

    if (filteredIndices.length > 0) {
        if (currentFilteredIndex >= filteredIndices.length) currentFilteredIndex = 0;
        currentCardIndex = filteredIndices[currentFilteredIndex]; // Set original index
    } else {
        currentCardIndex = -1; // No card selected
    }
    displayCard();
}


// Display current card (No auth changes needed, but handles empty state better)
function displayCard() {
    // ... (keep existing logic, ensure it handles flashcardsData being empty) ...
    if (!flashcardContainer || !flashcardFront || !flashcardBack || !currentCardNumEl || !totalCardsEl || !progressText) return;
    flashcardContainer.classList.remove('status-learned', 'status-difficult');

    if (!isLoggedIn || filteredIndices.length === 0 || currentFilteredIndex >= filteredIndices.length || currentCardIndex === -1) {
        flashcardFront.textContent = isLoggedIn ? "No cards match search/filter." : "Please log in.";
        flashcardBack.textContent = isLoggedIn ? "Add cards or clear search." : "";
        if (flashcard) flashcard.classList.remove('flipped');
        isFlipped = false;
        currentCardNumEl.textContent = 0;
        totalCardsEl.textContent = 0;
        progressText.textContent = "Card 0 / 0";
        updateProgressBar(0, 0);
        currentCardIndex = -1; // Ensure index is reset
    } else {
        const card = flashcardsData[currentCardIndex];
        if (!card) { console.error(`Card not found at index: ${currentCardIndex}.`); applyFiltersAndSearch(); return; }

        if (showAnswerFirst) {
            flashcardFront.textContent = card.answer;
            flashcardBack.textContent = card.question;
        } else {
            flashcardFront.textContent = card.question;
            flashcardBack.textContent = card.answer;
        }
        if (flashcard) flashcard.classList.remove('flipped');
        isFlipped = false;
        currentCardNumEl.textContent = currentFilteredIndex + 1;
        totalCardsEl.textContent = filteredIndices.length;
        progressText.textContent = `Card ${currentFilteredIndex + 1} / ${filteredIndices.length}`;
        updateProgressBar(currentFilteredIndex + 1, filteredIndices.length);
    }
    updateNavigationButtons();
}

// Flip card (No auth changes needed)
function flipCard() {
    // ... (keep existing logic) ...
    console.log("Action: flipCard triggered");
    if (isLoggedIn && filteredIndices.length > 0 && flashcard) {
        flashcard.classList.toggle('flipped');
        isFlipped = !isFlipped;
    }
}

// Navigate next (No auth changes needed)
function nextCard() {
    // ... (keep existing logic) ...
    console.log("Action: nextCard triggered");
    if (isLoggedIn && currentFilteredIndex < filteredIndices.length - 1) {
        currentFilteredIndex++;
        currentCardIndex = filteredIndices[currentFilteredIndex];
        displayCard();
    }
}

// Navigate previous (No auth changes needed)
function prevCard() {
    // ... (keep existing logic) ...
    console.log("Action: prevCard triggered");
    if (isLoggedIn && currentFilteredIndex > 0) {
        currentFilteredIndex--;
        currentCardIndex = filteredIndices[currentFilteredIndex];
        displayCard();
    }
}

// Random Card (No auth changes needed)
function randomCard() {
    // ... (keep existing logic) ...
    console.log("Action: randomCard triggered");
    if (!isLoggedIn) return;
    if (filteredIndices.length > 1) {
        let randomIndex;
        do { randomIndex = Math.floor(Math.random() * filteredIndices.length); }
        while (randomIndex === currentFilteredIndex);
        currentFilteredIndex = randomIndex;
        currentCardIndex = filteredIndices[currentFilteredIndex];
        displayCard();
    } else if (filteredIndices.length === 1) { showStatusMessage("Only one card in view.", 'info', 1500); }
    else { showStatusMessage("No cards available.", 'info', 1500); }
}

// Add new card (via API with Auth)
async function addCard() {
    console.log("Action: addCard triggered");
    if (!isLoggedIn || !questionInput || !answerInput) return;
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (!question || !answer) { showStatusMessage("Enter question and answer.", 'error', 3000); return; }

    const newCardData = { question, answer };
    showStatusMessage("Adding card...", 'info', 3000);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards`, { // Uses fetchWithAuth
            method: 'POST',
            body: JSON.stringify(newCardData)
        });

        const addedCard = await response.json(); // Try parsing JSON

        if (!response.ok) {
            // Handle specific errors like card limit (403)
            const errorMsg = addedCard.error || `Failed to add card (status: ${response.status})`;
             throw new Error(errorMsg);
        }

        flashcardsData.push(addedCard);
        clearFormFields(false);
        showStatusMessage("Card added.", 'success', 2000);
        applyFiltersAndSearch();
        // Navigate to the new card
        const newCardOriginalIndex = flashcardsData.length - 1;
        const newCardFilteredIndex = filteredIndices.indexOf(newCardOriginalIndex);
        if (newCardFilteredIndex !== -1) {
            currentFilteredIndex = newCardFilteredIndex;
            displayCard();
        }
    } catch (error) {
        // Auth errors handled by fetchWithAuth
        if (!error.message.includes('Authentication failed')) {
            console.error("Error adding card:", error);
            showStatusMessage(`Error adding card: ${error.message}`, 'error', 5000);
        }
    }
}

// Delete *current* card (via API with Auth)
async function deleteCurrentCard() {
    console.log("Action: deleteCurrentCard triggered");
    if (!isLoggedIn || currentCardIndex === -1 || !flashcardsData[currentCardIndex]) {
        showStatusMessage("No card selected.", 'info'); return;
    }
    const cardToDelete = flashcardsData[currentCardIndex];
    if (!confirm(`Delete this card?\nQ: ${cardToDelete.question}`)) {
        console.log("Action: deleteCurrentCard cancelled by user");
        return;
    }

    showStatusMessage("Deleting card...", 'info', 3000);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards/${cardToDelete.id}`, { method: 'DELETE' }); // Uses fetchWithAuth

        if (!response.ok) { // Status 204 is ok for DELETE
             // fetchWithAuth handles 401/403, check for 404 specifically
             if (response.status === 404) {
                 throw new Error("Card not found on server (might be already deleted).");
             } else {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.error || `Failed to delete card (status: ${response.status})`);
             }
        }
        // Remove from local state on success
        const originalIndexToDelete = currentCardIndex; // Store before modifying flashcardsData
        flashcardsData.splice(originalIndexToDelete, 1);
        showStatusMessage("Card deleted.", 'info', 2000);
        applyFiltersAndSearch(); // Re-filter and display (will adjust current index)
    } catch (error) {
         if (!error.message.includes('Authentication failed')) {
            console.error("Error deleting card:", error);
            showStatusMessage(`Error deleting card: ${error.message}`, 'error', 5000);
            // Optional: Reload data if deletion failed unexpectedly to ensure consistency
            // loadData();
         }
    }
}

// --- Delete Options Modal Logic (Modified for Auth) ---

// Open Delete Options Modal (No auth changes needed for opening)
function openDeleteOptionsModal() {
    // ... (keep existing logic) ...
    console.log("Action: openDeleteOptionsModal triggered");
    if (!isLoggedIn) return; // Don't open if not logged in
    if (!deleteOptionsModal || !deleteCardList) {
        console.error("Delete Options modal elements not found!");
        showStatusMessage("Error opening delete options.", 'error');
        return;
    }
    deleteCardList.innerHTML = '';
    if (flashcardsData.length === 0) {
        deleteCardList.innerHTML = '<p>No cards in the deck.</p>';
    } else {
        flashcardsData.forEach((card) => {
            const item = document.createElement('div');
            item.className = 'delete-card-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = card.id;
            checkbox.id = `del-chk-${card.id}`;
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            const span = document.createElement('span');
            span.textContent = card.question;
            label.appendChild(span);
            item.appendChild(checkbox);
            item.appendChild(label);
            deleteCardList.appendChild(item);
        });
    }
    deleteOptionsModal.style.display = 'block';
}

// Close Delete Options Modal (No auth changes needed)
function closeDeleteOptionsModal() {
    // ... (keep existing logic) ...
    console.log("Action: closeDeleteOptionsModal triggered");
    if (deleteOptionsModal) {
        deleteOptionsModal.style.display = 'none';
    }
}

// Delete Selected Cards (via API with Auth)
async function deleteSelectedCards() {
    console.log("Action: deleteSelectedCards triggered");
    if (!isLoggedIn || !deleteCardList) return;
    const checkboxes = deleteCardList.querySelectorAll('input[type="checkbox"]:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.value);

    if (idsToDelete.length === 0) {
        alert("No cards selected to delete."); return;
    }
    if (!confirm(`Delete the ${idsToDelete.length} selected card(s)? This cannot be undone.`)) {
        console.log("Action: deleteSelectedCards cancelled by user");
        return;
    }

    showStatusMessage(`Deleting ${idsToDelete.length} card(s)...`, 'info', 5000);
    let successCount = 0;
    let failCount = 0;
    const successfullyDeletedIds = new Set();

    // Send delete requests sequentially to avoid overwhelming free tier backend? Or parallel?
    // Let's try parallel with fetchWithAuth
    const deletePromises = idsToDelete.map(id =>
        fetchWithAuth(`${API_BASE_URL}/cards/${id}`, { method: 'DELETE' })
            .then(response => {
                // fetchWithAuth handles 401/403. Check for 204 (success) or 404 (not found).
                if (response.status === 204) {
                    console.log(`Successfully deleted card ID: ${id}`);
                    successCount++;
                    successfullyDeletedIds.add(id);
                } else if (response.status === 404) {
                     console.warn(`Card ID ${id} not found on server during multi-delete.`);
                     failCount++; // Count as failure for reporting
                } else {
                    // Other errors (e.g., 500)
                    console.error(`Failed to delete card ID ${id}: Status ${response.status}`);
                    failCount++;
                }
            })
            .catch(error => {
                // Network errors or auth errors from fetchWithAuth
                failCount++;
                console.error(`Error processing delete for card ID ${id}:`, error);
            })
    );

    await Promise.all(deletePromises);
    console.log(`Multi-delete finished. Success: ${successCount}, Fail: ${failCount}`);

    // Update local state based ONLY on successfully deleted IDs
    if (successfullyDeletedIds.size > 0) {
        flashcardsData = flashcardsData.filter(card => !successfullyDeletedIds.has(String(card.id)));
    }

    let message = `${successCount} card(s) deleted.`;
    if (failCount > 0) {
        message += ` ${failCount} failed or not found. Check console.`;
    }
    showStatusMessage(message, failCount > 0 ? 'warning' : 'success', 5000);

    closeDeleteOptionsModal();
    applyFiltersAndSearch(); // Re-filter and display
}

// Delete All Cards (via API with Auth)
async function deleteAllCards() {
    console.log("Action: deleteAllCards triggered");
    if (!isLoggedIn || flashcardsData.length === 0) { alert("No cards to delete."); return; }
    if (!confirm(`Delete ALL ${flashcardsData.length} cards? This cannot be undone.`)) {
        console.log("Action: deleteAllCards cancelled by user");
        return;
    }

    showStatusMessage("Deleting all cards...", 'info', 5000);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards/all`, { method: 'DELETE' }); // Uses fetchWithAuth

        if (!response.ok) { // 204 is ok
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.error || `Failed to delete all cards (status: ${response.status})`);
        }
        flashcardsData = []; // Clear local state on success
        showStatusMessage("All cards deleted.", 'success', 3000);
        closeDeleteOptionsModal();
        applyFiltersAndSearch();
    } catch (error) {
         if (!error.message.includes('Authentication failed')) {
            console.error("Error deleting all cards:", error);
            showStatusMessage(`Error deleting all cards: ${error.message}`, 'error', 5000);
         }
    }
}


// --- Edit Modal Logic (Modified for Auth) ---
function openEditModal() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: openEditModal triggered");
    if (!isLoggedIn || currentCardIndex === -1 || !flashcardsData[currentCardIndex]) {
         showStatusMessage("No card selected.", 'info'); return;
    }
    if (!editModal || !editQuestionInput || !editAnswerInput || !editCardIndexInput) {
        console.error("Edit modal elements not found!"); showStatusMessage("Error opening edit dialog.", 'error'); return;
    }
    const card = flashcardsData[currentCardIndex];
    editQuestionInput.value = card.question;
    editAnswerInput.value = card.answer;
    editCardIndexInput.value = card.id;
    editModal.style.display = "block";
}
function closeEditModal() {
    // ... (keep existing logic) ...
    console.log("Action: closeEditModal triggered");
    if (editModal) editModal.style.display = "none";
}

// Save Edit from Modal (via API with Auth)
async function saveEdit() {
    console.log("Action: saveEdit triggered");
     if (!isLoggedIn || !editModal || !editQuestionInput || !editAnswerInput || !editCardIndexInput) return;

    const cardId = editCardIndexInput.value;
    const newQuestion = editQuestionInput.value.trim();
    const newAnswer = editAnswerInput.value.trim();

    if (!cardId) { console.error("Invalid ID stored for editing."); alert("Error: Cannot identify card to save."); return; }
    if (!newQuestion || !newAnswer) { alert("Question and answer cannot be empty."); return; }

    const updatedCardData = { question: newQuestion, answer: newAnswer };
    showStatusMessage("Saving changes...", 'info', 3000);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards/${cardId}`, { // Uses fetchWithAuth
            method: 'PUT',
            body: JSON.stringify(updatedCardData)
        });

        const updatedCard = await response.json(); // Try parsing JSON

        if (!response.ok) {
             // Handle 404 Not Found (or not owned) specifically
             if (response.status === 404) {
                 throw new Error("Card not found or not owned by user.");
             } else {
                 throw new Error(updatedCard.error || `Failed to update card (status: ${response.status})`);
             }
        }

        // Update local state
        const indexToUpdate = flashcardsData.findIndex(card => String(card.id) === String(updatedCard.id)); // Compare IDs robustly
        if (indexToUpdate !== -1) {
            flashcardsData[indexToUpdate] = updatedCard;
        } else {
            console.warn("Updated card ID not found in local data after successful PUT. Reloading might be needed.");
            // Optionally add it anyway, or trigger a full reload
            // flashcardsData.push(updatedCard);
        }

        showStatusMessage("Card updated.", 'success', 2000);
        closeEditModal();
        // Display the potentially updated card (applyFiltersAndSearch might change index)
        displayCard(); // Display current card which should now be the updated one if index didn't change
        // applyFiltersAndSearch(); // Use this if filtering/searching might change after edit

    } catch (error) {
         if (!error.message.includes('Authentication failed')) {
            console.error("Error updating card:", error);
            showStatusMessage(`Error updating card: ${error.message}`, 'error', 5000);
         }
    }
}

// --- Shuffle, Reset, Clear Form (Modified for Auth) ---
function shuffleCards() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: shuffleCards triggered");
    if (!isLoggedIn || filteredIndices.length < 2) {
        showStatusMessage("Need at least 2 cards in view to shuffle.", 'info');
        return;
    }
    shuffleArray(filteredIndices);
    currentFilteredIndex = 0;
    currentCardIndex = filteredIndices[currentFilteredIndex]; // Update original index too
    displayCard();
    showStatusMessage("Cards shuffled.", 'info');
}

// Reset now just reloads data for the logged-in user
function resetData() {
    console.log("Action: resetData triggered");
    if (!isLoggedIn) {
        showStatusMessage("Please log in first.", 'info');
        return;
    }
    if (!confirm("Reset view and reload your cards from server?")) {
        console.log("Action: resetData cancelled by user");
        return;
    }
    // Clear local UI state, keep theme/palette
    searchTerm = '';
    showAnswerFirst = false;
    if (searchInput) searchInput.value = '';
    if (showAnswerFirstToggle) showAnswerFirstToggle.checked = false;
    // Reload data from backend
    loadData(); // This will re-fetch user's cards and call applyFiltersAndSearch
    showStatusMessage("Reloaded your cards from server.", 'info', 3000);
}
function clearFormFields(showMessage = true) {
    // ... (keep existing logic) ...
    console.log("Action: clearFormFields triggered");
    if (questionInput) questionInput.value = '';
    if (answerInput) answerInput.value = '';
    if (showMessage) showStatusMessage("Form cleared.", 'info', 1500);
}

// --- Status Message (No auth changes needed) ---
function showStatusMessage(message, type = 'info', duration = 3000) {
    // ... (keep existing logic) ...
    if (!statusMessageEl) return;
    statusMessageEl.textContent = message;
    statusMessageEl.className = `status-message status-${type}`;
    statusMessageEl.style.display = 'block';
    clearTimeout(statusTimeout);
    if (duration > 0) {
        statusTimeout = setTimeout(clearStatusMessage, duration);
    }
}
function clearStatusMessage() {
    if (statusMessageEl) statusMessageEl.style.display = 'none';
}

// --- Import Modal Logic (Modified for Auth) ---
function openImportModal() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: openImportModal triggered");
    if (!isLoggedIn) return;
    if (importModal) importModal.style.display = "block";
    if (jsonInput) jsonInput.value = '';
}
function closeImportModal() {
    // ... (keep existing logic) ...
    console.log("Action: closeImportModal triggered");
    if (importModal) importModal.style.display = "none";
}

// Import needs to POST new cards to backend (with Auth)
async function importFromJson() {
    console.log("Action: importFromJson triggered");
    if (!isLoggedIn || !jsonInput) return;
    const jsonString = jsonInput.value.trim();
    if (!jsonString) { alert("Import Error: Please paste JSON data."); return; }

    let potentialCards;
    try { potentialCards = JSON.parse(jsonString); }
    catch (error) { alert(`Import Error: Invalid JSON format.\n${error.message}`); return; }
    if (!Array.isArray(potentialCards)) { alert("Import Error: JSON must be an array."); return; }

    const validCardsData = [];
    const invalidEntries = [];

    potentialCards.forEach((item, index) => {
        if (item && typeof item === 'object' &&
            typeof item.question === 'string' && item.question.trim() !== '' &&
            typeof item.answer === 'string' && item.answer.trim() !== '')
        {
            validCardsData.push({
                question: item.question.trim(),
                answer: item.answer.trim()
            });
        } else {
            console.warn(`Invalid item at index ${index}:`, item);
            invalidEntries.push({ index: index, item: item });
        }
    });

    if (validCardsData.length === 0) {
        alert(`Import Error: No valid cards found.${invalidEntries.length > 0 ? ` ${invalidEntries.length} invalid entries ignored.` : ''}`);
        return;
    }

    showStatusMessage(`Importing ${validCardsData.length} card(s)...`, 'info', 10000);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/cards/bulk`, { // Uses fetchWithAuth
            method: 'POST',
            body: JSON.stringify(validCardsData)
        });

        const importResult = await response.json(); // Try parsing JSON

        if (!response.ok) {
             // Handle card limit (403) or other errors
             throw new Error(importResult.error || `Failed to import cards (status: ${response.status})`);
        }

        let successMessage = `${importResult.importedCount || validCardsData.length} card(s) imported.`;
        if (invalidEntries.length > 0) successMessage += ` ${invalidEntries.length} invalid entries ignored locally.`;
        showStatusMessage(successMessage, 'success', 5000);

        closeImportModal();
        loadData(); // Reload all data from backend after import
    } catch (error) {
         if (!error.message.includes('Authentication failed')) {
            console.error("Error importing cards:", error);
            showStatusMessage(`Error importing cards: ${error.message}`, 'error', 5000);
         }
    }
}

// --- Theme Functions (No auth changes needed) ---
function applyTheme() { /* ... keep existing ... */
    console.log(`Applying theme: ${currentTheme}`);
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    if (themeIcon) {
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (themeToggleBtn) {
        themeToggleBtn.title = `Toggle to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
    }
}
function setTheme(preference) { /* ... keep existing ... */
    console.log(`Setting theme preference to: ${preference}`);
    localStorage.setItem(THEME_PREFERENCE_KEY, preference);
    let actualTheme = preference;
    if (preference === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        console.log(`System preference detected: ${actualTheme}`);
    }
    if (actualTheme !== 'light' && actualTheme !== 'dark') {
        console.warn(`Invalid theme resolved: ${actualTheme}, defaulting to light.`);
        actualTheme = 'light';
    }
    currentTheme = actualTheme;
    applyTheme();
}
function toggleTheme() { /* ... keep existing ... */
    console.log("Action: toggleTheme triggered");
    const nextThemePreference = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(nextThemePreference);
}
function loadTheme() { /* ... keep existing ... */
    console.log("Action: loadTheme triggered");
    const savedPreference = localStorage.getItem(THEME_PREFERENCE_KEY);
    setTheme(savedPreference || 'system');
}

// --- Palette Functions (No auth changes needed) ---
function applyPalette(preference) { /* ... keep existing ... */
    console.log(`Applying palette: ${preference}`);
    document.body.classList.remove('palette-warm', 'palette-rainbow');
    if (preference === 'warm') {
        document.body.classList.add('palette-warm');
    } else if (preference === 'rainbow') {
        document.body.classList.add('palette-rainbow');
    }
}
function setPalette(preference) { /* ... keep existing ... */
    console.log(`Setting palette preference to: ${preference}`);
    if (preference !== 'default' && preference !== 'warm' && preference !== 'rainbow') {
        console.warn(`Invalid palette preference: ${preference}, defaulting to 'default'.`);
        preference = 'default';
    }
    localStorage.setItem(PALETTE_PREFERENCE_KEY, preference);
    applyPalette(preference);
}
function loadPalette() { /* ... keep existing ... */
    console.log("Action: loadPalette triggered");
    const savedPreference = localStorage.getItem(PALETTE_PREFERENCE_KEY);
    setPalette(savedPreference || 'default');
}

// --- Filter/Search Handlers (No auth changes needed) ---
function handleFilterChange() { /* No longer needed */ }
function handleSearchInput() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: handleSearchInput triggered");
    if (!isLoggedIn || !searchInput) return;
    searchTerm = searchInput.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFiltersAndSearch();
    }, 300);
}

// --- Other Handlers (Modified for Auth) ---
function exportToJson() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: exportToJson triggered");
    if (!isLoggedIn || flashcardsData.length === 0) {
        showStatusMessage("No cards to export.", 'info');
        return;
    }
    const exportData = flashcardsData.map(({ question, answer }) => ({ question, answer }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'flashcards_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showStatusMessage("Exported cards to JSON.", 'info');
}
function handleShowAnswerFirstToggle() {
    // ... (keep existing logic, add isLoggedIn check) ...
    console.log("Action: handleShowAnswerFirstToggle triggered");
    if (!isLoggedIn || !showAnswerFirstToggle) return;
    showAnswerFirst = showAnswerFirstToggle.checked;
    displayCard();
}
function updateProgressBar(currentNum, totalNum) {
    // ... (keep existing logic) ...
    if (!progressBar) return;
    const percentage = totalNum > 0 ? (currentNum / totalNum) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
}


// --- Navigation Button State Update (Modified for Auth) ---
function updateNavigationButtons() {
    // ... (keep existing logic, disable all if not logged in) ...
    if (!prevBtn || !nextBtn || !flipBtn || !editBtn || !deleteThisCardBtn || !shuffleBtn || !randomBtn || !deleteOptionsBtn || !importJsonBtn || !exportJsonBtn || !addCardBtn || !resetBtn || !reconnectBtn) return;

    const appActive = isLoggedIn; // Base condition: user must be logged in
    const hasCardsInView = appActive && filteredIndices.length > 0;
    const isFirstCard = currentFilteredIndex === 0;
    const isLastCard = currentFilteredIndex === filteredIndices.length - 1;

    // Disable everything if not logged in
    prevBtn.disabled = !hasCardsInView || isFirstCard;
    nextBtn.disabled = !hasCardsInView || isLastCard;
    flipBtn.disabled = !hasCardsInView;
    editBtn.disabled = !hasCardsInView;
    deleteThisCardBtn.disabled = !hasCardsInView;
    randomBtn.disabled = !appActive || filteredIndices.length < 2;
    shuffleBtn.disabled = !appActive || filteredIndices.length < 2;
    deleteOptionsBtn.disabled = !appActive || flashcardsData.length === 0;
    importJsonBtn.disabled = !appActive;
    exportJsonBtn.disabled = !appActive || flashcardsData.length === 0;
    addCardBtn.disabled = !appActive;
    resetBtn.disabled = !appActive;
    reconnectBtn.disabled = !appActive; // Reconnect only makes sense when logged in
}

// --- Keyboard Navigation (Modified for Auth) ---
function handleKeyPress(event) {
    // ... (keep existing logic, check isLoggedIn and auth view state) ...
    const authViewActive = authContainer && authContainer.style.display !== 'none';
    const mainAppActive = mainContainer && mainContainer.style.display !== 'none';

    // Handle Enter key in auth view
    if (authViewActive && event.key === 'Enter') {
        console.log("Action: handleKeyPress - Enter in auth view");
        if (document.activeElement === usernameInput || document.activeElement === passwordInput) {
            handleLogin(); // Attempt login on Enter in auth fields
        }
        return; // Don't process other keys in auth view
    }

    // Ignore keypresses if not logged in or auth view is active (except Enter handled above)
    if (!isLoggedIn || !mainAppActive || authViewActive) return;

    const modalIsOpen = (importModal && importModal.style.display === 'block') ||
                        (editModal && editModal.style.display === 'block') ||
                        (deleteOptionsModal && deleteOptionsModal.style.display === 'block');
    const typingInInput = document.activeElement === questionInput || document.activeElement === answerInput || document.activeElement === jsonInput || document.activeElement === searchInput || document.activeElement === editQuestionInput || document.activeElement === editAnswerInput;

    if (modalIsOpen || typingInInput) {
        if (event.key === 'Escape') {
            console.log("Action: handleKeyPress - Escape in modal/input");
            if (importModal && importModal.style.display === 'block') closeImportModal();
            if (editModal && editModal.style.display === 'block') closeEditModal();
            if (deleteOptionsModal && deleteOptionsModal.style.display === 'block') closeDeleteOptionsModal();
        }
        return;
    }

    console.log(`Action: handleKeyPress - Key: ${event.key}`);
    switch (event.key) {
        case 'ArrowLeft': if (prevBtn && !prevBtn.disabled) prevCard(); break;
        case 'ArrowRight': if (nextBtn && !nextBtn.disabled) nextCard(); break;
        case ' ': if (flipBtn && !flipBtn.disabled) { event.preventDefault(); flipCard(); } break;
        case 'r': if (randomBtn && !randomBtn.disabled) randomCard(); break;
        case 'e': if (editBtn && !editBtn.disabled) openEditModal(); break;
        case 'Delete': if (deleteThisCardBtn && !deleteThisCardBtn.disabled) deleteCurrentCard(); break;
    }
}

// --- Initialize Application (Modified for Auth) ---
function initializeApp() {
    console.log("Initializing app...");

    // Ensure loading indicator is hidden initially
    if (loadingIndicator) loadingIndicator.style.display = 'none';

    // Assign Modal Elements (already done above)
    importModal = document.getElementById('importModal');
    closeImportModalBtn = document.getElementById('closeImportModalBtn');
    jsonInput = document.getElementById('jsonInput');
    processImportBtn = document.getElementById('processImportBtn');
    cancelImportBtn = document.getElementById('cancelImportBtn');
    editModal = document.getElementById('editModal');
    closeEditModalBtn = document.getElementById('closeEditModalBtn');
    editQuestionInput = document.getElementById('editQuestionInput');
    editAnswerInput = document.getElementById('editAnswerInput');
    saveEditBtn = document.getElementById('saveEditBtn');
    cancelEditBtn = document.getElementById('cancelEditBtn');
    editCardIndexInput = document.getElementById('editCardIndexInput');
    deleteOptionsModal = document.getElementById('deleteOptionsModal');
    closeDeleteOptionsModalBtn = document.getElementById('closeDeleteOptionsModalBtn');
    deleteCardList = document.getElementById('deleteCardList');
    deleteAllCardsBtn = document.getElementById('deleteAllCardsBtn');
    deleteSelectedCardsBtn = document.getElementById('deleteSelectedCardsBtn');
    cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    // Attach Event Listeners
    // Auth
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    // Add Enter key listener for auth inputs
    if (usernameInput) usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    // Navigation & Core Actions
    if (flipBtn) flipBtn.addEventListener('click', flipCard);
    if (nextBtn) nextBtn.addEventListener('click', nextCard);
    if (prevBtn) prevBtn.addEventListener('click', prevCard);
    if (randomBtn) randomBtn.addEventListener('click', randomCard);
    if (editBtn) editBtn.addEventListener('click', openEditModal);
    if (deleteThisCardBtn) deleteThisCardBtn.addEventListener('click', deleteCurrentCard);
    if (deleteOptionsBtn) deleteOptionsBtn.addEventListener('click', openDeleteOptionsModal);
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleCards);
    if (resetBtn) resetBtn.addEventListener('click', resetData);
    if (reconnectBtn) reconnectBtn.addEventListener('click', loadData); // Reconnect now just reloads data if logged in
    // Add/Import/Export
    if (addCardBtn) addCardBtn.addEventListener('click', addCard);
    if (clearFormBtn) clearFormBtn.addEventListener('click', () => clearFormFields(true));
    if (importJsonBtn) importJsonBtn.addEventListener('click', openImportModal); else console.error("CRITICAL: importJsonBtn not found!");
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportToJson);
    // Theme & View Options
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    const themeDropdown = document.getElementById('themeDropdown');
    if (themeDropdown) {
        const themePrefButtons = themeDropdown.querySelectorAll('button[data-theme-preference]');
        themePrefButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preference = button.dataset.themePreference;
                if (preference) setTheme(preference);
            });
        });
    }
    const paletteDropdown = document.getElementById('paletteDropdown');
    if (paletteDropdown) {
        const palettePrefButtons = paletteDropdown.querySelectorAll('button[data-palette-preference]');
        palettePrefButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preference = button.dataset.palettePreference;
                if (preference) setPalette(preference);
            });
        });
    }
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    if (showAnswerFirstToggle) showAnswerFirstToggle.addEventListener('change', handleShowAnswerFirstToggle);

    // Modal Listeners
    if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', closeImportModal);
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeImportModal);
    if (processImportBtn) processImportBtn.addEventListener('click', importFromJson);
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);
    if (closeDeleteOptionsModalBtn) closeDeleteOptionsModalBtn.addEventListener('click', closeDeleteOptionsModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteOptionsModal);
    if (deleteSelectedCardsBtn) deleteSelectedCardsBtn.addEventListener('click', deleteSelectedCards);
    if (deleteAllCardsBtn) deleteAllCardsBtn.addEventListener('click', deleteAllCards);


    // Close modals on outside click
    window.addEventListener('click', (event) => {
        if (importModal && event.target == importModal) closeImportModal();
        if (editModal && event.target == editModal) closeEditModal();
        if (deleteOptionsModal && event.target == deleteOptionsModal) closeDeleteOptionsModal();
    });

    // Card flip listener
    if (flashcard) {
        flashcard.addEventListener('click', (event) => {
            if (!isLoggedIn || event.target.closest('button, input, textarea')) return;
            flipCard();
        });
    }

    // Keyboard navigation listener
    document.addEventListener('keydown', handleKeyPress);

    // Collapsible Section Listener
    const manageDeckToggle = document.getElementById('manageDeckToggle');
    const manageDeckContent = document.getElementById('manageDeckContent');
    const manageDeckIcon = manageDeckToggle ? manageDeckToggle.querySelector('.toggle-icon') : null;
    if (manageDeckToggle && manageDeckContent && manageDeckIcon) {
        const isCollapsed = localStorage.getItem(MANAGE_DECK_COLLAPSED_KEY) === 'true';
        if (isCollapsed) {
            manageDeckContent.style.maxHeight = '0px';
            manageDeckContent.style.opacity = '0';
            manageDeckToggle.classList.add('collapsed');
            manageDeckIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        } else {
            manageDeckContent.style.maxHeight = manageDeckContent.scrollHeight + "px";
            manageDeckIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        }
        manageDeckToggle.addEventListener('click', () => {
            const currentlyCollapsed = manageDeckToggle.classList.contains('collapsed');
            if (currentlyCollapsed) {
                manageDeckContent.style.maxHeight = manageDeckContent.scrollHeight + "px";
                manageDeckContent.style.opacity = '1';
                manageDeckIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
                manageDeckToggle.classList.remove('collapsed');
                localStorage.setItem(MANAGE_DECK_COLLAPSED_KEY, 'false');
            } else {
                manageDeckContent.style.maxHeight = '0px';
                manageDeckContent.style.opacity = '0';
                manageDeckIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
                manageDeckToggle.classList.add('collapsed');
                localStorage.setItem(MANAGE_DECK_COLLAPSED_KEY, 'true');
            }
        });
    }

    // Initial Load Actions
    loadTheme();
    loadPalette();

    // Check for existing token
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
        console.log("Found stored auth token.");
        authToken = storedToken;
        isLoggedIn = true;
        // Hide auth, show main app
        if (authContainer) authContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        loadData(); // Load data for the logged-in user
    } else {
        console.log("No stored auth token found.");
        // Show auth, hide main app (default state in HTML is already correct)
        if (authContainer) authContainer.style.display = 'block';
        if (mainContainer) mainContainer.style.display = 'none';
        updateNavigationButtons(); // Ensure buttons are disabled initially
    }

    // Add listener for system theme changes
    const systemThemeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMatcher.addEventListener('change', () => {
        console.log("System theme changed detected");
        const savedPreference = localStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedPreference === 'system') {
            console.log("Preference is 'system', re-applying theme based on new system setting.");
            setTheme('system');
        } else {
            console.log(`Preference is '${savedPreference}', ignoring system change.`);
        }
    });

    console.log("App initialization complete.");
}

// --- Wait for DOM Ready ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}