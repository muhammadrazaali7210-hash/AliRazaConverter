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
        if 'file' not in request.files:
            return Response("No file uploaded", status=400)
            
        file = request.files['file']
        target_format = request.form.get('format', 'PNG').upper()

        img = Image.open(file.stream)
        
        if target_format in ['JPEG', 'JPG', 'PDF'] and img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        output_io = io.BytesIO()
        save_format = 'JPEG' if target_format == 'JPG' else target_format
        img.save(output_io, format=save_format)
        output_io.seek(0)

        mime_types = {
            'PNG': 'image/png',
            'JPEG': 'image/jpeg',
            'JPG': 'image/jpeg',
            'WEBP': 'image/webp',
            'PDF': 'application/pdf'
        }
        
        filename = f"converted_asset.{target_format.lower()}"

        response = send_file(
            output_io,
            mimetype=mime_types.get(target_format, 'image/png'),
            as_attachment=True,
            download_name=filename
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        return Response(str(e), status=500)
