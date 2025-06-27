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
}