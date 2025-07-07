// Serve static files from the src/static directory
const staticFiles: Record<string, string> = {
  '/': '/index.html',
  '/index.html': '/index.html',
  '/styles.css': '/styles.css',
  '/script.js': '/script.js',
  '/ai-test.html': '/ai-test.html',
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
                <!-- Persona Selection -->
                <div class="form-group">
                    <label for="personaSelect">Message Style (Optional)</label>
                    <select id="personaSelect" class="persona-select">
                        <option value="">No transformation (original style)</option>
                        <option value="internet-random">Internet Random - casual, memes, abbreviations</option>
                        <option value="barely-literate">Barely Literate - simple vocab, poor grammar</option>
                        <option value="extremely-serious">Extremely Serious - formal, academic tone</option>
                        <option value="super-nice">Super Nice - overly polite, encouraging</option>
                        <option value="custom">Custom style...</option>
                    </select>
                    <div class="persona-description" id="personaDescription"></div>
                </div>

                <!-- Custom Persona Input -->
                <div class="form-group hidden" id="customPersonaGroup">
                    <label for="customPersona">Custom Style Description</label>
                    <textarea 
                        id="customPersona" 
                        name="customPersona" 
                        rows="3" 
                        maxlength="500"
                        placeholder="Describe how you want your message to be transformed (e.g., 'Make it sound like a pirate', 'Use corporate jargon', etc.)"
                    ></textarea>
                    <div class="char-count">
                        <span id="customPersonaCount">0</span> / 500 characters
                    </div>
                </div>

                <!-- Message Input -->
                <div class="form-group">
                    <label for="message">Your Message</label>
                    <textarea 
                        id="message" 
                        name="message" 
                        rows="6" 
                        maxlength="2000"
                        placeholder="Share your thoughts, feedback, or concerns..."
                        required
                    ></textarea>
                    <div class="char-count">
                        <span id="charCount">0</span> / 2000 characters
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="preview-section">
                    <div class="preview-controls">
                        <button type="button" class="preview-btn" id="previewBtn">
                            Preview Transformation
                        </button>
                        <div class="rate-limit-status" id="rateLimitStatus">
                            <span id="rateLimitText">Previews remaining: <span id="rateLimitCount">10</span>/10</span>
                        </div>
                    </div>
                    
                    <div class="preview-container hidden" id="previewContainer">
                        <div class="preview-comparison">
                            <div class="preview-original">
                                <h4>Original Message</h4>
                                <div class="preview-text" id="originalPreview"></div>
                            </div>
                            <div class="preview-transformed">
                                <h4>Transformed Message</h4>
                                <div class="preview-text" id="transformedPreview"></div>
                            </div>
                        </div>
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
    color: #0066ff;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
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

/* Persona Selector Styles */
.persona-select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    background-color: var(--bg-primary);
    transition: border-color 0.2s;
}

.persona-select:focus {
    outline: none;
    border-color: var(--primary-color);
}

.persona-description {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--text-secondary);
    min-height: 2rem;
}

.persona-description.empty {
    display: none;
}

/* Preview Section Styles */
.preview-section {
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    background-color: var(--bg-secondary);
}

.preview-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.preview-btn {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
}

.preview-btn:hover:not(:disabled) {
    background: var(--primary-hover);
}

.preview-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.preview-btn.loading {
    position: relative;
}

.preview-btn.loading::after {
    content: '';
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: translateY(-50%) rotate(0deg); }
    100% { transform: translateY(-50%) rotate(360deg); }
}

.rate-limit-status {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.rate-limit-warning {
    color: var(--error-color);
    font-weight: 600;
}

.preview-container {
    margin-top: 1rem;
}

.preview-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.preview-original,
.preview-transformed {
    background: var(--bg-primary);
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid var(--border-color);
}

.preview-original h4,
.preview-transformed h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.preview-text {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-primary);
    min-height: 3rem;
    white-space: pre-wrap;
}

.preview-error {
    color: var(--error-color);
    font-style: italic;
}

/* Loading States */
.loading-skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Error States */
.error-state {
    color: var(--error-color);
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error-color);
    border-radius: 6px;
    padding: 0.75rem;
    margin-top: 0.5rem;
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

    .preview-comparison {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    .preview-controls {
        flex-direction: column;
        gap: 0.75rem;
        align-items: stretch;
    }

    .preview-btn {
        width: 100%;
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

// New persona and preview elements
const personaSelect = document.getElementById('personaSelect');
const personaDescription = document.getElementById('personaDescription');
const customPersonaGroup = document.getElementById('customPersonaGroup');
const customPersonaTextarea = document.getElementById('customPersona');
const customPersonaCount = document.getElementById('customPersonaCount');
const previewBtn = document.getElementById('previewBtn');
const previewContainer = document.getElementById('previewContainer');
const originalPreview = document.getElementById('originalPreview');
const transformedPreview = document.getElementById('transformedPreview');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const rateLimitText = document.getElementById('rateLimitText');
const rateLimitCount = document.getElementById('rateLimitCount');

// Session management
let sessionId = localStorage.getItem('sessionId') || generateSessionId();
localStorage.setItem('sessionId', sessionId);

// Rate limiting state
let rateLimitRemaining = 10;
let rateLimitReset = Date.now() + 60000; // 1 minute from now

// Persona descriptions and examples
const personaDescriptions = {
    'internet-random': {
        description: 'Casual internet slang with abbreviations, mild typos, and meme references.',
        example: 'Original: "I think this is a great idea." → "ngl this idea slaps 💯 we should def do this fr fr"'
    },
    'barely-literate': {
        description: 'Simple vocabulary with poor grammar and informal structure.',
        example: 'Original: "I disagree with this decision." → "i dont like this thing cuz it dont make sense to me"'
    },
    'extremely-serious': {
        description: 'Formal, academic language with professional vocabulary.',
        example: 'Original: "This is really bad." → "This matter requires immediate systematic remediation."'
    },
    'super-nice': {
        description: 'Overly polite, encouraging, and positive language.',
        example: 'Original: "This feature is broken." → "I hope this feedback helps! The feature might benefit from some adjustments. Thank you! 😊"'
    }
};

function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Character counters
messageTextarea.addEventListener('input', () => {
    const length = messageTextarea.value.length;
    charCount.textContent = length;
    
    if (length > 1800) {
        charCount.style.color = '#ef4444';
    } else {
        charCount.style.color = '#6b7280';
    }
});

customPersonaTextarea.addEventListener('input', () => {
    const length = customPersonaTextarea.value.length;
    customPersonaCount.textContent = length;
    
    if (length > 450) {
        customPersonaCount.style.color = '#ef4444';
    } else {
        customPersonaCount.style.color = '#6b7280';
    }
});

// Persona selection functionality
personaSelect.addEventListener('change', () => {
    const selectedPersona = personaSelect.value;
    
    // Save selection to session storage
    sessionStorage.setItem('selectedPersona', selectedPersona);
    
    if (selectedPersona === 'custom') {
        customPersonaGroup.classList.remove('hidden');
        updatePersonaDescription('Enter a custom style description above');
    } else {
        customPersonaGroup.classList.add('hidden');
        customPersonaTextarea.value = '';
        customPersonaCount.textContent = '0';
        
        if (selectedPersona && personaDescriptions[selectedPersona]) {
            updatePersonaDescription(
                personaDescriptions[selectedPersona].description + 
                '<br><br><strong>Example:</strong> ' + 
                personaDescriptions[selectedPersona].example
            );
        } else {
            updatePersonaDescription('');
        }
    }
});

// Custom persona functionality
customPersonaTextarea.addEventListener('input', () => {
    sessionStorage.setItem('customPersona', customPersonaTextarea.value);
});

function updatePersonaDescription(text) {
    if (text) {
        personaDescription.innerHTML = text;
        personaDescription.classList.remove('empty');
    } else {
        personaDescription.textContent = '';
        personaDescription.classList.add('empty');
    }
}

// Preview functionality
previewBtn.addEventListener('click', async () => {
    const message = messageTextarea.value.trim();
    
    if (!message) {
        showError('Please enter a message to preview');
        return;
    }
    
    if (rateLimitRemaining <= 0) {
        showError('Preview limit reached. Please wait before trying again.');
        return;
    }
    
    await generatePreview(message);
});

async function generatePreview(message) {
    // Update UI for loading state
    previewBtn.disabled = true;
    previewBtn.classList.add('loading');
    previewBtn.textContent = 'Generating Preview...';
    
    const selectedPersona = personaSelect.value;
    const customPersona = selectedPersona === 'custom' ? customPersonaTextarea.value.trim() : '';
    
    try {
        const requestBody = {
            message: message,
            sessionId: sessionId
        };
        
        if (selectedPersona && selectedPersona !== 'custom') {
            requestBody.persona = selectedPersona;
        } else if (customPersona) {
            requestBody.customPersona = customPersona;
        }
        
        const response = await fetch('/api/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayPreview(data);
            updateRateLimit(data.rateLimitRemaining, data.rateLimitReset);
        } else if (response.status === 429) {
            showError('Rate limit exceeded. Please wait before trying again.');
        } else {
            showError(data.error || 'Failed to generate preview. Please try again.');
        }
    } catch (error) {
        console.error('Preview error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        // Reset button state
        previewBtn.disabled = false;
        previewBtn.classList.remove('loading');
        previewBtn.textContent = 'Preview Transformation';
    }
}

function displayPreview(data) {
    originalPreview.textContent = data.originalMessage;
    
    // Show fallback warning if AI transformation failed
    if (data.fallbackUsed || data.error) {
        transformedPreview.innerHTML = \`<div class="error-state">
            ⚠️ AI transformation failed: \${data.error || 'Service temporarily unavailable'}
            <br><br>
            <strong>Original message shown below:</strong>
            <br><br>
            \${data.transformedMessage}
        </div>\`;
    } else {
        transformedPreview.textContent = data.transformedMessage;
    }
    
    previewContainer.classList.remove('hidden');
}

function updateRateLimit(remaining, reset) {
    rateLimitRemaining = remaining;
    rateLimitReset = reset;
    rateLimitCount.textContent = remaining;
    
    if (remaining <= 2) {
        rateLimitStatus.classList.add('rate-limit-warning');
        rateLimitText.innerHTML = \`⚠️ Only <span id="rateLimitCount">\${remaining}</span> previews remaining\`;
    } else {
        rateLimitStatus.classList.remove('rate-limit-warning');
        rateLimitText.innerHTML = \`Previews remaining: <span id="rateLimitCount">\${remaining}</span>/10\`;
    }
}

// Form submission with persona support
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
    
    const selectedPersona = personaSelect.value;
    const customPersona = selectedPersona === 'custom' ? customPersonaTextarea.value.trim() : '';
    
    try {
        const requestBody = {
            message: message,
            sessionId: sessionId
        };
        
        if (selectedPersona && selectedPersona !== 'custom') {
            requestBody.persona = selectedPersona;
        } else if (customPersona) {
            requestBody.customPersona = customPersona;
        }
        
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess();
        } else if (response.status === 429) {
            showError('Rate limit exceeded. Please wait before trying again.');
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

// Initialize rate limit status on page load
async function initializeRateLimit() {
    try {
        const response = await fetch('/api/rate-limit-status', {
            headers: {
                'X-Session-ID': sessionId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateRateLimit(data.remaining, data.reset);
        }
    } catch (error) {
        console.error('Failed to get rate limit status:', error);
        // Use default values
    }
}

// Restore session state on page load
function restoreSessionState() {
    const savedPersona = sessionStorage.getItem('selectedPersona');
    const savedCustomPersona = sessionStorage.getItem('customPersona');
    
    if (savedPersona) {
        personaSelect.value = savedPersona;
        personaSelect.dispatchEvent(new Event('change'));
    }
    
    if (savedCustomPersona) {
        customPersonaTextarea.value = savedCustomPersona;
        customPersonaCount.textContent = savedCustomPersona.length;
    }
}

// Rate limit timer
function updateRateLimitTimer() {
    const now = Date.now();
    if (now >= rateLimitReset) {
        rateLimitRemaining = 10;
        rateLimitReset = now + 60000; // Reset for another minute
        updateRateLimit(rateLimitRemaining, rateLimitReset);
    }
}

// Update rate limit timer every second
setInterval(updateRateLimitTimer, 1000);

function resetForm() {
    feedbackForm.style.display = 'block';
    successMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    messageTextarea.value = '';
    charCount.textContent = '0';
    charCount.style.color = '#6b7280';
    previewContainer.classList.add('hidden');
    
    // Don't reset persona selection on form reset
    // This preserves user's persona choice for multiple submissions
}

<<<<<<< HEAD
const aiTestContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Test</title>
    <style>
        :root {
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
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            text-align: center;
            margin-bottom: 2rem;
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

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            overflow: hidden;
        }

        .chat-history {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
            min-height: 400px;
            max-height: 600px;
            background: var(--bg-secondary);
        }

        .message {
            margin-bottom: 1rem;
            padding: 1rem;
            border-radius: 8px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .message.user {
            background: var(--primary-color);
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 4px;
        }

        .message.ai {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            margin-right: auto;
            border-bottom-left-radius: 4px;
        }

        .message.loading {
            background: var(--bg-primary);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            margin-right: auto;
            font-style: italic;
        }

        .chat-input {
            padding: 1.5rem;
            border-top: 1px solid var(--border-color);
            background: var(--bg-primary);
        }

        .input-row {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }

        .input-group {
            flex: 1;
        }

        textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            resize: vertical;
            min-height: 60px;
            max-height: 120px;
            transition: border-color 0.2s;
        }

        textarea:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        .send-btn {
            padding: 0.75rem 1.5rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
            height: fit-content;
        }

        .send-btn:hover:not(:disabled) {
            background: var(--primary-hover);
        }

        .send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .error-message {
            background: var(--error-color);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
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

            .input-row {
                flex-direction: column;
                gap: 0.5rem;
            }

            .send-btn {
                width: 100%;
            }

            .message {
                max-width: 95%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>AI Chat Test</h1>
            <p class="subtitle">Test the AI chat functionality</p>
        </header>

        <main>
            <div class="chat-container">
                <div class="chat-history" id="chatHistory">
                    <div class="message ai">
                        <strong>AI Assistant:</strong> Hello! I'm here to help. What would you like to talk about?
                    </div>
                </div>

                <div class="chat-input">
                    <div id="errorMessage" class="error-message hidden">
                        <span id="errorText">Something went wrong. Please try again.</span>
                    </div>
                    
                    <div class="input-row">
                        <div class="input-group">
                            <textarea 
                                id="messageInput" 
                                placeholder="Type your message here..." 
                                rows="2"
                                maxlength="1000"
                            ></textarea>
                        </div>
                        <button type="button" class="send-btn" id="sendBtn">
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <footer>
            <p>AI Chat Test Interface</p>
        </footer>
    </div>

    <script>
        // DOM elements
        const chatHistory = document.getElementById('chatHistory');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        // Add message to chat history
        function addMessage(content, sender = 'user') {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            
            if (sender === 'user') {
                messageDiv.innerHTML = \`<strong>You:</strong> \${escapeHtml(content)}\`;
            } else if (sender === 'ai') {
                messageDiv.innerHTML = \`<strong>AI Assistant:</strong> \${escapeHtml(content)}\`;
            } else if (sender === 'loading') {
                messageDiv.innerHTML = \`<strong>AI Assistant:</strong> <em>Thinking...</em>\`;
                messageDiv.className = 'message loading';
            }
            
            chatHistory.appendChild(messageDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
            
            return messageDiv;
        }

        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Show error message
        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 5000);
        }

        // Send message
        async function sendMessage() {
            const message = messageInput.value.trim();
            
            if (!message) {
                showError('Please enter a message');
                return;
            }
            
            // Add user message to chat
            addMessage(message, 'user');
            
            // Clear input and disable send button
            messageInput.value = '';
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            
            // Add loading message
            const loadingMessage = addMessage('', 'loading');
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });
                
                const data = await response.json();
                
                // Remove loading message
                loadingMessage.remove();
                
                if (response.ok) {
                    // Add AI response
                    addMessage(data.response || 'I received your message but had no response.', 'ai');
                } else {
                    showError(data.error || 'Failed to get AI response. Please try again.');
                }
            } catch (error) {
                console.error('Chat error:', error);
                loadingMessage.remove();
                showError('Network error. Please check your connection and try again.');
            } finally {
                // Re-enable send button
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
                messageInput.focus();
            }
        }

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Focus on input when page loads
        document.addEventListener('DOMContentLoaded', () => {
            messageInput.focus();
        });
    </script>
</body>
</html>`;

export async function handleStaticAssets(request: Request, url: URL, env?: any): Promise<Response> {
  const path = staticFiles[url.pathname] || url.pathname;
  
  try {
    // Check if ASSETS is available (wrangler dev with assets configured)
    if (env?.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
      } catch (assetsError) {
        console.log('Assets fetch failed:', assetsError);
      }
    }
    
    // Fallback to embedded content
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
    
    if (path === '/ai-test.html' || url.pathname === '/ai-test') {
      return new Response(aiTestContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('Static asset error:', error);
    return new Response('Not Found', { status: 404 });
  }
}
