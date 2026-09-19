document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    const protocolSelect = document.getElementById('protocol-select');
    const executeBtn = document.getElementById('execute-btn');
    const statusBox = document.getElementById('status-box');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const count = fileInput.files.length;
        if (count > 0) {
            fileLabel.textContent = count === 1 
                ? `Target Loaded: ${fileInput.files[0].name}` 
                : `Targets Loaded: ${count} Asset Streams`;
            statusBox.textContent = 'System Standing By, sir.';
        }
    });

    executeBtn.addEventListener('click', async () => {
        if (!fileInput.files || fileInput.files.length === 0) {
            statusBox.textContent = 'Error: No asset stream initialized, sir.';
            return;
        }

        const rawFormat = protocolSelect.value;
        const selectedFormat = rawFormat.split(' ')[0].toUpperCase();

        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
            if (i === 0) {
                formData.append('file', fileInput.files[0]);
            }
        }
        formData.append('format', selectedFormat);

        statusBox.textContent = 'Executing translation batch...';

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Server responded with status ${response.status}`);
            }

            const base64Data = await response.text();
            const mimeType = response.headers.get('X-MIME-Type') || 'application/octet-stream';
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `converted_asset.${selectedFormat.toLowerCase()}`;
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            }, 1000);

            statusBox.textContent = 'Batch execution complete, sir.';

        } catch (error) {
            console.error(error);
            statusBox.textContent = error.message;
        }
    });
});
