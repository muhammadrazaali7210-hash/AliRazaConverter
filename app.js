const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusBox = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');

let selectedFiles = [];

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    updateFileLabel();
});

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
    updateFileLabel();
});

function updateFileLabel() {
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) selected: ${selectedFiles.map(f => f.name).join(', ')}`;
    } else {
        fileLabel.innerText = 'Drop files here or click to select';
    }
}

convertBtn.addEventListener('click', () => {
    if (selectedFiles.length === 0) {
        statusBox.innerText = 'Error: Please select at least one file first, sir.';
        return;
    }

    // Check payload size threshold (Vercel Serverless payload limit: 4.5 MB)
    let totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 4.5 * 1024 * 1024) {
        statusBox.innerText = `Error: Payload is ${(totalSize / (1024 * 1024)).toFixed(2)} MB. Vercel serverless limit is 4.5 MB per request. Please choose smaller files, sir.`;
        return;
    }

    const targetFormat = formatSelect.value;
    statusBox.innerText = 'Initiating data transmission...';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    const formData = new FormData();
    selectedFiles.forEach((file) => {
        formData.append('files', file);
    });
    formData.append('format', targetFormat);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/convert', true);

    // Track upload progress percentage
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = `${percentComplete}%`;
            statusBox.innerText = `Uploading payload: ${percentComplete}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            progressBar.style.width = '100%';
            statusBox.innerText = 'Batch processing complete. Download initiated, sir.';

            const mimeType = xhr.getResponseHeader('X-MIME-Type') || 'application/octet-stream';
            const link = document.createElement('a');
            link.href = `data:${mimeType};base64,${xhr.responseText}`;
            link.download = `converted_output.${targetFormat.toLowerCase()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            statusBox.innerText = `Execution Error (${xhr.status}): ${xhr.responseText || 'Server payload error'}`;
        }
    };

    xhr.onerror = () => {
        statusBox.innerText = 'Network error: Failed to reach the processing endpoint.';
    };

    xhr.send(formData);
});
