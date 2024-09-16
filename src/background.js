chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inputData') {
        const inputData = message.data;
        const formattedData = `Time: ${inputData.timestamp}\n${inputData.name}: ${inputData.value}`;

        console.log("Received input data:", formattedData);  // Add console log to verify data reception

        // Retrieve existing form data
        chrome.storage.local.get('inputs', (data) => {
            let inputs = data.inputs || [];
            inputs.push(formattedData);

            // Save updated form data
            chrome.storage.local.set({ inputs: inputs }, () => {
                console.log('Input data saved:', formattedData);  // Log when data is saved
            });
        });
    }
});

