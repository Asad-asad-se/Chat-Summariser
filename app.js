let chatText = '';
let messageCount = 250; // Default
let deferredPrompt;

function setMessageCount(count) {
    messageCount = count;
    document.getElementById('customCount').value = '';
    if (count === -1) {
        document.getElementById('selectedCount').textContent = '✅ Selected: All messages';
    } else {
        document.getElementById('selectedCount').textContent = `✅ Selected: Last ${count} messages`;
    }
}

// Set default
window.addEventListener('DOMContentLoaded', () => {
    setMessageCount(250);
});

document.getElementById('customCount').addEventListener('input', function(e) {
    const val = parseInt(e.target.value);
    if (val > 0) {
        messageCount = val;
        document.getElementById('selectedCount').textContent = `✅ Selected: Last ${val} messages`;
    }
});

// File upload handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
        showError('Please upload a .txt file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        chatText = event.target.result;
        document.getElementById('chatInput').value = chatText;
        document.getElementById('fileName').textContent = '✅ ' + file.name;
        document.getElementById('fileName').classList.remove('hidden');
        hideError();
    };
    reader.onerror = function() {
        showError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
});

// Manual input handler
document.getElementById('chatInput').addEventListener('input', function(e) {
    chatText = e.target.value;
});

// Summarize button
document.getElementById('summarizeBtn').addEventListener('click', summarizeChat);

async function summarizeChat() {
    if (!chatText.trim()) {
        showError('Please paste chat messages or upload a file first!');
        return;
    }

    // Extract last N messages
    let textToSummarize = chatText;
    if (messageCount > 0) {
        const lines = chatText.split('\\n').filter(line => line.trim());
        const lastLines = lines.slice(-messageCount);
        textToSummarize = lastLines.join('\\n');
    }

    setLoading(true);
    hideError();
    document.getElementById('results').classList.add('hidden');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: `Please analyze the following chat messages and provide:
1. Main topics discussed (list 3-5 key topics)
2. Important messages or key points (highlight 5-8 most important messages/decisions)

Format your response as JSON with this structure:
{
  "topics": ["topic1", "topic2", "topic3"],
  "important_messages": ["message1", "message2", "message3"]
}

Chat messages:
${textToSummarize}

Respond ONLY with the JSON object, no other text.`
                }]
            })
        });

        const data = await response.json();
        const text = data.content.map(item => item.text || '').join('\\n');
        const cleanText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        
        displayResults(parsed);
    } catch (err) {
        showError('Failed to summarize chat. Please try again.');
        console.error('Error:', err);
    } finally {
        setLoading(false);
    }
}

function displayResults(summary) {
    const topicsList = document.getElementById('topicsList');
    const messagesList = document.getElementById('messagesList');
    
    topicsList.innerHTML = '';
    messagesList.innerHTML = '';

    summary.topics.forEach((topic, i) => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-3 bg-white p-3 rounded-xl shadow-md border-2 border-purple-200';
        li.innerHTML = `
            <span class="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">${i + 1}</span>
            <span class="text-gray-800 pt-1 font-medium">${topic}</span>
        `;
        topicsList.appendChild(li);
    });

    summary.important_messages.forEach((msg, i) => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-3 bg-white p-4 rounded-xl shadow-md border-2 border-orange-200';
        li.innerHTML = `
            <span class="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">${i + 1}</span>
            <span class="text-gray-800 pt-1 font-medium">${msg}</span>
        `;
        messagesList.appendChild(li);
    });

    document.getElementById('results').classList.remove('hidden');
}

function setLoading(isLoading) {
    const btn = document.getElementById('summarizeBtn');
    const btnText = document.getElementById('btnText');
    
    if (isLoading) {
        btn.disabled = true;
        btnText.innerHTML = '<svg class="w-6 h-6 animate-spin inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Summarizing...';
    } else {
        btn.disabled = false;
        btnText.textContent = '✨ Summarize Chat Now!';
    }
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMsg').classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMsg').classList.add('hidden');
}

// PWA Install functionality
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.remove('hidden');
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        document.getElementById('installPrompt').classList.add('hidden');
    }
    deferredPrompt = null;
});

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}