// Serve static files from the src/static directory
const staticFiles: Record<string, string> = {
  '/': '/index.html',
  '/index.html': '/index.html',
  '/styles.css': '/styles.css',
  '/script.js': '/script.js',
  '/widget.js': '/widget.js',
  '/widget-demo.html': '/widget-demo.html',
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
        // Display the transformed message
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
        submitBtn.textContent = 'Send Anonymous Message';
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    restoreSessionState();
    initializeRateLimit();
});`;

const widgetContent = `// Anonymous Comment Box Widget
(function() {
  // Widget initialization code
  console.log('Anonymous Comment Box widget loaded');
  
  // TODO: Add actual widget implementation
  // This will include:
  // - Widget injection logic
  // - Iframe or embedded form creation
  // - Communication with parent page
  // - Styling and configuration options
})();`;

const widgetDemoContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anonymous Comment Box - Widget Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f7f8fa;
        }

        .header {
            background: #5b21b6;
            color: white;
            padding: 2rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        .main-content {
            padding: 3rem 0;
        }

        .section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section h2 {
            color: #5b21b6;
            font-size: 1.875rem;
            margin-bottom: 1rem;
        }

        .section h3 {
            color: #4c1d95;
            font-size: 1.375rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }

        .code-block {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            overflow-x: auto;
            margin: 1rem 0;
            position: relative;
        }

        .code-block pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .copy-btn {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            background: #5b21b6;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: background 0.2s;
        }

        .copy-btn:hover {
            background: #4c1d95;
        }

        .copy-btn.copied {
            background: #10b981;
        }

        .demo-preview {
            background: #f9fafb;
            border: 2px dashed #e5e7eb;
            border-radius: 8px;
            padding: 2rem;
            margin: 1.5rem 0;
            min-height: 200px;
            position: relative;
        }

        .demo-label {
            position: absolute;
            top: -12px;
            left: 1rem;
            background: white;
            padding: 0 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
            font-weight: 600;
        }

        .attributes-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        .attributes-table th,
        .attributes-table td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .attributes-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #4b5563;
        }

        .attributes-table code {
            background: #f3f4f6;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
        }

        .feature-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 1.5rem;
        }

        .feature-card h4 {
            color: #5b21b6;
            margin-bottom: 0.5rem;
        }

        .feature-card p {
            color: #6b7280;
            font-size: 0.875rem;
        }

        .alert {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            display: flex;
            align-items: start;
            gap: 0.75rem;
        }

        .alert-icon {
            color: #f59e0b;
            font-size: 1.25rem;
            flex-shrink: 0;
        }

        .alert-content {
            flex: 1;
        }

        .alert-content strong {
            color: #92400e;
        }

        .footer {
            background: #f3f4f6;
            padding: 2rem 0;
            margin-top: 4rem;
            text-align: center;
            color: #6b7280;
        }

        .footer a {
            color: #5b21b6;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Widget iframe styles for demo */
        .widget-iframe {
            width: 100%;
            height: 600px;
            border: none;
            border-radius: 8px;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }

            .section {
                padding: 1.5rem;
            }

            .code-block {
                padding: 1rem;
                font-size: 0.75rem;
            }

            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <h1>Anonymous Comment Box Widget</h1>
            <p>Embed anonymous feedback forms on any website with a single line of code</p>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <!-- Live Demo Section -->
            <section class="section">
                <h2>Live Demo</h2>
                <p>Try out the anonymous comment box below. This is exactly how it will appear on your website.</p>
                
                <div class="demo-preview">
                    <span class="demo-label">Widget Preview</span>
                    <script 
                        src="/widget.js" 
                        data-recipient="demo@example.com"
                        data-title="Product Feedback">
                    </script>
                </div>
            </section>

            <!-- Quick Start Section -->
            <section class="section">
                <h2>Quick Start</h2>
                <p>Add the anonymous comment box to your website in seconds. Just copy and paste this code where you want the widget to appear:</p>
                
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this, 'basic-code')">Copy</button>
                    <pre id="basic-code">&lt;script 
    src="https://your-domain.com/widget.js" 
    data-recipient="feedback@yourcompany.com"
    data-title="Send Us Feedback"&gt;
&lt;/script&gt;</pre>
                </div>

                <div class="alert">
                    <span class="alert-icon">⚠️</span>
                    <div class="alert-content">
                        <strong>Important:</strong> Replace <code>your-domain.com</code> with your actual deployment domain and <code>feedback@yourcompany.com</code> with your email address.
                    </div>
                </div>
            </section>

            <!-- Configuration Options Section -->
            <section class="section">
                <h2>Configuration Options</h2>
                <p>Customize the widget behavior using data attributes:</p>
                
                <table class="attributes-table">
                    <thead>
                        <tr>
                            <th>Attribute</th>
                            <th>Description</th>
                            <th>Example</th>
                            <th>Required</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>data-recipient</code></td>
                            <td>Email address where feedback will be sent</td>
                            <td><code>feedback@company.com</code></td>
                            <td>Yes</td>
                        </tr>
                        <tr>
                            <td><code>data-title</code></td>
                            <td>Custom title for the feedback form</td>
                            <td><code>Contact Support</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><code>data-theme</code></td>
                            <td>Color theme (light/dark)</td>
                            <td><code>dark</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><code>data-position</code></td>
                            <td>Widget position (inline/modal)</td>
                            <td><code>modal</code></td>
                            <td>No</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <!-- Integration Examples Section -->
            <section class="section">
                <h2>Integration Examples</h2>
                
                <h3>Basic Integration</h3>
                <p>Simple feedback form with default settings:</p>
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this, 'example-basic')">Copy</button>
                    <pre id="example-basic">&lt;script 
    src="https://your-domain.com/widget.js" 
    data-recipient="hr@company.com"&gt;
&lt;/script&gt;</pre>
                </div>

                <h3>Custom Title</h3>
                <p>Feedback form with a custom title:</p>
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this, 'example-title')">Copy</button>
                    <pre id="example-title">&lt;script 
    src="https://your-domain.com/widget.js" 
    data-recipient="product@startup.com"
    data-title="Product Suggestions"&gt;
&lt;/script&gt;</pre>
                </div>

                <h3>Dark Theme Modal</h3>
                <p>Modal popup with dark theme:</p>
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this, 'example-modal')">Copy</button>
                    <pre id="example-modal">&lt;script 
    src="https://your-domain.com/widget.js" 
    data-recipient="support@app.com"
    data-title="Report an Issue"
    data-theme="dark"
    data-position="modal"&gt;
&lt;/script&gt;</pre>
                </div>

                <h3>Multiple Forms on One Page</h3>
                <p>You can add multiple feedback forms with different configurations:</p>
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this, 'example-multiple')">Copy</button>
                    <pre id="example-multiple">&lt;!-- HR Feedback Form --&gt;
&lt;div id="hr-feedback"&gt;
    &lt;script 
        src="https://your-domain.com/widget.js" 
        data-recipient="hr@company.com"
        data-title="HR Feedback"&gt;
    &lt;/script&gt;
&lt;/div&gt;

&lt;!-- Product Feedback Form --&gt;
&lt;div id="product-feedback"&gt;
    &lt;script 
        src="https://your-domain.com/widget.js" 
        data-recipient="product@company.com"
        data-title="Product Ideas"&gt;
    &lt;/script&gt;
&lt;/div&gt;</pre>
                </div>
            </section>

            <!-- Features Section -->
            <section class="section">
                <h2>Key Features</h2>
                
                <div class="feature-grid">
                    <div class="feature-card">
                        <h4>🔒 Complete Anonymity</h4>
                        <p>Messages are transformed by AI to mask writing style. No tracking or identifying information is collected.</p>
                    </div>
                    <div class="feature-card">
                        <h4>⏱️ Random Delay</h4>
                        <p>Feedback is delivered after a random 1-6 hour delay to prevent timing correlation.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🎨 Customizable</h4>
                        <p>Match your brand with custom titles, themes, and positioning options.</p>
                    </div>
                    <div class="feature-card">
                        <h4>📱 Responsive</h4>
                        <p>Works perfectly on desktop, tablet, and mobile devices.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🚀 Easy Integration</h4>
                        <p>Add to any website with a single script tag. No backend changes required.</p>
                    </div>
                    <div class="feature-card">
                        <h4>🛡️ Secure</h4>
                        <p>All communications are encrypted and no data is stored after delivery.</p>
                    </div>
                </div>
            </section>

            <!-- Implementation Guide Section -->
            <section class="section">
                <h2>Implementation Guide</h2>
                
                <h3>Step 1: Deploy the Application</h3>
                <p>First, deploy the anonymous comment box application to your preferred hosting platform (Cloudflare Workers recommended).</p>
                
                <h3>Step 2: Configure Email Settings</h3>
                <p>Set up your Gmail OAuth credentials or SMTP settings to enable email delivery.</p>
                
                <h3>Step 3: Add the Widget</h3>
                <p>Copy the widget code and paste it into your website's HTML where you want the feedback form to appear.</p>
                
                <h3>Step 4: Customize (Optional)</h3>
                <p>Adjust the data attributes to match your needs and brand.</p>
                
                <div class="alert">
                    <span class="alert-icon">💡</span>
                    <div class="alert-content">
                        <strong>Pro Tip:</strong> Test the widget in a staging environment first to ensure it works correctly with your email configuration.
                    </div>
                </div>
            </section>

            <!-- Troubleshooting Section -->
            <section class="section">
                <h2>Troubleshooting</h2>
                
                <h3>Widget Not Appearing</h3>
                <ul>
                    <li>Verify the script URL is correct and accessible</li>
                    <li>Check browser console for JavaScript errors</li>
                    <li>Ensure the parent container has sufficient space</li>
                </ul>
                
                <h3>Emails Not Being Received</h3>
                <ul>
                    <li>Confirm email configuration in the application settings</li>
                    <li>Check spam/junk folders</li>
                    <li>Verify the recipient email address is correct</li>
                </ul>
                
                <h3>Styling Issues</h3>
                <ul>
                    <li>The widget uses an iframe to prevent CSS conflicts</li>
                    <li>Use the <code>data-theme</code> attribute for basic customization</li>
                    <li>For advanced styling, modify the widget source code</li>
                </ul>
            </section>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>Anonymous Comment Box · <a href="https://github.com/emily-flambe/anonymous-comment-box" target="_blank">GitHub</a> · <a href="/">Try It Now</a></p>
        </div>
    </footer>

    <script>
        function copyCode(button, codeId) {
            const codeElement = document.getElementById(codeId);
            const textToCopy = codeElement.textContent;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            });
        }
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
    
    if (path === '/widget.js') {
      return new Response(widgetContent, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    }
    
    if (path === '/widget-demo.html') {
      return new Response(widgetDemoContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
    
  } catch (error) {
    console.error('Static asset error:', error);
    return new Response('Not Found', { status: 404 });
  }
}
