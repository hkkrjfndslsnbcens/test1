// public/script.js
const form = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt');
const responseText = document.getElementById('response-text');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');

form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    const prompt = promptInput.value.trim();
    if (!prompt) return; // Do nothing if prompt is empty

    // Clear previous response and error, show loading
    responseText.textContent = '...';
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    form.elements['submit'].disabled = true; // Disable button during request


    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt }),
        });

        loadingDiv.classList.add('hidden'); // Hide loading indicator

        if (!response.ok) {
            // Try to get error message from response body
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try {
               const errorData = await response.json();
               errorMsg = errorData.error || errorMsg; // Use server's error message if available
            } catch(e) {
                // Ignore if response body isn't valid JSON
            }
             throw new Error(errorMsg);
        }

        const data = await response.json();
        responseText.textContent = data.response; // Display Gemini's response

    } catch (error) {
        console.error('Fetch error:', error);
        responseText.textContent = ''; // Clear response area on error
        errorDiv.textContent = `Error: ${error.message}`; // Display error message
        errorDiv.classList.remove('hidden');
        loadingDiv.classList.add('hidden'); // Ensure loading is hidden on error
    } finally {
         form.elements['submit'].disabled = false; // Re-enable button
    }
});