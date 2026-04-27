import json
import os
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')

def ensure_initial_admin(data):
    if 'users' not in data:
        data['users'] = []
    
    if len(data['users']) == 0:
        data['users'].append({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": generate_password_hash("admin"),
            "role": "admin"
        })
        # If we injected data directly into an empty base, we need to save it.
        # But we'll just return it and write_data downstream could be used, or since it's initial we just write it if we had to set it.
    return data

def save_initial_if_needed(data):
    if 'users' in data and len(data['users']) == 1 and data['users'][0]['username'] == 'admin' and len(data.get('gras', [])) == 0:
        write_data(data)
        
def read_data():
    if not os.path.exists(DATA_FILE):
        data = ensure_initial_admin({"gras": [], "radios": [], "users": []})
        write_data(data)
        return data
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            old_len = len(data.get('users', []))
            data = ensure_initial_admin(data)
            if len(data['users']) > old_len:
                write_data(data)
            return data
        except json.JSONDecodeError:
            data = ensure_initial_admin({"gras": [], "radios": [], "users": []})
            write_data(data)
            return data

def authenticate_user(username, password):
    data = read_data()
    for user in data.get('users', []):
        if user['username'].lower() == username.lower():
            if check_password_hash(user['password_hash'], password):
                return {"id": user['id'], "username": user['username'], "role": user['role']}
    return None

def get_all_users():
    data = read_data()
    return [{"id": u['id'], "username": u['username'], "role": u['role']} for u in data.get('users', [])]

def create_user(user_info):
    data = read_data()
    username = user_info.get('username')
    password = user_info.get('password')
    role = user_info.get('role', 'user')
    
    if not username or not password:
        return None
        
    for u in data.get('users', []):
        if u['username'].lower() == username.lower():
            return None
            
    new_user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": generate_password_hash(password),
        "role": role
    }
    data['users'].append(new_user)
    write_data(data)
    return {"id": new_user['id'], "username": new_user['username'], "role": new_user['role']}

def update_user(user_id, update_data):
    data = read_data()
    updated = None
    for u in data.get('users', []):
        if u['id'] == user_id:
            if 'password' in update_data and update_data['password']:
                u['password_hash'] = generate_password_hash(update_data['password'])
            if 'role' in update_data and update_data['role']:
                u['role'] = update_data['role']
            updated = u
            break
    if updated:
        write_data(data)
        return {"id": updated['id'], "username": updated['username'], "role": updated['role']}
    return None

def delete_user(user_id):
    data = read_data()
    initial_len = len(data.get('users', []))
    data['users'] = [u for u in data.get('users', []) if u['id'] != user_id]
    if len(data['users']) < initial_len:
        write_data(data)
        return True
    return False


def write_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_dashboard_stats():
    data = read_data()
    gras = data.get('gras', [])
    radios = data.get('radios', [])
    
    stats = {
        "gras_ativas": len([g for g in gras if g['status'] != 'Finalizada']),
        "gras_finalizadas": len([g for g in gras if g['status'] == 'Finalizada']),
        "radios_recebidos": len([r for r in radios if r.get('status') == 'Recebido']),
        "radios_enviados": len([r for r in radios if r.get('status') == 'Enviado']),
        "radios_retornados": len([r for r in radios if r.get('status') == 'Retornado']),
        "radios_devolvidos": len([r for r in radios if r.get('status') == 'Devolvido']),
        "radios_descarte": len([r for r in radios if r.get('status') == 'Descarte'])
    }
    return stats

def get_gras():
    data = read_data()
    gras = data.get('gras', [])
    # Adicionar o count de radios para cada gra
    radios = data.get('radios', [])
    
    for gra in gras:
        gra['qtd_radios'] = len([r for r in radios if r['gra_id'] == gra['id']])
    
    # Ordenar por data de criação descrescente
    for gra in gras:
        if 'data_criacao' not in gra:
            gra['data_criacao'] = '2000-01-01'
            
    gras.sort(key=lambda x: x['data_criacao'], reverse=True)
    return gras

def get_gra_by_id(gra_id):
    gras = get_gras()
    for g in gras:
        if g['id'] == gra_id:
            return g
    return None

def create_gra(gra_info):
    data = read_data()
    new_gra = {
        "id": str(uuid.uuid4()),
        "numero_gra": gra_info.get('numero_gra', ''),
        "data_criacao": gra_info.get('data_criacao') or datetime.now().strftime("%Y-%m-%d"),
        "status": "Criada",
        "data_orcamento": None
    }
    data['gras'].append(new_gra)
    write_data(data)
    return new_gra

def update_gra_status(gra_id, status):
    data = read_data()
    for g in data['gras']:
        if g['id'] == gra_id:
            g['status'] = status
            write_data(data)
            return g
    return None

def update_gra(gra_id, gra_info):
    data = read_data()
    updated = None
    for g in data['gras']:
        if g['id'] == gra_id:
            if 'numero_gra' in gra_info:
                g['numero_gra'] = gra_info['numero_gra']
            if 'data_criacao' in gra_info:
                g['data_criacao'] = gra_info['data_criacao']
            if 'data_orcamento' in gra_info:
                g['data_orcamento'] = gra_info['data_orcamento']
            updated = g
            break
    if updated:
        write_data(data)
    return updated

def delete_gra(gra_id):
    data = read_data()
    initial_len = len(data['gras'])
    data['gras'] = [g for g in data['gras'] if g['id'] != gra_id]
    if len(data['gras']) < initial_len:
        # Cascade delete as radios
        data['radios'] = [r for r in data['radios'] if r['gra_id'] != gra_id]
        write_data(data)
        return True
    return False

def search_all(query):
    query_lower = query.lower()
    query_clean = query_lower.replace(" ", "").replace("_", "")
    data = read_data()
    
    matched_gras = []
    for g in data['gras']:
        gra_clean = str(g.get('numero_gra', '')).lower().replace(" ", "").replace("_", "")
        if query_clean in gra_clean:
            g_copy = dict(g)
            g_copy['qtd_radios'] = len([r for r in data['radios'] if r['gra_id'] == g['id']])
            matched_gras.append(g_copy)
            
    matched_radios = []
    for r in data['radios']:
        parent_gra = next((g for g in data['gras'] if g['id'] == r['gra_id']), None)
        gra_raw = parent_gra['numero_gra'] if parent_gra else ''
        gra_clean = str(gra_raw).lower().replace(" ", "").replace("_", "")

        values_to_search = [
            str(r.get('patrimonio', '')).lower(),
            str(r.get('num_serie', '')).lower(),
            str(r.get('usuario_solicitante', '')).lower(),
            str(r.get('num_chamado', '')).lower(),
            str(r.get('os_prestadora', '')).lower()
        ]
        
        # Um radio da match se a busca bater num dos campos de texto dele OU bater no numero da GRA dele
        if (query_clean and query_clean in gra_clean) or any(query_lower in val for val in values_to_search):
            r_copy = dict(r)
            r_copy['numero_gra'] = gra_raw if gra_raw else 'S/ GRA'
            matched_radios.append(r_copy)
            
    return {"gras": matched_gras, "radios": matched_radios}

def get_radios_by_gra(gra_id):
    data = read_data()
    return [r for r in data.get('radios', []) if r['gra_id'] == gra_id]

def get_all_radios(status=None):
    data = read_data()
    radios = data.get('radios', [])
    if status:
        radios = [r for r in radios if r.get('status') == status]
        
    for r in radios:
        parent_gra = next((g for g in data['gras'] if g['id'] == r['gra_id']), None)
        r['numero_gra'] = parent_gra['numero_gra'] if parent_gra else 'S/ GRA'
    return radios

def create_radio(radio_info):
    data = read_data()
    new_radio = {
        "id": str(uuid.uuid4()),
        "gra_id": radio_info.get('gra_id'),
        "patrimonio": radio_info.get('patrimonio', ''),
        "num_serie": radio_info.get('num_serie', ''),
        "modelo": radio_info.get('modelo', ''),
        "centro_custo": radio_info.get('centro_custo', ''),
        "usuario_solicitante": radio_info.get('usuario_solicitante', ''),
        "num_chamado": radio_info.get('num_chamado', ''),
        "valor_reparo": float(radio_info.get('valor_reparo', 0) or 0),
        "valor_novo": float(radio_info.get('valor_novo', 0) or 0),
        "laudo_texto": radio_info.get('laudo_texto', ''),
        "laudo_pdf_path": None,
        "os_prestadora": radio_info.get('os_prestadora', ''),
        "status": "Recebido"
    }
    data['radios'].append(new_radio)
    write_data(data)
    return new_radio

def update_radio(radio_id, radio_info):
    data = read_data()
    updated = None
    for r in data['radios']:
        if r['id'] == radio_id:
            if 'status' in radio_info:
                r['status'] = radio_info['status']
            if 'laudo_texto' in radio_info:
                r['laudo_texto'] = radio_info['laudo_texto']
            if 'laudo_pdf_path' in radio_info:
                r['laudo_pdf_path'] = radio_info['laudo_pdf_path']
            if 'valor_reparo' in radio_info:
                r['valor_reparo'] = float(radio_info['valor_reparo'] or 0)
            if 'os_prestadora' in radio_info:
                 r['os_prestadora'] = radio_info['os_prestadora']
            if 'valor_novo' in radio_info:
                r['valor_novo'] = float(radio_info['valor_novo'] or 0)
            if 'patrimonio' in radio_info: r['patrimonio'] = radio_info['patrimonio']
            if 'num_serie' in radio_info: r['num_serie'] = radio_info['num_serie']
            if 'modelo' in radio_info: r['modelo'] = radio_info['modelo']
            if 'centro_custo' in radio_info: r['centro_custo'] = radio_info['centro_custo']
            if 'usuario_solicitante' in radio_info: r['usuario_solicitante'] = radio_info['usuario_solicitante']
            if 'num_chamado' in radio_info: r['num_chamado'] = radio_info['num_chamado']
                
            updated = r
            break
            
    if updated:
        write_data(data)
        check_and_update_gra_status(updated['gra_id'])
    return updated

def check_and_update_gra_status(gra_id):
    """
    Se todos os rádios de uma GRA estiverem 'Retornado' ou 'Devolvido', 
    a GRA muda para 'Finalizada'. E se tiver rádios novos em andamento, garante 'Enviada' ou 'Ativa'.
    """
    radios = get_radios_by_gra(gra_id)
    if not radios:
        return
        
    all_finished = True
    for r in radios:
        if r.get('status') not in ['Retornado', 'Devolvido', 'Descarte']:
            all_finished = False
            break
            
    if all_finished:
        update_gra_status(gra_id, "Finalizada")
    else:
        # Se algum nao ta finalizado e se a GRA tava 'Finalizada', tira de Finalizada
        data = read_data()
        for g in data['gras']:
            if g['id'] == gra_id and g['status'] == 'Finalizada':
                g['status'] = 'Em Andamento'
                write_data(data)
                break
