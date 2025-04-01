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

## Part 1: Deploying the Backend (Node.js/Express) to Render

Render is suitable for hosting Node.js web services.

1.  **Log in to Render:** Go to [dashboard.render.com](https://dashboard.render.com/) and log in.
2.  **Create a New Web Service:**
    *   Click the "New +" button and select "Web Service".
    *   Connect your GitHub account if you haven't already.
    *   Choose your flashcards repository.
3.  **Configure the Web Service:**
    *   **Name:** Give your service a unique name (e.g., `flashcards-backend-dev`). This will be part of your URL.
    *   **Region:** Choose a region close to you or your users.
    *   **Branch:** **Crucially, select the `dev` branch.**
    *   **Root Directory:** Set this to `backend`. Render needs to know where your `package.json` for the backend is located.
    *   **Runtime:** Select "Node".
    *   **Build Command:** `npm install` (or `yarn` if you used Yarn). This installs dependencies.
    *   **Start Command:** `node server.js` (or whatever command starts your specific backend server).
    *   **Plan:** Select the "Free" plan. Be aware of the limitations (e.g., sleeping after inactivity).
4.  **Environment Variables (If Applicable):**
    *   If your backend requires environment variables (like database connection strings, API keys, etc., though this simple backend likely doesn't), click "Advanced" and add them under the "Environment Variables" section.
5.  **Create Web Service:** Click the "Create Web Service" button.
6.  **Wait for Deployment:** Render will pull your code from the `dev` branch, run the build command, and then the start command. You can watch the logs for progress. The first deployment might take a few minutes.
7.  **Get the Backend URL:** Once deployed successfully, Render will provide you with a public URL for your backend (e.g., `https://flashcards-backend-dev.onrender.com`). **Copy this URL.**

## Part 2: Updating Frontend with Backend URL

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

## Part 3: Deploying the Frontend (HTML/CSS/JS) to Netlify

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

## Completion

Your backend should now be running on Render, and your frontend on Netlify, both deployed from the `dev` branch. Any new pushes to the `dev` branch on GitHub will automatically trigger new deployments on both platforms (this is called Continuous Deployment).

Remember the free tier limitations:

*   **Render:** Services may "spin down" after a period of inactivity, causing a delay on the first request after being idle.
*   **Netlify:** Generous free tier for static hosting, but bandwidth/build limits apply for very high traffic sites.