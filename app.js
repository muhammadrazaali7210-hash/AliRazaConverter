const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.getElementById('fileLabel');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const statusText = document.getElementById('statusText');
const progressPercent = document.getElementById('progressPercent');
const progressBar = document.getElementById('progressBar');

let selectedFiles = [];

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

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function processImageAsync(file, targetFormat) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            // Downscale dimensions slightly for ultra low-end RAM optimization if larger than 4K
            let width = img.width;
            let height = img.height;
            const maxDim = 2560;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            URL.revokeObjectURL(url); // Free memory immediately
            const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
            resolve(canvas.toDataURL(mimeType, 0.85));
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        updateProgress(0, 'Error: Select files first, sir.');
        return;
    }

    const targetFormat = formatSelect.value;
    const totalFiles = selectedFiles.length;

    try {
        if (targetFormat === 'pdf') {
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const progress = ((i + 1) / totalFiles) * 90;
                updateProgress(progress, `Optimizing & Compiling ${i + 1}/${totalFiles}...`);

                // Convert image via lightweight async step to prevent freezing low-end hardware
                const buffer = await readFileAsArrayBuffer(file);
                let image;

                if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(buffer);
                } else {
                    image = await pdfDoc.embedJpg(buffer);
                }

                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });

                // Yield control to UI thread briefly every 3 files for low-end devices
                if (i % 3 === 0) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }

            updateProgress(95, 'Finalizing PDF output...');
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'compiled_document.pdf';
            link.click();

        } else {
            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const progress = ((i + 1) / totalFiles) * 90;
                updateProgress(progress, `Processing ${i + 1}/${totalFiles}...`);

                const convertedDataUrl = await processImageAsync(file, targetFormat);
                const link = document.createElement('a');
                link.href = convertedDataUrl;
                link.download = `converted_${i + 1}.${targetFormat}`;
                link.click();

                await new Promise(r => setTimeout(r, 10));
            }
        }

        updateProgress(100, 'Batch execution finished successfully, sir!');

    } catch (err) {
        updateProgress(0, `Error: ${err.message}`);
    }
});
