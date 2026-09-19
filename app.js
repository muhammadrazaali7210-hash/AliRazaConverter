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

        const selectedFormat = protocolSelect.value;
        const formData = new FormData();
        
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
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
                throw new Error(errText || 'Batch compilation failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `converted_batch.${selectedFormat.toLowerCase()}`;
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            }, 1000);

            statusBox.textContent = 'Batch execution complete, sir.';

        } catch (error) {
            console.error(error);
            statusBox.textContent = error.message || 'Error during conversion pipeline.';
        }
    });
});
