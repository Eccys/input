const PASSWORD = 'MTIz';  // Base64 encoded "123"
const REQUIRED_CLICKS = 12;
let clickCount = 0;
let isDataVisible = false;

document.getElementById('start-button').textContent = ''; 
document.getElementById('submit-password').textContent = '';  
document.getElementById('view-button').textContent = '';  
document.getElementById('export-button').textContent = '';  
document.getElementById('clear-button').textContent = '';  

const errorMsg = document.createElement('div');
errorMsg.id = 'error-msg';
errorMsg.style.color = 'red';
errorMsg.style.fontSize = '10px';
errorMsg.style.display = 'none';
errorMsg.style.width = '100%';  // Ensure it takes the full width of the container
errorMsg.style.boxSizing = 'border-box';  // Include padding and border in the element's total width and height
document.body.appendChild(errorMsg);

function adjustPopupWidth(isErrorVisible) {
    if (isErrorVisible) {
        document.body.style.width = '350px';  // Adjust width to accommodate error message
    } else if (isDataVisible) {
        document.body.style.width = '325px';  // Adjust width when data is visible
    } else {
        document.body.style.width = '25px';  // Default width
    }
}

document.getElementById('start-button').addEventListener('click', () => {
    clickCount++;
    if (clickCount >= REQUIRED_CLICKS) {
        document.getElementById('initial-container').style.display = 'none';
        document.getElementById('password-container').style.display = 'block';
    }
});

document.getElementById('submit-password').addEventListener('click', () => {
    const passwordInput = document.getElementById('password-input').value;
    if (passwordInput === PASSWORD) {
        document.getElementById('password-container').style.display = 'none';
        document.getElementById('action-buttons').style.display = 'block';
        errorMsg.style.display = 'none';  // Hide error message if password is correct
        adjustPopupWidth(false);
    } else {
        errorMsg.textContent = 'Managed by NYCDOE';
        errorMsg.style.display = 'block';  // Show error message if password is incorrect
        adjustPopupWidth(true);
    }
});

document.getElementById('view-button').addEventListener('click', () => {
    const dataOutput = document.getElementById('data-output');
    
    if (isDataVisible) {
        dataOutput.style.display = 'none';
        adjustPopupWidth(false);  // Reset width when data is hidden
        isDataVisible = false;
    } else {
        chrome.storage.local.get('inputs', (data) => {
            const inputs = data.inputs || [];
            const output = inputs.length > 0 ? inputs.join('\n\n') : 'No data available.';
            dataOutput.value = output;
            dataOutput.style.display = 'block';
            adjustPopupWidth(true);  // Expand width when data is visible
            isDataVisible = true;
        });
    }
});

document.getElementById('export-button').addEventListener('click', () => {
    chrome.storage.local.get('inputs', (data) => {
        const inputs = data.inputs || [];
        const blob = new Blob([inputs.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'input_data.txt';
        a.click();
        URL.revokeObjectURL(url);
    });
});

document.getElementById('clear-button').addEventListener('click', () => {
    chrome.storage.local.remove('inputs', () => {
        errorMsg.style.display = 'none';  // Hide error message when data is cleared
        document.getElementById('data-output').value = '';
        adjustPopupWidth(false);  // Reset width to initial state
        isDataVisible = false;
    });
});

