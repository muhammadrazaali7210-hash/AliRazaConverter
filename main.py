from flask import Flask, request, Response
from PIL import Image
import io
import base64

app = Flask(__name__)

@app.route('/api/convert', methods=['POST', 'OPTIONS'])
def convert_image():
    if request.method == 'OPTIONS':
        res = Response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return res

    try:
        uploaded_files = []
        if request.files:
            for key in request.files:
                uploaded_files.extend(request.files.getlist(key))

        if not uploaded_files:
            return Response("Error: No file stream received by server.", status=400)

        raw_format = request.form.get('format', 'PNG').strip().upper()
        target_format = raw_format.split(' ')[0]

        output_io = io.BytesIO()

        if target_format == 'PDF':
            images = []
            for file_obj in uploaded_files:
                img_bytes = file_obj.read()
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode in ('RGBA', 'P', 'LA'):
                    img = img.convert('RGB')
                images.append(img)

            if not images:
                return Response("Failed to load image streams for PDF", status=400)

            primary = images[0]
            secondary = images[1:] if len(images) > 1 else []
            primary.save(output_io, format='PDF', save_all=True, append_images=secondary)

        elif target_format in ['PNG', 'JPG', 'JPEG', 'WEBP']:
            file_obj = uploaded_files[0]
            img_bytes = file_obj.read()
            img = Image.open(io.BytesIO(img_bytes))

            if target_format in ['JPEG', 'JPG'] and img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')

            save_fmt = 'JPEG' if target_format in ['JPG', 'JPEG'] else target_format
            img.save(output_io, format=save_fmt, quality=95)

        elif target_format in ['MP3', 'M4A', 'WAV', 'MP4', 'MKV']:
            file_obj = uploaded_files[0]
            output_io.write(file_obj.read())

        else:
            return Response(f"Unsupported format: {target_format}", status=400)

        output_io.seek(0)
        encoded_output = base64.b64encode(output_io.getvalue()).decode('utf-8')

        mime_types = {
            'PNG': 'image/png',
            'JPEG': 'image/jpeg',
            'JPG': 'image/jpeg',
            'WEBP': 'image/webp',
            'PDF': 'application/pdf',
            'MP3': 'audio/mpeg',
            'M4A': 'audio/mp4',
            'WAV': 'audio/wav',
            'MP4': 'video/mp4',
            'MKV': 'video/x-matroska'
        }

        res = Response(encoded_output, status=200, mimetype='text/plain')
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['X-MIME-Type'] = mime_types.get(target_format, 'application/octet-stream')
        return res

    except Exception as err:
        return Response(f"Processing Error: {str(err)}", status=500)
