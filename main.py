from flask import Flask, request, send_file, Response
from PIL import Image
import io

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
        uploaded_files = request.files.getlist('files')
        if not uploaded_files or len(uploaded_files) == 0:
            if 'file' in request.files:
                uploaded_files = [request.files['file']]
            else:
                return Response("No file streams uploaded", status=400)

        target_format = request.form.get('format', 'PNG').strip().upper()
        output_io = io.BytesIO()

        # Document compilation pipeline (PDF)
        if target_format == 'PDF':
            images = []
            for file in uploaded_files:
                img = Image.open(file.stream)
                if img.mode in ('RGBA', 'P', 'LA'):
                    img = img.convert('RGB')
                images.append(img)

            if images:
                primary = images[0]
                secondary = images[1:] if len(images) > 1 else []
                primary.save(output_io, format='PDF', save_all=True, append_images=secondary)

        # Image matrix pipeline (PNG, JPG, WEBP)
        elif target_format in ['PNG', 'JPG', 'JPEG', 'WEBP']:
            file = uploaded_files[0]
            img = Image.open(file.stream)

            if target_format in ['JPEG', 'JPG'] and img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')

            save_format = 'JPEG' if target_format in ['JPG', 'JPEG'] else target_format
            img.save(output_io, format=save_format, quality=95)

        # Media containers placeholder stream (Audio/Video formats)
        elif target_format in ['MP3', 'M4A', 'WAV', 'MP4', 'MKV']:
            file = uploaded_files[0]
            output_io.write(file.read())

        else:
            return Response("Unsupported target format requested", status=400)

        output_io.seek(0)

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

        filename = f"converted_asset.{target_format.lower()}"

        response = send_file(
            output_io,
            mimetype=mime_types.get(target_format, 'application/octet-stream'),
            as_attachment=True,
            download_name=filename
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        return Response(f"Internal Error: {str(e)}", status=500)
