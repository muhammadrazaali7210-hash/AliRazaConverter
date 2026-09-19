from flask import Flask, request, send_file, Response
from PIL import Image
import io

app = Flask(__name__)

@app.errorhandler(Exception)
def handle_exception(e):
    return Response(f"Execution Error: {str(e)}", status=500, mimetype='text/plain')

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
            return Response("Error: No file binary stream received.", status=400)

        raw_format = request.form.get('format', 'PNG').strip().upper()
        target_format = raw_format.split(' ')[0]

        output_io = io.BytesIO()

        if target_format == 'PDF':
            images = []
            for file_obj in uploaded_files:
                try:
                    img = Image.open(file_obj)
                    if img.mode in ('RGBA', 'P', 'LA'):
                        img = img.convert('RGB')
                    images.append(img)
                except Exception as img_err:
                    return Response(f"Invalid image asset: {str(img_err)}", status=400)

            if not images:
                return Response("Failed to process image assets for PDF", status=400)

            primary = images[0]
            secondary = images[1:] if len(images) > 1 else []
            primary.save(output_io, format='PDF', save_all=True, append_images=secondary)

        elif target_format in ['PNG', 'JPG', 'JPEG', 'WEBP']:
            file_obj = uploaded_files[0]
            img = Image.open(file_obj)

            if target_format in ['JPEG', 'JPG'] and img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')

            save_fmt = 'JPEG' if target_format in ['JPG', 'JPEG'] else target_format
            img.save(output_io, format=save_fmt, quality=95)

        elif target_format in ['MP3', 'M4A', 'WAV', 'MP4', 'MKV']:
            file_obj = uploaded_files[0]
            output_io.write(file_obj.read())

        else:
            return Response(f"Unsupported format specified: {target_format}", status=400)

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

    except Exception as err:
        return Response(f"Server Processing Error: {str(err)}", status=500)
