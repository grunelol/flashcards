# Flashcards App Deployment Guide (dev Branch)

This guide provides step-by-step instructions for deploying the Flashcards application frontend (HTML, CSS, JS) to Netlify and the backend (Node.js/Express) to Render. These instructions assume you are deploying the `dev` branch of your project.

## Prerequisites

1.  **Git Repository:** Your project code must be hosted on a Git provider like GitHub, GitLab, or Bitbucket. This guide assumes GitHub.
2.  **Accounts:** You need free accounts on:
    *   [Netlify](https://www.netlify.com/) (for the frontend)
    *   [Render](https://render.com/) (for the backend)
3.  **Code Structure:** Ensure your project has the following structure (or similar):
    ```
    flashcards/
    ├── backend/             # Contains server.js, package.json, etc.
    │   ├── server.js
    │   └── package.json
    │   └── ...
    ├── index.html           # Frontend files
    ├── script.js
    ├── style.css
    ├── DEPLOYMENT_GUIDE.md  # This file
    └── ...
    ```
4.  **Backend API URL:** Make sure the `API_BASE_URL` constant in your frontend `script.js` file points to the *future* URL of your deployed Render backend. You'll get this URL during the Render deployment process. You might need to deploy the backend first, get its URL, update `script.js`, commit/push the change, and *then* deploy the frontend.

## Part 1: Creating the Shared PostgreSQL Database on Render

Your backend needs a database. Since Render's free tier typically allows only one free PostgreSQL database, **you will use this single database for both your `dev` and `main` branch deployments.**

**⚠️ WARNING: Sharing a database between development/testing (`dev`) and production (`main`) is risky!** Changes made via the `dev` application (adding, deleting, editing cards) will directly affect the live data used by the `main` application. Proceed only if you understand and accept this risk.

1.  **Log in to Render:** Go to [dashboard.render.com](https://dashboard.render.com/) and log in.
2.  **Create PostgreSQL Database (if you haven't already):**
    *   If you already have a `flashcards-db` (or similar) database from previous attempts, you can use that one. Skip to step 4.
    *   If not, click the "**New +**" button and select "**PostgreSQL**".
    *   Give it a unique **Name** (e.g., `flashcards-db`).
    *   Optionally change the **Database** name and **User** (or leave defaults).
    *   Choose a **Region**.
    *   Select the **Free** plan.
    *   Click "**Create Database**".
3.  **Wait for Creation:** The database will take a few minutes to become available.
4.  **Copy the Internal Connection String:** Go to your database's page on Render and find the "**Connections**" section. Copy the "**Internal Connection String**". This string is required for your backend service to connect. It looks like `postgres://user:password@internal-host:port/database`.

## Part 2: Deploying the Backend (Node.js/Express) to Render

Now, deploy the backend code for the `dev` branch and connect it to the shared database.

1.  **Create a New Web Service:**
    *   Click the "**New +**" button and select "**Web Service**".
    *   Connect your GitHub account if you haven't already.
    *   Choose your flashcards repository.
2.  **Configure the Web Service:**
    *   **Name:** Give your service a unique name (e.g., `flashcards-backend-dev`). This will be part of your URL.
    *   **Region:** Choose the *same region* as your database if possible.
    *   **Branch:** **Crucially, select the `dev` branch.**
    *   **Root Directory:** Set this to `backend`. Render needs to know where your `package.json` for the backend is located.
    *   **Runtime:** Select "Node".
    *   **Build Command:** `npm install` (or `yarn` if you used Yarn).
    *   **Start Command:** `node server.js`.
    *   **Plan:** Select the "Free" plan.
3.  **Add Environment Variable for Database:**
    *   Scroll down to the "**Environment**" section (you might need to click "Advanced" first).
    *   Click "**Add Environment Variable**".
    *   Set the **Key** to `DATABASE_URL`.
    *   Paste the **Internal Connection String** you copied from your **single shared `flashcards-db`** database settings into the **Value** field.
    *   **Important:** Your `backend/server.js` code specifically looks for this `DATABASE_URL` variable (and includes SSL settings needed for Render).
    *   **Reminder:** Both your `dev` service and your future `main` service will use this *same* connection string, pointing to the *same* database.
4.  **Create Web Service:** Click the "**Create Web Service**" button at the bottom.
5.  **Wait for Deployment:** Render will pull your code, install dependencies, and start the server. Watch the logs. You should see messages like "Connected to database!" and "Server listening on port..." without the `ECONNREFUSED` error.
6.  **Get the Backend URL:** Once deployed successfully, Render will provide you with a public URL for your backend service (e.g., `https://flashcards-backend-dev.onrender.com`). **Copy this URL.**

## Part 3: Updating Frontend with Backend URL

1.  **Edit `script.js`:** Open your local `script.js` file.
2.  **Update `API_BASE_URL`:** Find the line `const API_BASE_URL = '...';` and replace the placeholder URL with the actual URL you copied from Render in the previous step.
    ```javascript
    // Example:
    const API_BASE_URL = 'https://flashcards-backend-dev.onrender.com';
    ```
3.  **Commit and Push:** Save the changes to `script.js`, commit them to your local `dev` branch, and push the changes to GitHub.
    ```bash
    git add script.js
    git commit -m "Update API_BASE_URL for deployed backend"
    git push origin dev
    ```
    *Wait for the push to complete before proceeding.*

## Part 4: Deploying the Frontend (HTML/CSS/JS) to Netlify

Netlify is excellent for hosting static sites like your frontend.

1.  **Log in to Netlify:** Go to [app.netlify.com](https://app.netlify.com/) and log in.
2.  **Add a New Site:**
    *   Click "Add new site" (or similar button) and choose "Import an existing project".
    *   Connect to your Git provider (GitHub).
    *   Authorize Netlify to access your repositories.
    *   Choose your flashcards repository from the list.
3.  **Configure Site Settings:**
    *   **Owner:** Choose your team/account.
    *   **Branch to deploy:** **Crucially, select the `dev` branch.**
    *   **Base directory:** Leave this *blank* or set to `/` (unless your frontend files are in a subfolder like `frontend/`, which they aren't in this case). Netlify should find `index.html` in the root.
    *   **Build command:** Leave this *blank*. Since this is a static site with no build step (like React/Vue/etc.), no build command is needed.
    *   **Publish directory:** Leave this *blank* or set to `/`. Netlify will publish the files from the root of your repository (or the Base directory if specified).
4.  **Deploy Site:** Click the "Deploy site" button.
5.  **Wait for Deployment:** Netlify will pull the code from your `dev` branch and deploy the files. This is usually very fast for static sites.
6.  **Access Your Site:** Netlify will provide you with a unique URL (e.g., `https://random-name-12345.netlify.app`). You can (and should) customize this later in the site settings ("Domain settings" -> "Options" -> "Edit site name").

## Part 5: Completion

Your backend (`dev` branch) should now be running on Render (connected to the shared database), and your frontend (`dev` branch) on Netlify. Any new pushes to the `dev` branch on GitHub will automatically trigger new deployments on both platforms.

**⚠️ Final Warning:** Remember that actions taken on the deployed `dev` site will modify the data in the shared database, which will also be used by your `main` branch deployment later. Be careful during testing!

Remember the free tier limitations:

*   **Render:** Services (web service and database) may "spin down" after inactivity, causing delays on first requests. Only one free database instance is typically allowed.
*   **Netlify:** Generous free tier for static hosting, but bandwidth/build limits apply for very high traffic sites.