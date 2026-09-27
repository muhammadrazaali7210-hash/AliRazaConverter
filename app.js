const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusText = document.getElementById('statusText');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');

let selectedFiles = [];
// Thresholds in bytes
const DIRECT_LIMIT = 3 * 1024 * 1024; // Files <= 3MB upload in 1 request
const CHUNK_SIZE = 2 * 1024 * 1024;   // Files > 3MB split into 2MB chunks

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    updateFileLabel();
});

function updateFileLabel() {
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) queued for execution`;
    } else {
        fileLabel.innerText = 'Drop files here or click to select batch';
    }
}

function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    progressPercent.innerText = `${Math.round(percent)}%`;
    statusText.innerText = text;
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
        updateProgress(0, 'Error: Select files first, sir.');
        return;
    }

    const targetFormat = formatSelect.value;
    const batchSessionId = `batch_${Date.now()}`;
    const processedFileIds = [];
    const totalFiles = selectedFiles.length;

    try {
        // Phase 1: Uploading Files (0% - 70% Progress Range)
        for (let fIdx = 0; fIdx < totalFiles; fIdx++) {
            const file = selectedFiles[fIdx];
            const base64Str = await fileToBase64(file);
            const fileId = `${batchSessionId}_file_${fIdx}`;

            if (base64Str.length <= DIRECT_LIMIT) {
                // Direct single upload for small files
                const currentProgress = ((fIdx + 0.5) / totalFiles) * 70;
                updateProgress(currentProgress, `Uploading file ${fIdx + 1}/${totalFiles}...`);

                const res = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload_chunk',
                        fileId: fileId,
                        chunkIndex: 0,
                        totalChunks: 1,
                        chunkData: base64Str
                    })
                });

                if (!res.ok) throw new Error(`Upload failed on file ${fIdx + 1}`);
            } else {
                // Split into chunks for large files
                const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);

                for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                    const progressVal = ((fIdx + (chunkIdx / totalChunks)) / totalFiles) * 70;
                    updateProgress(progressVal, `Uploading file ${fIdx + 1}/${totalFiles} (Chunk ${chunkIdx + 1}/${totalChunks})...`);

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

                    if (!res.ok) throw new Error(`Chunk error on file ${fIdx + 1}`);
                }
            }

            processedFileIds.push(fileId);
        }

        // Phase 2: Processing (70% - 90% Progress Range)
        updateProgress(80, 'Processing batch on Vercel engine...');

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

        // Phase 3: Downloading (100% Complete)
        updateProgress(100, 'Compilation complete! Initiating download, sir...');

        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `converted_batch.${targetFormat === 'pdf' ? 'pdf' : targetFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        updateProgress(0, `Error: ${err.message}`);
    }
});
