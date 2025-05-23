// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const morgan = require('morgan'); // Require morgan
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Setup DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const app = express();
const SALT_ROUNDS = 10; // For bcrypt hashing
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-very-strong-secret-key'; // CHANGE THIS and use environment variable!
const MAX_CARDS_PER_USER = 500;

if (JWT_SECRET === 'your-default-very-strong-secret-key') {
    console.warn("WARNING: Using default JWT_SECRET. Set a strong secret in your environment variables!");
}

// --- Middleware ---
app.use(morgan('dev')); // HTTP request logging

// Enable CORS - Restrict to deployed frontend URL and explicitly handle preflight
app.use(cors({
    origin: ['https://flashcardsgrune.netlify.app', 'https://fcg-dev.netlify.app'], // Allow both deployed and dev frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

app.use(express.json()); // Parse JSON request bodies

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Adjust based on provider requirements
  }
});

// --- Database Initialization ---
async function initializeDatabase() {
    let client; // Declare client outside try block
    try {
        client = await pool.connect();
        console.log('Connected to database!');

        // 1. Create users table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Users table checked/created successfully.');

        // 2. Create cards table if not exists (original structure)
        await client.query(`
            CREATE TABLE IF NOT EXISTS cards (
                id SERIAL PRIMARY KEY,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Cards table checked/created successfully.');

        // 3. Add user_id column to cards table if it doesn't exist
        const colCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' -- Adjust schema if needed
              AND table_name   = 'cards'
              AND column_name  = 'user_id';
        `);

        if (colCheck.rowCount === 0) {
            console.log('Adding user_id column to cards table...');
            // Add column and foreign key constraint. Making it nullable initially for existing data.
            // New entries MUST have user_id set by the application logic.
            await client.query(`
                ALTER TABLE cards
                ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
            `);
            // Optionally, add an index for performance
            await client.query(`CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);`);
            console.log('user_id column and index added to cards table.');
        } else {
            console.log('user_id column already exists in cards table.');
        }

    } catch (err) {
        console.error('Database initialization error:', err.stack);
        // Exit or handle error appropriately if DB init fails
        process.exit(1);
    } finally {
        if (client) {
            client.release(); // Ensure client is released
        }
    }
}

initializeDatabase(); // Run initialization

// --- Authentication Middleware ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        console.log('Auth Middleware: No token provided');
        return res.sendStatus(401); // if there isn't any token
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.log('Auth Middleware: Token verification failed:', err.message);
            return res.sendStatus(403); // Forbidden if token is invalid
        }
        // Attach user info (at least the ID) to the request object
        req.user = { id: userPayload.userId }; // Ensure payload property matches signing
        console.log(`Auth Middleware: Token verified for user ID: ${req.user.id}`);
        next(); // proceed to the next middleware or route handler
    });
}

// --- API Routes ---

// == Auth Routes ==
const authRouter = express.Router();

// POST /api/auth/register - Register a new user
authRouter.post('/register', async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    // Add more validation if needed (e.g., password complexity)

    try {
        // Check if username already exists
        const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userCheck.rowCount > 0) {
            return res.status(409).json({ error: 'Username already taken.' }); // 409 Conflict
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert new user
        await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            [username, passwordHash]
        );
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('Error registering user:', err.stack);
        next(err);
    }
});

// POST /api/auth/login - Log in a user
authRouter.post('/login', async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // Find user by username
        const result = await pool.query('SELECT id, password_hash FROM users WHERE username = $1', [username]);
        if (result.rowCount === 0) {
            console.log(`Login attempt failed: User not found - ${username}`);
            return res.status(401).json({ error: 'Invalid credentials.' }); // Unauthorized
        }

        const user = result.rows[0];

        // Compare password hash
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            console.log(`Login attempt failed: Incorrect password - ${username}`);
            return res.status(401).json({ error: 'Invalid credentials.' }); // Unauthorized
        }

        // Generate JWT
        const tokenPayload = { userId: user.id }; // Include user ID in payload
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' }); // Token expires in 1 day

        console.log(`Login successful for user ID: ${user.id}`);
        res.json({ token }); // Send token back to client
    } catch (err) {
        console.error('Error logging in user:', err.stack);
        next(err);
    }
});

app.use('/api/auth', authRouter); // Mount auth routes

// == Card Routes (Protected) ==
const cardRouter = express.Router();
cardRouter.use(authenticateToken); // Apply auth middleware to all card routes

// GET /api/cards - Fetch user's flashcards
cardRouter.get('/', async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT id, question, answer FROM cards WHERE user_id = $1 ORDER BY created_at ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(`Error fetching cards for user ${userId}:`, err.stack);
        next(err);
    }
});

// POST /api/cards - Add a new flashcard for the user
cardRouter.post('/', async (req, res, next) => {
    const userId = req.user.id;
    let { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ error: 'Question and answer are required.' });
    }

    const cleanQuestion = DOMPurify.sanitize(question);
    const cleanAnswer = DOMPurify.sanitize(answer);

    try {
        // Check card limit
        const countResult = await pool.query('SELECT COUNT(*) FROM cards WHERE user_id = $1', [userId]);
        const cardCount = parseInt(countResult.rows[0].count, 10);
        if (cardCount >= MAX_CARDS_PER_USER) {
            return res.status(403).json({ error: `Card limit (${MAX_CARDS_PER_USER}) reached.` }); // Forbidden
        }

        // Insert card with user_id
        const result = await pool.query(
            'INSERT INTO cards (question, answer, user_id) VALUES ($1, $2, $3) RETURNING id, question, answer',
            [cleanQuestion, cleanAnswer, userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(`Error adding card for user ${userId}:`, err.stack);
        next(err);
    }
});

// PUT /api/cards/:id - Update an existing flashcard for the user
cardRouter.put('/:id', async (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    let { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ error: 'Question and answer are required.' });
    }
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid card ID.' });
    }

    const cleanQuestion = DOMPurify.sanitize(question);
    const cleanAnswer = DOMPurify.sanitize(answer);
    const cardId = parseInt(id);

    try {
        // Update card only if it belongs to the user
        const result = await pool.query(
            'UPDATE cards SET question = $1, answer = $2 WHERE id = $3 AND user_id = $4 RETURNING id, question, answer',
            [cleanQuestion, cleanAnswer, cardId, userId]
        );
        if (result.rowCount === 0) {
            // Could be not found OR not owned by user
            return res.status(404).json({ error: 'Card not found or not owned by user.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating card ${cardId} for user ${userId}:`, err.stack);
        next(err);
    }
});

// DELETE /api/cards/all - Delete all flashcards for the user
cardRouter.delete('/all', async (req, res, next) => {
    const userId = req.user.id;
    console.log(`Received request: DELETE /api/cards/all for user ${userId}`);
    try {
        await pool.query('DELETE FROM cards WHERE user_id = $1', [userId]);
        console.log(`All cards deleted successfully for user ${userId}.`);
        res.status(204).send();
    } catch (err) {
        console.error(`Error deleting all cards for user ${userId}:`, err.stack);
        next(err);
    }
});

// DELETE /api/cards/:id - Delete a specific flashcard for the user
cardRouter.delete('/:id', async (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid card ID.' });
    }
    const cardId = parseInt(id);

    try {
        // Delete card only if it belongs to the user
        const result = await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [cardId, userId]);
        if (result.rowCount === 0) {
            // Could be not found OR not owned by user
            return res.status(404).json({ error: 'Card not found or not owned by user.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(`Error deleting card ${cardId} for user ${userId}:`, err.stack);
        next(err);
    }
});

// POST /api/cards/bulk - Add multiple flashcards for the user
cardRouter.post('/bulk', async (req, res, next) => {
    const userId = req.user.id;
    const cards = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: 'Request body must be a non-empty array of cards.' });
    }

    const validCards = [];
    for (const card of cards) {
        if (!card.question || !card.answer) {
            return res.status(400).json({ error: 'Each card in the array must have question and answer.' });
        }
        validCards.push({
            question: DOMPurify.sanitize(card.question),
            answer: DOMPurify.sanitize(card.answer)
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check card limit before inserting
        const countResult = await client.query('SELECT COUNT(*) FROM cards WHERE user_id = $1 FOR UPDATE', [userId]); // Lock rows for count
        const currentCardCount = parseInt(countResult.rows[0].count, 10);
        if (currentCardCount + validCards.length > MAX_CARDS_PER_USER) {
            await client.query('ROLLBACK'); // Abort transaction
            return res.status(403).json({ error: `Import exceeds card limit (${MAX_CARDS_PER_USER}). Current count: ${currentCardCount}.` });
        }

        let importedCount = 0;
        for (const card of validCards) {
            await client.query(
                'INSERT INTO cards (question, answer, user_id) VALUES ($1, $2, $3)',
                [card.question, card.answer, userId]
            );
            importedCount++;
        }

        await client.query('COMMIT');
        res.status(201).json({ importedCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error bulk inserting cards for user ${userId}:`, err.stack);
        next(err);
    } finally {
        client.release();
    }
});

app.use('/api/cards', cardRouter); // Mount card routes under /api/cards

// --- Basic Error Handling ---
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  // Avoid sending stack trace in production
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { app, pool }; // Export for potential testing