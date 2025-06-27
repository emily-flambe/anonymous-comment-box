// Serve static files from the src/static directory
const staticFiles: Record<string, string> = {
  '/': '/index.html',
  '/index.html': '/index.html',
  '/styles.css': '/styles.css',
  '/script.js': '/script.js',
};

// Embed static assets as strings
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anonymous Feedback</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Send Anonymous Feedback</h1>
            <p class="subtitle">Your message will be transformed and delivered with complete anonymity</p>
        </header>

        <main>
            <form id="feedbackForm" class="feedback-form">
                <div class="form-group">
                    <label for="message">Your Message</label>
                    <textarea 
                        id="message" 
                        name="message" 
                        rows="6" 
                        maxlength="5000"
                        placeholder="Share your thoughts, feedback, or concerns..."
                        required
                    ></textarea>
                    <div class="char-count">
                        <span id="charCount">0</span> / 5000 characters
                    </div>
                </div>

                <div class="privacy-notice">
                    <h3>Your Privacy is Protected</h3>
                    <ul>
                        <li>Messages are transformed by AI to mask writing style</li>
                        <li>Delivered after a random 1-6 hour delay</li>
                        <li>No tracking or identifying information collected</li>
                        <li>Completely anonymous - even we can't trace it back</li>
                    </ul>
                </div>

                <button type="submit" class="submit-btn" id="submitBtn">
                    Send Anonymous Feedback
                </button>
            </form>

            <div id="successMessage" class="success-message hidden">
                <h2>Message Sent!</h2>
                <p>Your feedback has been queued for anonymous delivery.</p>
                <button onclick="resetForm()" class="reset-btn">Send Another Message</button>
            </div>

            <div id="errorMessage" class="error-message hidden">
                <h2>Something went wrong</h2>
                <p id="errorText">Please try again later.</p>
                <button onclick="resetForm()" class="reset-btn">Try Again</button>
            </div>
        </main>

        <footer>
            <p>Built with privacy in mind. <a href="https://github.com/emily-flambe/anonymous-comment-box" target="_blank">View Source</a></p>
        </footer>
    </div>

    <script src="/script.js"></script>
</body>
</html>`;

const cssContent = `:root {
    --primary-color: #5b21b6;
    --primary-hover: #4c1d95;
    --success-color: #10b981;
    --error-color: #ef4444;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --border-color: #e5e7eb;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: var(--text-primary);
    background-color: var(--bg-secondary);
    min-height: 100vh;
}

.container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    text-align: center;
    margin-bottom: 3rem;
}

h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
}

main {
    flex: 1;
}

.feedback-form {
    background: var(--bg-primary);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: var(--shadow-lg);
}

.form-group {
    margin-bottom: 1.5rem;
}

label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s;
}

textarea:focus {
    outline: none;
    border-color: var(--primary-color);
}

.char-count {
    text-align: right;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.privacy-notice {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.privacy-notice h3 {
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
    color: var(--primary-color);
}

.privacy-notice ul {
    list-style: none;
}

.privacy-notice li {
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
    position: relative;
    color: var(--text-secondary);
}

.privacy-notice li:before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--success-color);
    font-weight: bold;
}

.submit-btn {
    width: 100%;
    padding: 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
    background: var(--primary-hover);
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.success-message,
.error-message {
    background: var(--bg-primary);
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    box-shadow: var(--shadow-lg);
}

.success-message h2 {
    color: var(--success-color);
    margin-bottom: 1rem;
}

.error-message h2 {
    color: var(--error-color);
    margin-bottom: 1rem;
}

.reset-btn {
    margin-top: 1.5rem;
    padding: 0.75rem 2rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

.reset-btn:hover {
    background: var(--primary-hover);
}

.hidden {
    display: none;
}

footer {
    text-align: center;
    padding: 2rem 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

footer a {
    color: var(--primary-color);
    text-decoration: none;
}

footer a:hover {
    text-decoration: underline;
}

@media (max-width: 640px) {
    .container {
        padding: 1rem;
    }

    h1 {
        font-size: 2rem;
    }

    .feedback-form {
        padding: 1.5rem;
    }
}`;

const jsContent = `// DOM elements
const feedbackForm = document.getElementById('feedbackForm');
const messageTextarea = document.getElementById('message');
const charCount = document.getElementById('charCount');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Character counter
messageTextarea.addEventListener('input', () => {
    const length = messageTextarea.value.length;
    charCount.textContent = length;
    
    if (length > 4500) {
        charCount.style.color = '#ef4444';
    } else {
        charCount.style.color = '#6b7280';
    }
});

// Form submission
feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageTextarea.value.trim();
    
    if (!message) {
        showError('Please enter a message');
        return;
    }
    
    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    messageTextarea.disabled = true;
    
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess();
        } else {
            showError(data.error || 'Failed to send message. Please try again.');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Anonymous Feedback';
        messageTextarea.disabled = false;
    }
});

function showSuccess() {
    feedbackForm.style.display = 'none';
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
}

function resetForm() {
    feedbackForm.style.display = 'block';
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    messageTextarea.value = '';
    charCount.textContent = '0';
    charCount.style.color = '#6b7280';
}`;

export async function handleStaticAssets(request: Request, url: URL): Promise<Response> {
  const path = staticFiles[url.pathname] || url.pathname;
  
  try {
    if (path === '/index.html' || path === '/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    if (path === '/styles.css') {
      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }
    
    if (path === '/script.js') {
      return new Response(jsContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('Static asset error:', error);
    return new Response('Not Found', { status: 404 });
  }
}