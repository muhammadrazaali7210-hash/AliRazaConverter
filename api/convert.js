const Jimp = require('jimp');
const { PDFDocument } = require('pdf-lib');

global.chunkStore = global.chunkStore || {};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, fileId, chunkIndex, totalChunks, chunkData, fileIds, format } = req.body;

        if (action === 'upload_chunk') {
            if (!global.chunkStore[fileId]) {
                global.chunkStore[fileId] = new Array(totalChunks);
            }
            global.chunkStore[fileId][chunkIndex] = chunkData;
            return res.status(200).json({ status: 'chunk_stored' });
        }

        if (action === 'process') {
            const assembledBuffers = [];

            for (const id of fileIds) {
                const chunks = global.chunkStore[id];
                if (!chunks) {
                    return res.status(400).json({ error: 'Chunk buffer missing or expired.' });
                }

                const fullBase64 = chunks.join('');
                assembledBuffers.push(Buffer.from(fullBase64, 'base64'));
                delete global.chunkStore[id];
            }

            if (format === 'pdf') {
                const pdfDoc = await PDFDocument.create();

                for (const imgBuffer of assembledBuffers) {
                    const jimpImage = await Jimp.read(imgBuffer);
                    const jpegBuffer = await jimpImage.getBufferAsync(Jimp.MIME_JPEG);
                    const image = await pdfDoc.embedJpg(jpegBuffer);
                    const page = pdfDoc.addPage([image.bitmap.width, image.bitmap.height]);
                    page.drawImage(image, { x: 0, y: 0, width: image.bitmap.width, height: image.bitmap.height });
                }

                const pdfBytes = await pdfDoc.save();
                const resultBase64 = Buffer.from(pdfBytes).toString('base64');
                return res.status(200).json({ downloadUrl: `data:application/pdf;base64,${resultBase64}` });
            } else {
                const imgBuffer = assembledBuffers[0];
                const jimpImage = await Jimp.read(imgBuffer);
                let processedBuffer;
                let mimeType = `image/${format}`;

                if (format === 'png') {
                    processedBuffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
                } else if (format === 'jpg' || format === 'jpeg') {
                    processedBuffer = await jimpImage.getBufferAsync(Jimp.MIME_JPEG);
                    mimeType = 'image/jpeg';
                } else if (format === 'bmp') {
                    processedBuffer = await jimpImage.getBufferAsync(Jimp.MIME_BMP);
                } else {
                    return res.status(400).json({ error: 'Unsupported format requested.' });
                }

                const resultBase64 = processedBuffer.toString('base64');
                return res.status(200).json({ downloadUrl: `data:${mimeType};base64,${resultBase64}` });
            }
        }

        return res.status(400).json({ error: 'Invalid action specified.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
