const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusBox = document.getElementById('status');

let selectedFiles = [];
// 2.5MB chunks ensure Base64 string overhead stays strictly under Vercel's 4.5MB limit
const CHUNK_SIZE = 2.5 * 1024 * 1024; 

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    updateFileLabel();
});

function updateFileLabel() {
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) selected:\n` + selectedFiles.map(f => f.name).join('\n');
    } else {
        fileLabel.innerText = 'Drop files here or click to select';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        statusBox.innerText = 'Error: Please select at least one file first, sir.';
        return;
    }

    const targetFormat = formatSelect.value;
    const batchSessionId = `batch_${Date.now()}`;

    try {
        const processedFileIds = [];

        for (let fIdx = 0; fIdx < selectedFiles.length; fIdx++) {
            const file = selectedFiles[fIdx];
            const base64Str = await fileToBase64(file);
            const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);
            const fileId = `${batchSessionId}_file_${fIdx}`;

            for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                statusBox.innerText = `Streaming File ${fIdx + 1}/${selectedFiles.length} (Chunk ${chunkIdx + 1}/${totalChunks})...`;

                const chunkData = base64Str.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);

                const res = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload_chunk',
                        fileId: fileId,
                        chunkIndex: chunkIdx,
                        totalChunks: totalChunks,
                        chunkData: chunkData
                    })
                });

                if (!res.ok) {
                    const errErr = await res.json();
                    throw new Error(errErr.error || `Chunk upload failed on file ${fIdx + 1}`);
                }
            }

            processedFileIds.push(fileId);
        }

        statusBox.innerText = 'All chunks transmitted. Executing server assembly & conversion...';

        const finalRes = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'process',
                fileIds: processedFileIds,
                format: targetFormat
            })
        });

        if (!finalRes.ok) {
            const errData = await finalRes.json();
            throw new Error(errData.error || 'Server processing failed.');
        }

        const result = await finalRes.json();
        statusBox.innerText = 'Batch operation complete. Initiating download, sir.';

        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `converted_batch.${targetFormat === 'pdf' ? 'pdf' : targetFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        statusBox.innerText = `Error: ${err.message}`;
    }
});
