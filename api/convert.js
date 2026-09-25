const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// In-memory chunk cache across function warm invocations
global.chunkStore = global.chunkStore || {};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, fileId, chunkIndex, totalChunks, chunkData, fileIds, format } = req.body;

        // Action 1: Store Chunk
        if (action === 'upload_chunk') {
            if (!global.chunkStore[fileId]) {
                global.chunkStore[fileId] = new Array(totalChunks);
            }
            global.chunkStore[fileId][chunkIndex] = chunkData;

            return res.status(200).json({ status: 'chunk_received' });
        }

        // Action 2: Assemble & Convert
        if (action === 'process') {
            const assembledBuffers = [];

            for (const id of fileIds) {
                const chunks = global.chunkStore[id];
                if (!chunks) {
                    return res.status(400).json({ error: 'Session expired or missing chunks.' });
                }

                const fullBase64 = chunks.join('');
                assembledBuffers.push(Buffer.from(fullBase64, 'base64'));

                // Clear memory
                delete global.chunkStore[id];
            }

            if (format === 'pdf') {
                const pdfDoc = await PDFDocument.create();

                for (const imgBuffer of assembledBuffers) {
                    const jpegBuffer = await sharp(imgBuffer).jpeg().toBuffer();
                    const image = await pdfDoc.embedJpg(jpegBuffer);
                    const page = pdfDoc.addPage([image.width, image.height]);
                    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                }

                const pdfBytes = await pdfDoc.save();
                const resultBase64 = Buffer.from(pdfBytes).toString('base64');
                return res.status(200).json({ downloadUrl: `data:application/pdf;base64,${resultBase64}` });
            } else {
                const imgBuffer = assembledBuffers[0];
                let processedBuffer;
                let mimeType = `image/${format}`;

                if (format === 'png') {
                    processedBuffer = await sharp(imgBuffer).png().toBuffer();
                } else if (format === 'jpg' || format === 'jpeg') {
                    processedBuffer = await sharp(imgBuffer).jpeg().toBuffer();
                    mimeType = 'image/jpeg';
                } else if (format === 'webp') {
                    processedBuffer = await sharp(imgBuffer).webp().toBuffer();
                } else if (format === 'bmp') {
                    processedBuffer = await sharp(imgBuffer).toFormat('bmp').toBuffer();
                } else {
                    return res.status(400).json({ error: 'Unsupported format.' });
                }

                const resultBase64 = processedBuffer.toString('base64');
                return res.status(200).json({ downloadUrl: `data:${mimeType};base64,${resultBase64}` });
            }
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
