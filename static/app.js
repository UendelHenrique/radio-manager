const app = {
    currentGraId: null,
    token: null,
    userRole: null,

    init() {
        this.token = localStorage.getItem('rm_token');
        this.userRole = localStorage.getItem('rm_role');
        
        this.setupNavigation();
        this.setupSearch();
        this.setupModals();
        this.setupForms();
        this.setupSidebarToggle();
        
        if (this.token) {
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    setupCustomSelects() {
        document.querySelectorAll('select').forEach(nativeSelect => {
            if (nativeSelect.closest('.custom-select-wrapper')) return;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
            wrapper.appendChild(nativeSelect);
            nativeSelect.style.display = 'none';

            const customSelect = document.createElement('div');
            customSelect.className = 'custom-select';
            
            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            const initialText = nativeSelect.options[nativeSelect.selectedIndex] ? nativeSelect.options[nativeSelect.selectedIndex].text : '';
            trigger.innerHTML = `<span>${initialText}</span><div class="arrow-down"></div>`;
            
            const optionsList = document.createElement('div');
            optionsList.className = 'custom-options';
            
            Array.from(nativeSelect.options).forEach(opt => {
                const optionEl = document.createElement('div');
                optionEl.className = 'custom-option';
                if (opt.selected) optionEl.classList.add('selected');
                optionEl.dataset.value = opt.value;
                optionEl.innerText = opt.text;
                
                optionEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    nativeSelect.value = this.dataset.value;
                    trigger.querySelector('span').innerText = this.innerText;
                    optionsList.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');
                    customSelect.classList.remove('open');
                    
                    const event = new Event('change');
                    nativeSelect.dispatchEvent(event);
                });
                optionsList.appendChild(optionEl);
            });
            
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.custom-select').forEach(s => {
                    if (s !== customSelect) s.classList.remove('open');
                });
                customSelect.classList.toggle('open');
            });
            
            customSelect.appendChild(trigger);
            customSelect.appendChild(optionsList);
            wrapper.appendChild(customSelect);
        });
        
        window.addEventListener('click', function(e) {
            document.querySelectorAll('.custom-select').forEach(select => {
                if (!select.contains(e.target)) {
                    select.classList.remove('open');
                }
            });
        });
    },

    updateCustomSelect(id) {
        const nativeSelect = document.getElementById(id);
        if (!nativeSelect) return;
        const wrapper = nativeSelect.closest('.custom-select-wrapper');
        if (!wrapper) return;
        const triggerSpan = wrapper.querySelector('.custom-select-trigger span');
        const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
        if (selectedOption) {
            triggerSpan.innerText = selectedOption.text;
            wrapper.querySelectorAll('.custom-option').forEach(el => {
                if (el.dataset.value === nativeSelect.value) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });
        }
    },

    showLogin() {
        document.getElementById('app-layout').style.display = 'none';
        document.getElementById('login-layout').style.display = 'flex';
    },

    showApp() {
        document.getElementById('login-layout').style.display = 'none';
        document.getElementById('app-layout').style.display = 'flex';
        
        // Hide config menu if not admin
        if(this.userRole === 'admin') {
            document.getElementById('nav-users').style.display = 'block';
        } else {
            document.getElementById('nav-users').style.display = 'none';
        }
        
        this.navigateTo('dashboard');
    },

    async apiFetch(url, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            this.logout();
            throw new Error('Unauthorized');
        }
        return response;
    },

    logout() {
        this.token = null;
        this.userRole = null;
        localStorage.removeItem('rm_token');
        localStorage.removeItem('rm_role');
        this.showLogin();
    },

    setupSidebarToggle() {
        const btn = document.getElementById('btn-toggle-sidebar');
        const sidebar = document.querySelector('.sidebar');
        if(btn && sidebar) {
            btn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
    },

    // --- Navigation ---
    setupNavigation() {
        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('dashboard');
        });
        document.getElementById('nav-gras').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('gras');
        });
        document.getElementById('nav-users').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('users');
        });
        document.getElementById('nav-logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    },

    setupSearch() {
        let timeout = null;
        const searchInput = document.getElementById('global-search');
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            if (query.length > 0) {
                timeout = setTimeout(() => {
                    this.loadSearch(query);
                }, 300); // 300ms delay para não travar enquanto o usuário digita
            } else {
                document.getElementById('search-results-area').style.display = 'none';
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Evita recarregar a pagina caso esteja num form
                const query = e.target.value.trim();
                if (query) {
                    this.loadSearch(query);
                }
            }
        });
    },

    navigateTo(viewId, param = null) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        // Remove active state from nav
        document.querySelectorAll('.sidebar nav a').forEach(el => el.classList.remove('active'));
        
        // Hide buttons and search area
        document.getElementById('btn-nova-gra').style.display = 'none';
        document.getElementById('btn-novo-radio').style.display = 'none';
        document.getElementById('search-results-area').style.display = 'none';
        document.getElementById('global-search').value = '';

        if (viewId === 'dashboard') {
            document.getElementById('view-dashboard').classList.add('active');
            document.getElementById('nav-dashboard').classList.add('active');
            document.getElementById('page-title').innerText = 'Dashboard Inicial';
            this.loadDashboard();
        } 
        else if (viewId === 'gras') {
            document.getElementById('view-gras').classList.add('active');
            document.getElementById('nav-gras').classList.add('active');
            document.getElementById('page-title').innerText = 'Listagem de GRAs';
            document.getElementById('btn-nova-gra').style.display = 'block';
            this.loadGras();
        }
        else if (viewId === 'gra-detalhes') {
            document.getElementById('view-gra-detalhes').classList.add('active');
            document.getElementById('nav-gras').classList.add('active');
            document.getElementById('page-title').innerText = 'Detalhes da GRA';
            document.getElementById('btn-novo-radio').style.display = 'block';
            this.currentGraId = param;
            this.loadGraDetails(param);
        }
        else if (viewId === 'users') {
            document.getElementById('view-users').classList.add('active');
            document.getElementById('nav-users').classList.add('active');
            document.getElementById('page-title').innerText = 'Gestão de Usuários';
            this.loadUsers();
        }
    },

    // --- Data Loaders ---
    async loadDashboard() {
        const res = await this.apiFetch('/api/dashboard');
        const data = await res.json();
        document.getElementById('stat-gras-ativas').innerText = data.gras_ativas;
        document.getElementById('stat-gras-finalizadas').innerText = data.gras_finalizadas;
        document.getElementById('stat-radios-recebidos').innerText = data.radios_recebidos;
        document.getElementById('stat-radios-enviados').innerText = data.radios_enviados;
        document.getElementById('stat-radios-retornados').innerText = data.radios_retornados;
        document.getElementById('stat-radios-devolvidos').innerText = data.radios_devolvidos;
        document.getElementById('stat-radios-descarte').innerText = data.radios_descarte;
    },

    async loadGras() {
        const res = await this.apiFetch('/api/gras');
        const gras = await res.json();
        const tbody = document.getElementById('lista-gras-body');
        tbody.innerHTML = '';
        
        gras.forEach(gra => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.navigateTo('gra-detalhes', gra.id);
            
            let statusClass = 'bg-info';
            if(gra.status === 'Finalizada') statusClass = 'bg-success';
            
            tr.innerHTML = `
                <td><strong>${gra.numero_gra}</strong></td>
                <td>${gra.qtd_radios}</td>
                <td><span class="badge ${statusClass}">${gra.status}</span></td>
                <td>${gra.data_criacao}</td>
                <td>${gra.data_orcamento || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async loadGraDetails(graId) {
        // Fetch GRA info and its radios
        const [graRes, radiosRes] = await Promise.all([
            this.apiFetch('/api/gras').then(r => r.json()),
            this.apiFetch(`/api/gras/${graId}/radios`).then(r => r.json())
        ]);
        
        const gra = graRes.find(g => g.id === graId);
        if(!gra) return;

        document.getElementById('detalhe-gra-numero').innerText = gra.numero_gra;
        
        let statusClass = 'bg-info';
        if(gra.status === 'Finalizada') statusClass = 'bg-success';
        const stBadge = document.getElementById('detalhe-gra-status');
        stBadge.className = `badge ${statusClass}`;
        stBadge.innerText = gra.status;

        const tbody = document.getElementById('lista-radios-body');
        tbody.innerHTML = '';

        radiosRes.forEach(radio => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = (e) => {
                if (e.target.tagName.toLowerCase() === 'a') return;
                this.openEditRadio(radio);
            };
            
            // Regra de Viabilidade
            let viabilidade = '';
            let custoPercentual = 0;
            if (radio.valor_novo > 0) {
                custoPercentual = (radio.valor_reparo / radio.valor_novo) * 100;
                if (custoPercentual > 70) {
                    viabilidade = `<span class="cost-danger">⚠ ALTO CUSTO (${custoPercentual.toFixed(0)}%)</span>`;
                } else {
                    viabilidade = `<span class="cost-safe">Viável (${custoPercentual.toFixed(0)}%)</span>`;
                }
            } else {
                viabilidade = '-';
            }

            let statusRClass = 'bg-info';
            if(radio.status === 'Recebido') statusRClass = 'bg-info';
            if(radio.status === 'Enviado') statusRClass = 'bg-warning';
            if(radio.status === 'Retornado') statusRClass = 'bg-success';
            if(radio.status === 'Devolvido') statusRClass = 'bg-success';
            if(radio.status === 'Descarte') statusRClass = 'bg-dark';

            let laudoLink = radio.laudo_pdf_path 
                ? `<a href="/api/uploads/${radio.laudo_pdf_path}" target="_blank" style="color:var(--accent);font-size:12px;">📄 Ver Laudo</a>`
                : `<span style="font-size:12px;color:var(--text-secondary)">Sem arquivo</span>`;

            tr.innerHTML = `
                <td><strong>${radio.patrimonio}</strong></td>
                <td>${radio.num_serie} <br> <span style="font-size:12px;color:var(--text-secondary)">${radio.modelo}</span></td>
                <td>${radio.centro_custo}</td>
                <td>${radio.usuario_solicitante} <br> <span style="font-size:12px;color:var(--text-secondary)">CH: ${radio.num_chamado}</span></td>
                <td>${radio.os_prestadora || '-'} <br> <span class="badge ${statusRClass}" style="margin-top:4px;">${radio.status}</span></td>
                <td>${viabilidade}</td>
                <td>
                    ${laudoLink}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    async loadSearch(query) {
        const res = await this.apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        document.getElementById('search-results-area').style.display = 'block';
        document.getElementById('search-gras-container').style.display = 'block';
        document.getElementById('search-radios-container').style.display = 'block';
        document.getElementById('table-title-gras').innerText = 'GRAs Encontradas';
        document.getElementById('table-title-radios').innerText = 'Rádios Encontrados';

        // GRAs Table
        const gBody = document.getElementById('search-gras-body');
        gBody.innerHTML = '';
        if (data.gras.length === 0) gBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhuma GRA encontrada</td></tr>';
        
        data.gras.forEach(gra => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => { document.getElementById('global-search').value = ''; this.navigateTo('gra-detalhes', gra.id); };
            
            let statusClass = 'bg-info';
            if(gra.status === 'Finalizada') statusClass = 'bg-success';
            tr.innerHTML = `
                <td><strong>${gra.numero_gra}</strong></td>
                <td>${gra.qtd_radios}</td>
                <td><span class="badge ${statusClass}">${gra.status}</span></td>
            `;
            gBody.appendChild(tr);
        });

        // Radios Table
        const rBody = document.getElementById('search-radios-body');
        rBody.innerHTML = '';
        if (data.radios.length === 0) rBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum rádio encontrado</td></tr>';

        data.radios.forEach(radio => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => { 
                this.currentGraId = radio.gra_id; 
                this.openEditRadio(radio); 
            };
            
            let statusRClass = 'bg-info';
            if(radio.status === 'Recebido') statusRClass = 'bg-info';
            if(radio.status === 'Enviado') statusRClass = 'bg-warning';
            if(radio.status === 'Retornado') statusRClass = 'bg-success';
            if(radio.status === 'Devolvido') statusRClass = 'bg-success';
            if(radio.status === 'Descarte') statusRClass = 'bg-dark';

            let laudoLink = radio.laudo_pdf_path 
                ? `<a href="/api/uploads/${radio.laudo_pdf_path}" target="_blank" style="color:var(--accent);font-size:12px;">📄 Ver Laudo</a>`
                : `<span style="font-size:12px;color:var(--text-secondary)">Sem arquivo</span>`;

            tr.innerHTML = `
                <td><strong>${radio.numero_gra}</strong></td>
                <td><strong>${radio.patrimonio}</strong></td>
                <td>${radio.num_serie} <br> <span style="font-size:12px;color:var(--text-secondary)">${radio.modelo}</span></td>
                <td>${radio.usuario_solicitante} <br> <span style="font-size:12px;color:var(--text-secondary)">CH: ${radio.num_chamado}</span></td>
                <td>${radio.os_prestadora || '-'} <br> <span class="badge ${statusRClass}" style="margin-top:4px;">${radio.status}</span></td>
                <td onclick="event.stopPropagation();">${laudoLink}</td>
            `;
            rBody.appendChild(tr);
        });
    },

    async loadFilter(type, status) {
        document.getElementById('search-results-area').style.display = 'block';
        const gContainer = document.getElementById('search-gras-container');
        const rContainer = document.getElementById('search-radios-container');

        if (type === 'gra') {
            gContainer.style.display = 'block';
            rContainer.style.display = 'none';
            document.getElementById('table-title-gras').innerText = `GRAs Filtradas: ${status}`;
            
            const res = await this.apiFetch('/api/gras');
            let gras = await res.json();
            if (status === 'Ativas') {
                gras = gras.filter(g => g.status !== 'Finalizada');
            } else {
                gras = gras.filter(g => g.status === 'Finalizada');
            }
            
            const gBody = document.getElementById('search-gras-body');
            gBody.innerHTML = '';
            if (gras.length === 0) gBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhuma GRA encontrada</td></tr>';
            
            gras.forEach(gra => {
                const tr = document.createElement('tr');
                tr.className = 'clickable';
                tr.onclick = () => { document.getElementById('global-search').value = ''; this.navigateTo('gra-detalhes', gra.id); };
                let statusClass = 'bg-info';
                if(gra.status === 'Finalizada') statusClass = 'bg-success';
                tr.innerHTML = `<td><strong>${gra.numero_gra}</strong></td><td>${gra.qtd_radios}</td><td><span class="badge ${statusClass}">${gra.status}</span></td>`;
                gBody.appendChild(tr);
            });

        } else if (type === 'radio') {
            gContainer.style.display = 'none';
            rContainer.style.display = 'block';
            document.getElementById('table-title-radios').innerText = `Rádios Filtrados: ${status}`;
            
            const res = await this.apiFetch(`/api/radios?status=${encodeURIComponent(status)}`);
            const radios = await res.json();
            
            const rBody = document.getElementById('search-radios-body');
            rBody.innerHTML = '';
            if (radios.length === 0) rBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum rádio encontrado</td></tr>';

            radios.forEach(radio => {
                const tr = document.createElement('tr');
                tr.className = 'clickable';
                tr.onclick = () => { 
                    this.currentGraId = radio.gra_id; 
                    this.openEditRadio(radio); 
                };
                
                let statusRClass = 'bg-info';
                if(radio.status === 'Recebido') statusRClass = 'bg-info';
                if(radio.status === 'Enviado') statusRClass = 'bg-warning';
                if(radio.status === 'Retornado') statusRClass = 'bg-success';
                if(radio.status === 'Devolvido') statusRClass = 'bg-success';
                if(radio.status === 'Descarte') statusRClass = 'bg-dark';

                let laudoLink = radio.laudo_pdf_path 
                    ? `<a href="/api/uploads/${radio.laudo_pdf_path}" target="_blank" style="color:var(--accent);font-size:12px;">📄 Ver Laudo</a>`
                    : `<span style="font-size:12px;color:var(--text-secondary)">Sem arquivo</span>`;

                tr.innerHTML = `
                    <td><strong>${radio.numero_gra}</strong></td>
                    <td><strong>${radio.patrimonio}</strong></td>
                    <td>${radio.num_serie} <br> <span style="font-size:12px;color:var(--text-secondary)">${radio.modelo}</span></td>
                    <td>${radio.usuario_solicitante} <br> <span style="font-size:12px;color:var(--text-secondary)">CH: ${radio.num_chamado}</span></td>
                    <td>${radio.os_prestadora || '-'} <br> <span class="badge ${statusRClass}" style="margin-top:4px;">${radio.status}</span></td>
                    <td onclick="event.stopPropagation();">${laudoLink}</td>
                `;
                rBody.appendChild(tr);
            });
        }
    },

    // --- Modals ---
    setupModals() {
        document.getElementById('btn-nova-gra').onclick = () => {
            document.getElementById('input-gra-data-criacao').value = new Date().toISOString().split('T')[0];
            document.getElementById('modal-nova-gra').classList.add('active');
        };
        document.getElementById('btn-novo-radio').onclick = () => {
            document.getElementById('form-radio').reset();
            document.getElementById('r-id').value = '';
            document.getElementById('r-os').value = '';
            document.getElementById('r-status-group').style.display = 'none';
            document.getElementById('r-status').value = 'Recebido';
            this.updateCustomSelect('r-status');
            document.getElementById('r-pdf').value = '';
            document.getElementById('modal-radio-title').innerText = 'Adicionar rádio à GRA';
            document.getElementById('modal-radio').classList.add('active');
        };

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = (e) => {
                e.target.closest('.modal').classList.remove('active');
            };
        });

        // Fechar ao clicar fora
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('active');
            }
        };

        // Format money fields on blur
        const formatMoneyInput = (e) => {
            if (e.target.value) {
                e.target.value = parseFloat(e.target.value).toFixed(2);
            }
        };
        document.getElementById('r-vreparo').addEventListener('blur', formatMoneyInput);
        document.getElementById('r-vnovo').addEventListener('blur', formatMoneyInput);
    },

    openEditRadio(radio) {
        document.getElementById('r-id').value = radio.id;
        document.getElementById('r-patrimonio').value = radio.patrimonio || '';
        document.getElementById('r-serie').value = radio.num_serie || '';
        document.getElementById('r-modelo').value = radio.modelo || '';
        document.getElementById('r-cc').value = radio.centro_custo || '';
        document.getElementById('r-usuario').value = radio.usuario_solicitante || '';
        document.getElementById('r-chamado').value = radio.num_chamado || '';
        document.getElementById('r-vreparo').value = radio.valor_reparo ? parseFloat(radio.valor_reparo).toFixed(2) : '';
        document.getElementById('r-vnovo').value = radio.valor_novo ? parseFloat(radio.valor_novo).toFixed(2) : '';
        document.getElementById('r-os').value = radio.os_prestadora || '';
        document.getElementById('r-status').value = radio.status || 'Recebido';
        document.getElementById('r-pdf').value = '';
        
        document.getElementById('r-status-group').style.display = 'block';
        document.getElementById('r-status').value = radio.status;
        this.updateCustomSelect('r-status');
        document.getElementById('modal-radio-title').innerText = 'Atualizar Rádio';
        
        document.getElementById('modal-radio').classList.add('active');
    },

    async openEditGra() {
        const res = await this.apiFetch('/api/gras');
        const gras = await res.json();
        const gra = gras.find(g => g.id === this.currentGraId);
        
        if (gra) {
            document.getElementById('edit-gra-numero').value = gra.numero_gra;
            document.getElementById('edit-gra-data-criacao').value = gra.data_criacao || '';
            document.getElementById('edit-gra-data-orcamento').value = gra.data_orcamento || '';
            document.getElementById('modal-editar-gra').classList.add('active');
        }
    },

    async deleteGra() {
        if (confirm("Tem certeza que deseja excluir esta GRA e todos os seus rádios? Esta ação não pode ser desfeita.")) {
            await this.apiFetch(`/api/gras/${this.currentGraId}`, { method: 'DELETE' });
            this.navigateTo('gras');
        }
    },

    async loadUsers() {
        const res = await this.apiFetch('/api/users');
        const users = await res.json();
        const tbody = document.getElementById('lista-users-body');
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.username}</strong></td>
                <td><span class="badge ${u.role === 'admin' ? 'bg-warning' : 'bg-info'}">${u.role}</span></td>
                <td style="display: flex; justify-content: flex-end; gap: 8px; min-width: 160px;">
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick='app.openEditUserModal(${JSON.stringify(u)})'>Editar</button>
                    ${u.username !== 'admin' ? `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick='app.deleteUser("${u.id}")'>Excluir</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openNewUserModal() {
        document.getElementById('form-novo-usuario').reset();
        document.getElementById('input-usr-id').value = '';
        document.getElementById('modal-usuario-title').innerText = 'Nova Conta de Acesso';
        document.getElementById('input-usr-nome').disabled = false;
        document.getElementById('input-usr-senha-hint').style.display = 'none';
        document.getElementById('input-usr-papel').value = 'user';
        this.updateCustomSelect('input-usr-papel');
        document.getElementById('modal-novo-usuario').classList.add('active');
    },

    openEditUserModal(user) {
        document.getElementById('form-novo-usuario').reset();
        document.getElementById('input-usr-id').value = user.id;
        document.getElementById('input-usr-nome').value = user.username;
        document.getElementById('input-usr-nome').disabled = true; // prevent changing username
        document.getElementById('input-usr-papel').value = user.role;
        document.getElementById('modal-usuario-title').innerText = 'Editar Usuário';
        document.getElementById('input-usr-senha-hint').style.display = 'block';
        document.getElementById('modal-novo-usuario').classList.add('active');
    },

    async deleteUser(userId) {
        if(confirm("Tem certeza que deseja excluir este usuário?")) {
            const res = await this.apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
            if(res.ok) {
                this.loadUsers();
            } else {
                alert("Falha ao excluir usuário.");
            }
        }
    },

    // --- Forms Setup ---
    setupForms() {
        // Login Form
        document.getElementById('form-login').onsubmit = async (e) => {
            e.preventDefault();
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-password').value;
            const err = document.getElementById('login-error');
            err.innerText = '';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p})
                });
                
                if (response.ok) {
                    const data = await response.json();
                    app.token = data.token;
                    app.userRole = data.user.role;
                    localStorage.setItem('rm_token', data.token);
                    localStorage.setItem('rm_role', data.user.role);
                    document.getElementById('form-login').reset();
                    app.showApp();
                } else {
                    err.innerText = 'Usuário ou senha incorretos.';
                }
            } catch (error) {
                err.innerText = 'Erro ao conectar ao servidor.';
            }
        };

        // Nova Conta User / Editar
        document.getElementById('form-novo-usuario').onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('input-usr-id').value;
            const usr = document.getElementById('input-usr-nome').value;
            const pwd = document.getElementById('input-usr-senha').value;
            const role = document.getElementById('input-usr-papel').value;
            
            if (!id && !pwd) {
                alert("A senha é obrigatória para novos usuários.");
                return;
            }

            let res;
            if (id) {
                // Update
                res = await this.apiFetch(`/api/users/${id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({password: pwd, role: role})
                });
            } else {
                // Create
                res = await this.apiFetch('/api/users', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: usr, password: pwd, role: role})
                });
            }
            
            if (res.ok) {
                document.getElementById('modal-novo-usuario').classList.remove('active');
                this.loadUsers();
            } else {
                alert("Falha ao salvar usuário. Verifique as informações ou contate o suporte.");
            }
        };

        // Nova GRA
        document.getElementById('form-nova-gra').onsubmit = async (e) => {
            e.preventDefault();
            const graNum = document.getElementById('input-gra-numero').value;
            const dataCriacao = document.getElementById('input-gra-data-criacao').value;
            
            await this.apiFetch('/api/gras', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ numero_gra: graNum, data_criacao: dataCriacao })
            });
            
            document.getElementById('modal-nova-gra').classList.remove('active');
            document.getElementById('form-nova-gra').reset();
            this.loadGras();
        };

        // Editar GRA
        document.getElementById('form-editar-gra').onsubmit = async (e) => {
            e.preventDefault();
            const graNum = document.getElementById('edit-gra-numero').value;
            const dataCriacao = document.getElementById('edit-gra-data-criacao').value;
            const dataOrcamento = document.getElementById('edit-gra-data-orcamento').value;
            
            await this.apiFetch(`/api/gras/${this.currentGraId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ numero_gra: graNum, data_criacao: dataCriacao, data_orcamento: dataOrcamento })
            });
            
            document.getElementById('modal-editar-gra').classList.remove('active');
            this.loadGraDetails(this.currentGraId);
        };

        // Salvar Rádio (Novo ou Edição)
        document.getElementById('form-radio').onsubmit = async (e) => {
            e.preventDefault();
            const radioId = document.getElementById('r-id').value;
            
            const payload = {
                gra_id: this.currentGraId,
                patrimonio: document.getElementById('r-patrimonio').value,
                num_serie: document.getElementById('r-serie').value,
                modelo: document.getElementById('r-modelo').value,
                centro_custo: document.getElementById('r-cc').value,
                usuario_solicitante: document.getElementById('r-usuario').value,
                num_chamado: document.getElementById('r-chamado').value,
                valor_reparo: document.getElementById('r-vreparo').value,
                valor_novo: document.getElementById('r-vnovo').value,
                os_prestadora: document.getElementById('r-os').value
            };

            let finalRadioId = radioId;
            if (radioId) {
                // Modo Edição
                payload.status = document.getElementById('r-status').value;
                await this.apiFetch(`/api/radios/${radioId}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
            } else {
                // Modo Criação
                const newRes = await this.apiFetch('/api/radios', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const newRadio = await newRes.json();
                finalRadioId = newRadio.id;
            }

            // File Upload (Para novo e edição)
            if (finalRadioId) {
                const fileInput = document.getElementById('r-pdf');
                if (fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    await this.apiFetch(`/api/radios/${finalRadioId}/upload`, {
                        method: 'POST',
                        body: formData
                    });
                }
            }
            
            document.getElementById('modal-radio').classList.remove('active');
            
            if (document.getElementById('view-gra-detalhes').classList.contains('active')) {
                this.loadGraDetails(this.currentGraId);
            } else {
                this.loadDashboard();
                const searchQuery = document.getElementById('global-search').value.trim();
                if (searchQuery) this.loadSearch(searchQuery);
            }
        };
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
