const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusBox = document.getElementById('status');

let selectedFiles = [];

// Trigger file picker on click
dropZone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) selected: ${selectedFiles.map(f => f.name).join(', ')}`;
    } else {
        fileLabel.innerText = 'Drop files here or click to select';
    }
});

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#38bdf8';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#0284c7';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#0284c7';
    selectedFiles = Array.from(e.dataTransfer.files);
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) selected: ${selectedFiles.map(f => f.name).join(', ')}`;
    }
});

// Conversion button click
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        statusBox.innerText = 'Error: Please select at least one file first, sir.';
        return;
    }

    const targetFormat = formatSelect.value;
    statusBox.innerText = 'Processing conversion request...';

    const formData = new FormData();
    selectedFiles.forEach((file) => {
        formData.append('files', file);
    });
    formData.append('format', targetFormat);

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Server error occurred');
        }

        const base64Data = await response.text();
        const mimeType = response.headers.get('X-MIME-Type') || 'application/octet-stream';

        // Trigger automatic download
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${base64Data}`;
        link.download = `converted_output.${targetFormat.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        statusBox.innerText = 'Batch processing complete. Download initiated, sir.';
    } catch (err) {
        statusBox.innerText = `Execution Error: ${err.message}`;
    }
});
