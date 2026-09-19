document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');
    const protocolSelect = document.getElementById('protocol-select');
    const executeBtn = document.getElementById('execute-btn');
    const statusBox = document.getElementById('status-box');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileLabel.textContent = `Target Loaded: ${fileInput.files[0].name}`;
        }
    });

    executeBtn.addEventListener('click', async () => {
        if (!fileInput.files || fileInput.files.length === 0) {
            statusBox.textContent = 'Error: No asset stream initialized, sir.';
            return;
        }

        const selectedFormat = protocolSelect.value;
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('format', selectedFormat);

        statusBox.textContent = 'Executing translation batch...';

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Batch compilation failed');
            }

            const blob = await response.blob();
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
            statusBox.textContent = 'Error during conversion pipeline.';
        }
    });
});
