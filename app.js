const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusBox = document.getElementById('status');

let selectedFiles = [];
const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks to guarantee < 4.5MB Vercel limit

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    updateFileLabel();
});

function updateFileLabel() {
    if (selectedFiles.length > 0) {
        fileLabel.innerText = `${selectedFiles.length} file(s) selected: ${selectedFiles.map(f => f.name).join(', ')}`;
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
    const fileId = `file_${Date.now()}`;

    try {
        const processedImages = [];

        for (let fIdx = 0; fIdx < selectedFiles.length; fIdx++) {
            const file = selectedFiles[fIdx];
            const base64Str = await fileToBase64(file);
            const totalChunks = Math.ceil(base64Str.length / CHUNK_SIZE);

            statusBox.innerText = `Uploading file ${fIdx + 1}/${selectedFiles.length} in ${totalChunks} chunks to Vercel...`;

            for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                const chunk = base64Str.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);

                const res = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload_chunk',
                        fileId: `${fileId}_${fIdx}`,
                        chunkIndex: chunkIdx,
                        totalChunks: totalChunks,
                        chunkData: chunk
                    })
                });

                if (!res.ok) throw new Error(`Chunk ${chunkIdx + 1} transfer failed.`);
            }

            processedImages.push(`${fileId}_${fIdx}`);
        }

        statusBox.innerText = 'Assembling chunks and converting on Vercel engine...';

        const finalRes = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'process',
                fileIds: processedImages,
                format: targetFormat
            })
        });

        if (!finalRes.ok) throw new Error('Vercel assembly/conversion failed.');

        const result = await finalRes.json();
        statusBox.innerText = 'Conversion complete. Initiating download, sir.';

        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `converted_result.${targetFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        statusBox.innerText = `Error: ${err.message}`;
    }
});
