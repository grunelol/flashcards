// --- DOM Elements ---
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
const questionInput = document.getElementById('questionInput');
const answerInput = document.getElementById('answerInput');
const addCardBtn = document.getElementById('addCardBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const statusMessageEl = document.getElementById('statusMessage');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
const filterStatusSelect = document.getElementById('filterStatus');
const searchInput = document.getElementById('searchInput');
const showAnswerFirstToggle = document.getElementById('showAnswerFirstToggle');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

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
let editCardIndexInput = null; // Now stores the card's unique ID from the backend

let deleteOptionsModal = null;
let closeDeleteOptionsModalBtn = null;
let deleteCardList = null;
let deleteAllCardsBtn = null;
let deleteSelectedCardsBtn = null;
let cancelDeleteBtn = null;

// --- API Endpoint ---
const API_BASE_URL = '/api'; // Replace with your actual backend URL if different

// --- State Variables ---
let flashcardsData = []; // Holds ALL card objects { id, question, answer } from backend
// Removed defaultFlashcardsData - data now comes solely from backend
let currentCardIndex = -1; // Index in the *original* flashcardsData array. -1 means none selected.
let isFlipped = false;
let statusTimeout;
let currentTheme = 'light';
let currentFilter = 'all'; // Only 'all' is used now
let searchTerm = '';
let showAnswerFirst = false;
let filteredIndices = []; // Array of indices from flashcardsData matching current filter/search
let currentFilteredIndex = 0; // Index within filteredIndices array
let searchTimeout;

// --- Core Functions ---

// Load data from Backend API
async function loadData() {
    showStatusMessage("Loading cards...", 'info', 5000); // Indicate loading
    try {
        const response = await fetch(`${API_BASE_URL}/cards`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Basic validation
        if (!Array.isArray(data) || !data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'question' in item && 'answer' in item)) {
             console.error("Invalid data structure received from API:", data);
             throw new Error("Invalid data format from server.");
        }
        flashcardsData = data;
        clearStatusMessage(); // Clear loading message on success
        console.log(`Loaded ${flashcardsData.length} cards from backend.`);
    } catch (error) {
        console.error("Error loading cards from backend:", error);
        flashcardsData = []; // Reset to empty on error
        showStatusMessage(`Error loading cards: ${error.message}. Please ensure backend is running.`, 'error', 10000);
    }

    // Apply initial filters and display
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFiltersAndSearch);
    } else {
        applyFiltersAndSearch();
    }
}

// Save data function is removed - Replaced by specific API calls (add, update, delete)

// Apply Filters and Search
function applyFiltersAndSearch() {
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


// Display current card
function displayCard() {
    if (!flashcardContainer || !flashcardFront || !flashcardBack || !currentCardNumEl || !totalCardsEl || !progressText) return;
    flashcardContainer.classList.remove('status-learned', 'status-difficult');

    if (filteredIndices.length === 0 || currentFilteredIndex >= filteredIndices.length || currentCardIndex === -1) {
        flashcardFront.textContent = "No cards match search.";
        flashcardBack.textContent = "Clear search or add cards.";
        if (flashcard) flashcard.classList.remove('flipped');
        isFlipped = false;
        currentCardNumEl.textContent = 0;
        totalCardsEl.textContent = 0;
        progressText.textContent = "Card 0 / 0";
        updateProgressBar(0, 0);
        currentCardIndex = -1;
    } else {
        // currentCardIndex should be the correct original index
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

// Flip card
function flipCard() {
    if (filteredIndices.length > 0 && flashcard) {
        flashcard.classList.toggle('flipped');
        isFlipped = !isFlipped;
    }
}

// Navigate next
function nextCard() {
    if (currentFilteredIndex < filteredIndices.length - 1) {
        currentFilteredIndex++;
        displayCard();
    }
}

// Navigate previous
function prevCard() {
    if (currentFilteredIndex > 0) {
        currentFilteredIndex--;
        displayCard();
    }
}

// Random Card
function randomCard() {
    if (filteredIndices.length > 1) {
        let randomIndex;
        do { randomIndex = Math.floor(Math.random() * filteredIndices.length); }
        while (randomIndex === currentFilteredIndex);
        currentFilteredIndex = randomIndex;
        displayCard();
    } else if (filteredIndices.length === 1) { showStatusMessage("Only one card in view.", 'info', 1500); }
    else { showStatusMessage("No cards available.", 'info', 1500); }
}

// Add new card (via API)
async function addCard() {
    if (!questionInput || !answerInput) return;
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (!question || !answer) { showStatusMessage("Enter question and answer.", 'error', 3000); return; }

    const newCardData = { question, answer };
    showStatusMessage("Adding card...", 'info', 3000);
    try {
        const response = await fetch(`${API_BASE_URL}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCardData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to add card.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const addedCard = await response.json(); // Get the card with ID from backend
        flashcardsData.push(addedCard); // Add to local state
        clearFormFields(false);
        showStatusMessage("Card added.", 'success', 2000);
        applyFiltersAndSearch(); // Re-filter
        // Navigate to the new card
        const newCardOriginalIndex = flashcardsData.length - 1;
        const newCardFilteredIndex = filteredIndices.indexOf(newCardOriginalIndex);
        if (newCardFilteredIndex !== -1) {
            currentFilteredIndex = newCardFilteredIndex;
            displayCard();
        }
    } catch (error) {
        console.error("Error adding card:", error);
        showStatusMessage(`Error adding card: ${error.message}`, 'error', 5000);
    }
}

// Delete *current* card (via API)
async function deleteCurrentCard() {
    if (currentCardIndex === -1 || !flashcardsData[currentCardIndex]) {
        showStatusMessage("No card selected.", 'info'); return;
    }
    const cardToDelete = flashcardsData[currentCardIndex];
    if (!confirm(`Delete this card?\nQ: ${cardToDelete.question}`)) return;

    showStatusMessage("Deleting card...", 'info', 3000);
    try {
        const response = await fetch(`${API_BASE_URL}/cards/${cardToDelete.id}`, { method: 'DELETE' });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: 'Failed to delete card.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        // Remove from local state on success
        const originalIndexToDelete = currentCardIndex;
        flashcardsData.splice(originalIndexToDelete, 1);
        showStatusMessage("Card deleted.", 'info', 2000);
        applyFiltersAndSearch(); // Re-filter and display
    } catch (error) {
        console.error("Error deleting card:", error);
        showStatusMessage(`Error deleting card: ${error.message}`, 'error', 5000);
    }
}

// --- Delete Options Modal Logic ---

// Open Delete Options Modal
function openDeleteOptionsModal() {
    if (!deleteOptionsModal || !deleteCardList) {
        console.error("Delete Options modal elements not found!");
        showStatusMessage("Error opening delete options.", 'error');
        return;
    }
    deleteCardList.innerHTML = '';
    if (flashcardsData.length === 0) {
        deleteCardList.innerHTML = '<p>No cards in the deck.</p>';
    } else {
        // Use card ID as value
        flashcardsData.forEach((card) => {
            const item = document.createElement('div');
            item.className = 'delete-card-item';
            item.innerHTML = `
                <input type="checkbox" value="${card.id}" id="del-chk-${card.id}">
                <label for="del-chk-${card.id}"><span>${card.question}</span></label>
            `;
            deleteCardList.appendChild(item);
        });
    }
    deleteOptionsModal.style.display = 'block';
}

// Close Delete Options Modal
function closeDeleteOptionsModal() {
    if (deleteOptionsModal) {
        deleteOptionsModal.style.display = 'none';
    }
}

// Delete Selected Cards (via API)
async function deleteSelectedCards() {
    if (!deleteCardList) return;
    const checkboxes = deleteCardList.querySelectorAll('input[type="checkbox"]:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.value); // Get IDs

    if (idsToDelete.length === 0) {
        alert("No cards selected to delete."); return;
    }
    if (!confirm(`Delete the ${idsToDelete.length} selected card(s)? This cannot be undone.`)) return;

    showStatusMessage(`Deleting ${idsToDelete.length} card(s)...`, 'info', 5000);
    let successCount = 0;
    let failCount = 0;

    // Send delete requests (could be parallel or sequential)
    // Parallel example:
    const deletePromises = idsToDelete.map(id =>
        fetch(`${API_BASE_URL}/cards/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to delete card ID ${id}: ${response.status}`);
                }
            })
            .catch(error => {
                failCount++;
                console.error(`Error deleting card ID ${id}:`, error);
            })
    );

    await Promise.all(deletePromises);

    // Update local state based on successful deletions
    const idsToDeleteSet = new Set(idsToDelete); // Use original list for filtering state
    flashcardsData = flashcardsData.filter(card => !idsToDeleteSet.has(card.id)); // Filter by ID

    let message = `${successCount} card(s) deleted.`;
    if (failCount > 0) {
        message += ` ${failCount} failed. Check console for details.`;
    }
    showStatusMessage(message, failCount > 0 ? 'error' : 'success', 5000);

    closeDeleteOptionsModal();
    applyFiltersAndSearch(); // Re-filter and display
}

// Delete All Cards (via API - requires backend endpoint)
async function deleteAllCards() {
    if (flashcardsData.length === 0) { alert("No cards to delete."); return; }
    if (!confirm(`Delete ALL ${flashcardsData.length} cards? This cannot be undone.`)) return;

    showStatusMessage("Deleting all cards...", 'info', 5000);
    try {
        // Assuming backend has an endpoint like DELETE /api/cards/all or similar
        const response = await fetch(`${API_BASE_URL}/cards/all`, { method: 'DELETE' }); // Adjust endpoint if needed
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to delete all cards.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        flashcardsData = []; // Clear local state on success
        showStatusMessage("All cards deleted.", 'success', 3000);
        closeDeleteOptionsModal();
        applyFiltersAndSearch();
    } catch (error) {
        console.error("Error deleting all cards:", error);
        showStatusMessage(`Error deleting all cards: ${error.message}`, 'error', 5000);
    }
}


// --- Edit Modal Logic ---
function openEditModal() {
    if (currentCardIndex === -1 || !flashcardsData[currentCardIndex]) {
         showStatusMessage("No card selected.", 'info'); return;
    }
    if (!editModal || !editQuestionInput || !editAnswerInput || !editCardIndexInput) {
        console.error("Edit modal elements not found!"); showStatusMessage("Error opening edit dialog.", 'error'); return;
    }
    const card = flashcardsData[currentCardIndex];
    editQuestionInput.value = card.question;
    editAnswerInput.value = card.answer;
    editCardIndexInput.value = card.id; // Store the card's unique ID
    editModal.style.display = "block";
}
function closeEditModal() { if (editModal) editModal.style.display = "none"; }

// Save Edit from Modal (via API)
async function saveEdit() {
     if (!editModal || !editQuestionInput || !editAnswerInput || !editCardIndexInput) {
        console.error("Edit modal elements not found!"); alert("Error saving changes."); return;
    }
    const cardId = editCardIndexInput.value; // Get the ID
    const newQuestion = editQuestionInput.value.trim();
    const newAnswer = editAnswerInput.value.trim();

    if (!cardId) { console.error("Invalid ID stored for editing."); alert("Error: Cannot identify card to save."); return; }
    if (!newQuestion || !newAnswer) { alert("Question and answer cannot be empty."); return; }

    const updatedCardData = { question: newQuestion, answer: newAnswer };
    showStatusMessage("Saving changes...", 'info', 3000);
    try {
        const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
            method: 'PUT', // Or PATCH
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCardData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update card.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const updatedCard = await response.json(); // Get updated card from backend

        // Update local state
        const indexToUpdate = flashcardsData.findIndex(card => card.id === updatedCard.id);
        if (indexToUpdate !== -1) {
            flashcardsData[indexToUpdate] = updatedCard;
        } else {
            // Should not happen if ID was valid, but handle defensively
            flashcardsData.push(updatedCard); // Or reload all data?
        }

        showStatusMessage("Card updated.", 'success', 2000);
        closeEditModal();
        applyFiltersAndSearch(); // Re-filter and display
    } catch (error) {
        console.error("Error updating card:", error);
        showStatusMessage(`Error updating card: ${error.message}`, 'error', 5000);
    }
}

// --- Shuffle, Reset, Clear Form ---
function shuffleCards() { /* ... keep existing ... */ }
// Reset now just reloads data from backend, doesn't clear localStorage for cards
function resetData() {
    if (!confirm("Reset view and reload all cards from server? Unsaved changes will be lost.")) return;
    // Clear local UI state, keep theme
    searchTerm = '';
    showAnswerFirst = false;
    if (searchInput) searchInput.value = '';
    if (showAnswerFirstToggle) showAnswerFirstToggle.checked = false;
    // Reload data from backend
    loadData(); // This will re-fetch and call applyFiltersAndSearch
    showStatusMessage("Reloaded cards from server.", 'info', 3000);
}
function clearFormFields(showMessage = true) { /* ... keep existing ... */ }

// --- Status Message ---
function showStatusMessage(message, type = 'info', duration = 3000) { /* ... keep existing ... */ }
function clearStatusMessage() { /* ... keep existing ... */ }

// --- Import Modal Logic (Needs update for backend) ---
function openImportModal() { /* ... keep existing ... */ }
function closeImportModal() { /* ... keep existing ... */ }
// Import needs to POST new cards to backend, potentially in batches
async function importFromJson() {
    if (!jsonInput) { alert("Error: Cannot find JSON input area."); return; }
    const jsonString = jsonInput.value.trim();
    if (!jsonString) { alert("Import Error: Please paste JSON data."); return; }

    let potentialCards;
    try { potentialCards = JSON.parse(jsonString); }
    catch (error) { alert(`Import Error: Invalid JSON format.\n${error.message}`); return; }
    if (!Array.isArray(potentialCards)) { alert("Import Error: JSON must be an array."); return; }

    const validCardsData = []; // Data to send to backend
    const invalidEntries = [];

    potentialCards.forEach((item, index) => {
        if (item && typeof item === 'object' &&
            typeof item.question === 'string' && item.question.trim() !== '' &&
            typeof item.answer === 'string' && item.answer.trim() !== '')
        {
            // Don't check duplicates locally, let backend handle if needed
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
        // Assuming backend has a bulk import endpoint POST /api/cards/bulk
        const response = await fetch(`${API_BASE_URL}/cards/bulk`, { // Adjust endpoint if needed
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validCardsData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to import cards.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const importResult = await response.json(); // Backend might return count or new cards

        let successMessage = `${importResult.importedCount || validCardsData.length} card(s) imported.`; // Adjust based on backend response
        if (invalidEntries.length > 0) successMessage += ` ${invalidEntries.length} invalid entries ignored locally.`;
        showStatusMessage(successMessage, 'success', 5000);

        closeImportModal();
        loadData(); // Reload all data from backend after import
    } catch (error) {
        console.error("Error importing cards:", error);
        showStatusMessage(`Error importing cards: ${error.message}`, 'error', 5000);
    }
}

// --- Theme Functions ---
function toggleTheme() { /* ... keep existing ... */ }
function applyTheme() { /* ... keep existing ... */ }
function loadTheme() { /* ... keep existing ... */ }

// --- Filter/Search Handlers ---
function handleFilterChange() { /* No longer needed */ }
function handleSearchInput() { /* ... keep existing ... */ }

// --- Other Handlers ---
function exportToJson() { /* ... keep existing ... */ }
function handleShowAnswerFirstToggle() { /* ... keep existing ... */ }
function updateProgressBar(currentNum, totalNum) { /* ... keep existing ... */ }


// --- Navigation Button State Update ---
function updateNavigationButtons() {
    if (!prevBtn || !nextBtn || !flipBtn || !editBtn || !deleteThisCardBtn || !shuffleBtn || !randomBtn || !deleteOptionsBtn) return;
    const hasCardsInView = filteredIndices.length > 0;
    const isFirstCard = currentFilteredIndex === 0;
    const isLastCard = currentFilteredIndex === filteredIndices.length - 1;
    prevBtn.disabled = !hasCardsInView || isFirstCard;
    nextBtn.disabled = !hasCardsInView || isLastCard;
    flipBtn.disabled = !hasCardsInView;
    editBtn.disabled = !hasCardsInView;
    deleteThisCardBtn.disabled = !hasCardsInView;
    randomBtn.disabled = filteredIndices.length < 2;
    shuffleBtn.disabled = filteredIndices.length < 2;
    deleteOptionsBtn.disabled = flashcardsData.length === 0;
}

// --- Keyboard Navigation ---
function handleKeyPress(event) {
    const modalIsOpen = (importModal && importModal.style.display === 'block') ||
                        (editModal && editModal.style.display === 'block') ||
                        (deleteOptionsModal && deleteOptionsModal.style.display === 'block');
    const typingInInput = document.activeElement === questionInput || document.activeElement === answerInput || document.activeElement === jsonInput || document.activeElement === searchInput || document.activeElement === editQuestionInput || document.activeElement === editAnswerInput;

    if (modalIsOpen || typingInInput) {
        if (event.key === 'Escape') {
            if (importModal && importModal.style.display === 'block') closeImportModal();
            if (editModal && editModal.style.display === 'block') closeEditModal();
            if (deleteOptionsModal && deleteOptionsModal.style.display === 'block') closeDeleteOptionsModal();
        }
        return;
    }

    switch (event.key) {
        case 'ArrowLeft': if (prevBtn && !prevBtn.disabled) prevCard(); break;
        case 'ArrowRight': if (nextBtn && !nextBtn.disabled) nextCard(); break;
        case ' ': if (flipBtn && !flipBtn.disabled) { event.preventDefault(); flipCard(); } break;
        case 'r': if (randomBtn && !randomBtn.disabled) randomCard(); break;
        case 'e': if (editBtn && !editBtn.disabled) openEditModal(); break;
        case 'Delete': if (deleteThisCardBtn && !deleteThisCardBtn.disabled) deleteCurrentCard(); break;
    }
}

// --- Initialize Application ---
function initializeApp() {
    console.log("Initializing app...");

    // Assign Modal Elements
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
    // Navigation & Core Actions
    if (flipBtn) flipBtn.addEventListener('click', flipCard);
    if (nextBtn) nextBtn.addEventListener('click', nextCard);
    if (prevBtn) prevBtn.addEventListener('click', prevCard);
    if (randomBtn) randomBtn.addEventListener('click', randomCard);
    if (editBtn) editBtn.addEventListener('click', openEditModal);
    if (deleteThisCardBtn) deleteThisCardBtn.addEventListener('click', deleteCurrentCard);
    if (deleteOptionsBtn) deleteOptionsBtn.addEventListener('click', openDeleteOptionsModal);
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleCards);
    if (resetBtn) resetBtn.addEventListener('click', resetData); // Reset now reloads from backend
    // Add/Import/Export
    if (addCardBtn) addCardBtn.addEventListener('click', addCard);
    if (clearFormBtn) clearFormBtn.addEventListener('click', () => clearFormFields(true));
    if (importJsonBtn) importJsonBtn.addEventListener('click', openImportModal); else console.error("CRITICAL: importJsonBtn not found!");
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportToJson);
    // Theme & View Options
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    // if (filterStatusSelect) filterStatusSelect.addEventListener('change', handleFilterChange); // No longer needed
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    if (showAnswerFirstToggle) showAnswerFirstToggle.addEventListener('change', handleShowAnswerFirstToggle);

    // Modal Listeners (Import)
    if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', closeImportModal);
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeImportModal);
    if (processImportBtn) processImportBtn.addEventListener('click', importFromJson);
    // Modal Listeners (Edit)
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveEdit);
    // Modal Listeners (Delete Options)
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
            if (event.target.closest('button, input, textarea')) return;
            flipCard();
        });
    }

    // Keyboard navigation listener
    document.addEventListener('keydown', handleKeyPress);

    // Initial Load Actions
    loadTheme(); // Load theme first (uses localStorage)
    loadData(); // Load card data from backend
    console.log("App initialization complete.");
}

// --- Wait for DOM Ready ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}