// DOM elements
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
        transformedPreview.innerHTML = `<div class="error-state">
            ⚠️ AI transformation failed: ${data.error || 'Service temporarily unavailable'}
            <br><br>
            <strong>Original message shown below:</strong>
            <br><br>
            ${data.transformedMessage}
        </div>`;
    } else {
        // Display the full email format including headers if available
        if (data.emailPreview) {
            transformedPreview.textContent = data.emailPreview;
        } else {
            // Fallback to just the transformed message if emailPreview is not available
            transformedPreview.textContent = data.transformedMessage;
        }
    }
    
    previewContainer.classList.remove('hidden');
}

function updateRateLimit(remaining, reset) {
    rateLimitRemaining = remaining;
    rateLimitReset = reset;
    rateLimitCount.textContent = remaining;
    
    if (remaining <= 2) {
        rateLimitStatus.classList.add('rate-limit-warning');
        rateLimitText.innerHTML = `⚠️ Only <span id="rateLimitCount">${remaining}</span> previews remaining`;
    } else {
        rateLimitStatus.classList.remove('rate-limit-warning');
        rateLimitText.innerHTML = `Previews remaining: <span id="rateLimitCount">${remaining}</span>/10`;
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    restoreSessionState();
    initializeRateLimit();
});