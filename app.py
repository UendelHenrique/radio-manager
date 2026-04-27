import os
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, abort
from werkzeug.utils import secure_filename
import database

app = Flask(__name__, static_folder='static', static_url_path='/')

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Rota Principal - Serve o Frontend
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

# -- SECURITY DEPENDENCIES --
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        parts = token.replace('Bearer ', '').split('|')
        if len(parts) >= 1:
            return f(*args, **kwargs)
        return jsonify({'error': 'Token invalid'}), 401
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        parts = token.replace('Bearer ', '').split('|')
        if len(parts) >= 2 and parts[1] == 'admin':
            return f(*args, **kwargs)
        return jsonify({'error': 'Admin access required'}), 403
    return decorated

# -- API ENDPOINTS --

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = database.authenticate_user(data.get('username', ''), data.get('password', ''))
    if user:
        token = f"{user['id']}|{user['role']}"
        return jsonify({"token": token, "user": user})
    return jsonify({"error": "Credenciais invalidas"}), 401

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    return jsonify(database.get_all_users())

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    user = database.create_user(request.json)
    if user:
        return jsonify(user), 201
    return jsonify({"error": "Falha ou usuario ja existe"}), 400

@app.route('/api/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    updated = database.update_user(user_id, request.json)
    if updated:
        return jsonify(updated)
    return jsonify({"error": "Usuário não encontrado"}), 404

@app.route('/api/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    success = database.delete_user(user_id)
    if success:
        return jsonify({"message": "Usuário excluído"})
    return jsonify({"error": "Usuário não encontrado"}), 404

@app.route('/api/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    stats = database.get_dashboard_stats()
    return jsonify(stats)

@app.route('/api/search', methods=['GET'])
@token_required
def search():
    query = request.args.get('q', '')
    results = database.search_all(query)
    return jsonify(results)

@app.route('/api/gras', methods=['GET'])
@token_required
def get_gras():
    gras = database.get_gras()
    return jsonify(gras)

@app.route('/api/gras', methods=['POST'])
@token_required
def create_gra():
    data = request.json
    new_gra = database.create_gra(data)
    return jsonify(new_gra), 201

@app.route('/api/gras/<gra_id>', methods=['PUT'])
@token_required
def update_gra(gra_id):
    data = request.json
    updated = database.update_gra(gra_id, data)
    if updated:
        return jsonify(updated)
    return jsonify({"error": "GRA não encontrada"}), 404

@app.route('/api/gras/<gra_id>', methods=['DELETE'])
@token_required
def delete_gra(gra_id):
    success = database.delete_gra(gra_id)
    if success:
        return jsonify({"message": "GRA excluída"}), 200
    return jsonify({"error": "GRA não encontrada"}), 404

@app.route('/api/gras/<gra_id>/radios', methods=['GET'])
@token_required
def get_radios(gra_id):
    radios = database.get_radios_by_gra(gra_id)
    return jsonify(radios)

@app.route('/api/radios', methods=['GET'])
@token_required
def get_all_radios():
    status = request.args.get('status')
    radios = database.get_all_radios(status)
    return jsonify(radios)

@app.route('/api/radios', methods=['POST'])
@token_required
def create_radio():
    data = request.json
    new_radio = database.create_radio(data)
    return jsonify(new_radio), 201

@app.route('/api/radios/<radio_id>', methods=['PUT'])
@token_required
def update_radio(radio_id):
    data = request.json
    updated = database.update_radio(radio_id, data)
    if updated:
        return jsonify(updated)
    return jsonify({"error": "Rádio não encontrado"}), 404

@app.route('/api/radios/<radio_id>/upload', methods=['POST'])
@token_required
def upload_file(radio_id):
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400
        
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        # Salva o arquivo no formato radioid_nome.pdf
        filename = secure_filename(f"{radio_id}.{ext}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Atualiza banco
        updated = database.update_radio(radio_id, {"laudo_pdf_path": filename})
        return jsonify({"message": "Arquivo salvo com sucesso", "radio": updated})
        
    return jsonify({"error": "Tipo de arquivo não permitido"}), 400

@app.route('/api/uploads/<filename>')
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
