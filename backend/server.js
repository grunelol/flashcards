// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// --- Middleware ---
// Log ALL incoming requests (before other middleware)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next(); // Pass control to the next middleware
});

// Enable CORS - Restrict to deployed frontend URL and explicitly handle preflight
app.use(cors({
    origin: 'https://flashcardsgrune.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow common headers
    preflightContinue: false, // Let CORS middleware handle OPTIONS
    optionsSuccessStatus: 204 // Standard success for preflight
}));
// Parse JSON request bodies
app.use(express.json());

// --- Database Connection ---
// Use DATABASE_URL from environment variables (provided by Render or .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add SSL configuration if required by the hosting provider (like Render)
  ssl: {
    rejectUnauthorized: false // Necessary for some providers like Heroku/Render free tier
  }
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to database!');
  // Create table if it doesn't exist (simple initialization)
  client.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `, (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error creating cards table', err.stack);
    }
    console.log('Cards table checked/created successfully.');
  });
});


// --- API Routes ---

// GET /cards - Fetch all flashcards
app.get('/cards', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, question, answer FROM cards ORDER BY created_at ASC');
    // Convert id to string to match frontend expectation if necessary, though numeric is often fine.
    // Let's keep it numeric for now as pg returns numbers for SERIAL. Frontend should handle it.
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cards:', err.stack);
    next(err); // Pass error to the error handler
  }
});

// POST /cards - Add a new flashcard
app.post('/cards', async (req, res, next) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO cards (question, answer) VALUES ($1, $2) RETURNING id, question, answer',
      [question, answer]
    );
    res.status(201).json(result.rows[0]); // Return the newly created card
  } catch (err) {
    console.error('Error adding card:', err.stack);
    next(err);
  }
});

// PUT /cards/:id - Update an existing flashcard
app.put('/cards/:id', async (req, res, next) => {
  const { id } = req.params;
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }
  if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid card ID.' });
  }
  try {
    const result = await pool.query(
      'UPDATE cards SET question = $1, answer = $2 WHERE id = $3 RETURNING id, question, answer',
      [question, answer, parseInt(id)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Card not found.' });
    }
    res.json(result.rows[0]); // Return the updated card
  } catch (err) {
    console.error(`Error updating card ${id}:`, err.stack);
    next(err);
  }
});

// DELETE /cards/:id - Delete a specific flashcard
app.delete('/cards/:id', async (req, res, next) => {
  const { id } = req.params;
   if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid card ID.' });
  }
  try {
    const result = await pool.query('DELETE FROM cards WHERE id = $1', [parseInt(id)]);
    if (result.rowCount === 0) {
      // It's debatable whether to return 404 if the item didn't exist.
      // 204 No Content is often used for successful DELETE regardless.
      return res.status(404).json({ error: 'Card not found or already deleted.' });
    }
    res.status(204).send(); // Success, no content to return
  } catch (err) {
    console.error(`Error deleting card ${id}:`, err.stack);
    next(err);
  }
});

// DELETE /cards/all - Delete all flashcards
app.delete('/cards/all', async (req, res, next) => {
  console.log(`Received request: DELETE ${req.path}`); // Add logging
  try {
    // TRUNCATE is faster than DELETE FROM for clearing a whole table
    // Use with caution! It also resets sequences (like SERIAL id).
    // If foreign keys exist, DELETE FROM might be required or TRUNCATE ... CASCADE.
    // Using DELETE FROM instead of TRUNCATE for potentially better compatibility
    await pool.query('DELETE FROM cards');
    console.log('All cards deleted successfully.');
    res.status(204).send(); // Success, no content
  } catch (err) {
    console.error('Error deleting all cards:', err.stack);
    next(err);
  }
});

// POST /cards/bulk - Add multiple flashcards
app.post('/cards/bulk', async (req, res, next) => {
  const cards = req.body;
  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Request body must be a non-empty array of cards.' });
  }

  // Basic validation for each card in the array
  for (const card of cards) {
    if (!card.question || !card.answer) {
      return res.status(400).json({ error: 'Each card in the array must have question and answer.' });
    }
  }

  // Use a transaction for bulk insert
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let importedCount = 0;
    // Note: This inserts one by one within a transaction. For very large imports,
    // a more optimized bulk insert method (like using pg-copy-streams or generating
    // a single INSERT with multiple VALUES) might be better.
    // However, this is simpler and safer for moderate numbers.
    for (const card of cards) {
      await client.query(
        'INSERT INTO cards (question, answer) VALUES ($1, $2)',
        [card.question, card.answer]
      );
      importedCount++;
    }
    await client.query('COMMIT');
    res.status(201).json({ importedCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error bulk inserting cards:', err.stack);
    next(err);
  } finally {
    client.release();
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Basic error handling (optional but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = { app, pool }; // Export for potential testing or modular routes