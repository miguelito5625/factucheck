let allProviders = [];
let builderRules = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    // Configurar menú móvil (hamburguesa) si existe
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Load initial data and view
    loadProviders().then(() => {
        loadView('validar');
    });
});

const viewMap = {
    'validar-view': 'validar',
    'builder-view': 'crear',
    'providers-list-view': 'reglas'
};

async function loadView(viewName) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="d-flex align-center gap-4" style="padding: 40px; justify-content: center; color: var(--md-sys-color-on-surface-variant);"><div class="spinner"></div><span>Cargando vista...</span></div>';
    
    // Close sidebar on mobile after clicking
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
    
    try {
        const response = await fetch(`/views/${viewName}.html`);
        if (!response.ok) throw new Error('No se pudo cargar la vista');
        const html = await response.text();
        mainContent.innerHTML = html;
        
        // Initialize logic for the loaded view
        if (viewName === 'validar') initMasivaView();
        if (viewName === 'crear') initCrearView();
        if (viewName === 'reglas') initReglasView();
        
        initFileDropzones();
    } catch (err) {
        mainContent.innerHTML = `<div style="padding: 40px; color: var(--md-sys-color-error);">Error al cargar la vista: ${err.message}</div>`;
    }
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.classList.contains('active')) return;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            loadView(viewMap[targetId]);
        });
    });
}

function initFileDropzones() {
    const zones = [
        { dropzoneId: 'builder-dropzone', inputId: 'builder-file', labelId: 'builder-filename' }
    ];

    zones.forEach(zone => {
        const dz = document.getElementById(zone.dropzoneId);
        const input = document.getElementById(zone.inputId);
        const label = document.getElementById(zone.labelId);
        
        if(!dz) return;

        dz.addEventListener('dragover', (e) => {
            e.preventDefault();
            dz.classList.add('dragover');
        });
        dz.addEventListener('dragleave', () => {
            dz.classList.remove('dragover');
        });
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                label.textContent = e.dataTransfer.files[0].name;
            }
        });
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                label.textContent = input.files[0].name;
            } else {
                label.textContent = 'Ningún archivo seleccionado';
            }
        });
    });
}

async function loadProviders() {
    try {
        const res = await fetch('/api/providers');
        allProviders = await res.json();
        if (!allProviders) allProviders = [];
    } catch (err) {
        console.error('Error loading providers', err);
        allProviders = [];
    }
}

/* =========================================
   View Initializers
========================================= */

function initCrearView() {
    builderRules = [];
    
    const builderForm = document.getElementById('builder-form');
    const extractedTextEl = document.getElementById('extracted-text');
    const selectedTextEl = document.getElementById('selected-text');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const saveProviderBtn = document.getElementById('save-provider-btn');
    
    if(!builderForm) return;

    builderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('builder-file');
        
        if (!fileInput.files[0]) {
            showToast('Selecciona un archivo PDF de ejemplo', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('invoice', fileInput.files[0]);

        try {
            const res = await fetch('/api/detect-heuristics', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desconocido');
            
            extractedTextEl.textContent = data.text;

            // Render Suggestions
            const suggContainer = document.getElementById('builder-suggestions-container');
            const suggList = document.getElementById('builder-suggestions-list');
            
            if (suggContainer && suggList) {
                if (data.result && Object.keys(data.result).length > 0) {
                    suggContainer.style.display = 'block';
                    suggList.innerHTML = '';
                    for (const [key, value] of Object.entries(data.result)) {
                        if (!value) continue;
                        const btn = document.createElement('button');
                        btn.className = 'btn btn-secondary';
                        btn.style.padding = '4px 12px';
                        btn.style.fontSize = '0.8rem';
                        btn.style.height = 'auto';
                        btn.style.borderRadius = '16px';
                        btn.style.backgroundColor = 'var(--md-sys-color-surface)';
                        btn.style.color = 'var(--md-sys-color-primary)';
                        btn.style.border = '1px solid var(--md-sys-color-outline)';
                        btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px;">add</span> ${key}`;
                        btn.title = `Valor detectado: ${value}`;
                        
                        btn.onclick = (e) => {
                            e.preventDefault();
                            const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
                            const escapedValue = value
                                .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
                                .replace(/\s+/g, '\\s+');
                            const regexStr = `${escapedKey}\\s*:\\s*(${escapedValue})`;
                            
                            if (!builderRules.find(r => r.field === key)) {
                                builderRules.push({
                                    field: key,
                                    regex: regexStr,
                                    sample: value,
                                    isIdentifier: false
                                });
                                updateRulesList();
                                showToast(`Regla sugerida "${key}" agregada`, 'success');
                            }
                            
                            btn.disabled = true;
                            btn.style.opacity = '0.5';
                            btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px;">check</span> ${key}`;
                        };
                        suggList.appendChild(btn);
                    }
                } else {
                    suggContainer.style.display = 'none';
                }
            }

            document.getElementById('builder-workspace').style.display = 'block';
            showToast('Texto y sugerencias cargados correctamente', 'success');
            builderRules = [];
            updateRulesList();
            
            document.getElementById('builder-workspace').scrollIntoView({behavior: 'smooth'});
        } catch (err) {
            showToast(`Error al procesar documento: ${err.message}`, 'error');
        }
    });

    extractedTextEl.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (text) {
            selectedTextEl.value = text;
        }
    });

    addRuleBtn.addEventListener('click', async () => {
        const fieldType = document.getElementById('field-type').value;
        const selectedValue = selectedTextEl.value;
        const isIdentifier = document.getElementById('is-identifier-rule') ? document.getElementById('is-identifier-rule').checked : false;
        const isExchangeRate = document.getElementById('is-exchange-rate-rule') ? document.getElementById('is-exchange-rate-rule').checked : false;

        if (!fieldType || !selectedValue) {
            showToast('Selecciona un texto del PDF y asígnale un nombre de campo', 'error');
            return;
        }

        const escapedValue = selectedValue
            .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            .replace(/\s+/g, '\\s+');
        
        const regexStr = `(${escapedValue})`;
        
        let sampleValue = selectedValue;
        if (isExchangeRate) {
            try {
                const banguatRes = await fetch('/api/exchange-rate');
                const banguatData = await banguatRes.json();
                if (banguatData.rate) {
                    sampleValue = banguatData.rate;
                }
            } catch (err) {
                showToast('No se pudo obtener el tipo de cambio oficial', 'error');
            }
        }

        builderRules.push({
            field: fieldType,
            regex: regexStr,
            sample: sampleValue,
            isIdentifier: isIdentifier,
            isExchangeRate: isExchangeRate
        });

        selectedTextEl.value = '';
        document.getElementById('field-type').value = '';
        if (document.getElementById('is-identifier-rule')) document.getElementById('is-identifier-rule').checked = false;
        if (document.getElementById('is-exchange-rate-rule')) document.getElementById('is-exchange-rate-rule').checked = false;
        updateRulesList();
        showToast(`Regla para "${fieldType}" agregada`, 'success');
    });

    saveProviderBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-provider-name').value;
        if (!name || builderRules.length === 0) {
            showToast('El nombre de la regla y al menos un campo configurado son requeridos', 'error');
            return;
        }

        try {
            const res = await fetch('/api/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rules: builderRules })
            });
            if (!res.ok) throw new Error('Error al guardar');
            
            showToast('Regla guardada con éxito', 'success');
            
            document.getElementById('new-provider-name').value = '';
            document.getElementById('builder-workspace').style.display = 'none';
            document.getElementById('builder-form').reset();
            document.getElementById('builder-filename').textContent = 'Ningún archivo seleccionado';
            builderRules = [];
            await loadProviders();
        } catch (err) {
            showToast('Error al guardar la regla', 'error');
        }
    });

    updateRulesList();
}

function updateRulesList() {
    const list = document.getElementById('rules-list');
    if(!list) return;

    list.innerHTML = '';
    if(builderRules.length === 0) {
        list.innerHTML = '<li class="rule-item" style="color:var(--md-sys-color-on-surface-variant);">No hay reglas creadas aún.</li>';
        return;
    }
    builderRules.forEach((rule, idx) => {
        list.innerHTML += `
        <li class="rule-item">
            <div class="rule-info">
                <span class="rule-field">${rule.field}</span>
                <span class="rule-regex" title="Regex">/ ${rule.regex} /</span>
                <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; cursor:pointer; margin-left:8px;" title="Usar como identificador">
                    <input type="checkbox" style="position:static; opacity:1; pointer-events:auto; width:16px; height:16px;" onchange="toggleRuleIdentifier(${idx}, this.checked)" ${rule.isIdentifier ? 'checked' : ''}> Id.
                </label>
                ${rule.isExchangeRate ? '<span class="material-symbols-rounded" style="font-size: 16px; color: var(--md-sys-color-primary); margin-left:8px;" title="Tipo de Cambio Banguat">currency_exchange</span>' : ''}
            </div>
            <div style="font-size: 0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rule.sample}">
                Muestra: ${rule.sample}
            </div>
            <button class="btn-icon danger" onclick="removeRuleFromBuilder(${idx})">
                <span class="material-symbols-rounded">delete</span>
            </button>
        </li>`;
    });
}

window.removeRuleFromBuilder = (idx) => {
    builderRules.splice(idx, 1);
    updateRulesList();
};

window.toggleRuleIdentifier = (idx, checked) => {
    builderRules[idx].isIdentifier = checked;
};

function initReglasView() {
    const grid = document.getElementById('providers-grid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    if (allProviders.length === 0) {
        grid.innerHTML = '<p style="color:var(--md-sys-color-on-surface-variant);">No hay reglas registradas. Crea una en la sección "Crear Reglas".</p>';
        return;
    }

    allProviders.forEach(p => {
        let rulesList = p.rules.map(r => `
            <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:0.85rem;">
                <div>
                    <strong>${r.field}</strong>
                    ${r.isIdentifier ? '<span class="material-symbols-rounded" style="font-size: 14px; color: var(--md-sys-color-primary); vertical-align: middle; margin-left:4px;" title="Identificador">key</span>' : ''}
                    ${r.isExchangeRate ? '<span class="material-symbols-rounded" style="font-size: 14px; color: var(--md-sys-color-primary); vertical-align: middle; margin-left:4px;" title="Tipo de Cambio Banguat">currency_exchange</span>' : ''}
                </div>
                <code style="background:rgba(0,0,0,0.05); padding:2px 4px; border-radius:2px;">${r.regex}</code>
            </div>
        `).join('');

        grid.innerHTML += `
        <div class="provider-card">
            <div class="provider-header">
                <div>
                    <div class="provider-name">${p.name}</div>
                    <div class="provider-rules-count">
                        <span class="material-symbols-rounded" style="font-size:16px;">rule</span>
                        ${p.rules.length} Reglas configuradas
                    </div>
                </div>
                <div class="provider-actions">
                    <button class="btn-icon" onclick="editProvider('${p.id}')"><span class="material-symbols-rounded">edit</span></button>
                    <button class="btn-icon danger" onclick="deleteProvider('${p.id}')"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
            <div class="provider-rules" style="max-height: 150px; overflow-y: auto;">
                ${rulesList}
            </div>
        </div>`;
    });
}

// CRUD Operations
let pendingDeleteId = null;

window.deleteProvider = (id) => {
    pendingDeleteId = id;
    const modal = document.getElementById('confirm-delete-modal');
    if (modal) modal.classList.add('active');
};

window.closeConfirmModal = () => {
    const modal = document.getElementById('confirm-delete-modal');
    if (modal) modal.classList.remove('active');
    pendingDeleteId = null;
};

window.executeDelete = async () => {
    if(!pendingDeleteId) return;
    const id = pendingDeleteId;
    window.closeConfirmModal();
    
    try {
        const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showToast('Regla eliminada', 'success');
            await loadProviders();
            if(document.getElementById('providers-grid')) {
                initReglasView();
            }
        } else {
            throw new Error();
        }
    } catch(err) {
        showToast('Error al eliminar', 'error');
    }
};

let currentEditingId = null;

window.editProvider = (id) => {
    const provider = allProviders.find(p => p.id === id);
    if(!provider) return;
    
    currentEditingId = id;
    document.getElementById('edit-provider-name').value = provider.name;
    
    const container = document.getElementById('edit-rules-container');
    container.innerHTML = '';
    
    provider.rules.forEach(rule => {
        window.addRuleToEditForm(rule.field, rule.regex, rule.isIdentifier, rule.isExchangeRate);
    });
    
    document.getElementById('edit-provider-modal').classList.add('active');
};

window.closeModal = () => {
    document.getElementById('edit-provider-modal').classList.remove('active');
};

window.addRuleToEditForm = (field = '', regex = '', isIdentifier = false, isExchangeRate = false) => {
    const container = document.getElementById('edit-rules-container');
    const div = document.createElement('div');
    div.className = 'edit-rule-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
        <input type="text" class="text-field edit-rule-field" value="${field}" placeholder="Campo (ej. Total)" style="flex: 1;">
        <input type="text" class="text-field edit-rule-regex" value="${regex.replace(/"/g, '&quot;')}" placeholder="Expresión Regular" style="flex: 2;">
        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; cursor:pointer;" title="Usar como identificador">
            <input type="checkbox" class="edit-rule-is-identifier" style="position:static; opacity:1; pointer-events:auto; width:16px; height:16px;" ${isIdentifier ? 'checked' : ''}> Id.
        </label>
        <label style="display:flex; align-items:center; gap:4px; font-size:0.8rem; cursor:pointer;" title="Validar contra Tipo de Cambio Banguat">
            <input type="checkbox" class="edit-rule-is-exchange" style="position:static; opacity:1; pointer-events:auto; width:16px; height:16px;" ${isExchangeRate ? 'checked' : ''}> Banguat
        </label>
        <button class="btn-icon danger" onclick="this.parentElement.remove()">
            <span class="material-symbols-rounded">close</span>
        </button>
    `;
    container.appendChild(div);
};

window.addEmptyRuleToEdit = () => {
    window.addRuleToEditForm();
};

window.saveEditedProvider = async () => {
    const name = document.getElementById('edit-provider-name').value;
    const rules = [];
    
    document.querySelectorAll('.edit-rule-row').forEach(row => {
        const field = row.querySelector('.edit-rule-field').value;
        const regex = row.querySelector('.edit-rule-regex').value;
        const isIdentifier = row.querySelector('.edit-rule-is-identifier').checked;
        const isExchangeRate = row.querySelector('.edit-rule-is-exchange').checked;
        if(field && regex) {
            rules.push({ field, regex, isIdentifier, isExchangeRate });
        }
    });
    
    if(!name || rules.length === 0) {
        showToast('El nombre y al menos una regla son obligatorios', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/providers/${currentEditingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rules })
        });
        
        if(res.ok) {
            showToast('Regla actualizada correctamente', 'success');
            closeModal();
            await loadProviders();
            if(document.getElementById('providers-grid')) {
                initReglasView();
            }
        } else {
            throw new Error();
        }
    } catch (err) {
        showToast('Error al actualizar la regla', 'error');
    }
};

// Toast Utility
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if(type === 'success') icon = 'check_circle';
    if(type === 'error') icon = 'error';

    toast.innerHTML = `
        <span class="material-symbols-rounded">${icon}</span>
        <span style="font-family: var(--font-body); font-weight: 500;">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// MASIVA VIEW LOGIC
let massFiles = [];

function initMasivaView() {
    const dropzone = document.getElementById('mass-dropzone');
    const fileInput = document.getElementById('mass-file');
    const startBtn = document.getElementById('mass-start-btn');
    
    if(!dropzone || !fileInput) return;

    massFiles = [];
    renderMassFiles();

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleMassFiles(e.dataTransfer.files);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleMassFiles(fileInput.files);
        }
    });

    startBtn.addEventListener('click', startMassValidation);
}

async function handleMassFiles(files) {
    const newFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (newFiles.length === 0) {
        showToast('Solo se admiten archivos PDF', 'error');
        return;
    }

    document.getElementById('mass-filename').textContent = `${newFiles.length} archivo(s) añadido(s)`;
    document.getElementById('mass-file-list-container').style.display = 'block';

    for (let i = 0; i < newFiles.length; i++) {
        const fileObj = {
            id: Date.now() + i,
            file: newFiles[i],
            providerId: null,
            status: 'identificando', // identificando, pendiente, validando, exito, error
            resultData: null
        };
        massFiles.push(fileObj);
        renderMassFiles();
        
        // Asignación automática
        autoAssignProvider(fileObj);
    }
}

async function autoAssignProvider(fileObj) {
    try {
        const formData = new FormData();
        formData.append('invoice', fileObj.file);

        const res = await fetch('/api/identify-provider', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (data.providerId) {
            fileObj.providerId = data.providerId;
            fileObj.status = 'pendiente';
        } else {
            fileObj.status = 'pendiente'; // No se pudo identificar, requiere manual
        }
    } catch (err) {
        console.error('Error identificando', err);
        fileObj.status = 'pendiente';
    }
    renderMassFiles();
}

function renderMassFiles() {
    const tbody = document.getElementById('mass-files-tbody');
    const countEl = document.getElementById('mass-file-count');
    const startBtn = document.getElementById('mass-start-btn');
    
    if (!tbody) return;
    
    countEl.textContent = massFiles.length;
    tbody.innerHTML = '';
    
    let allAssignedAndReady = true;

    massFiles.forEach(f => {
        let statusHtml = '';
        if (f.status === 'identificando') {
            statusHtml = '<div class="d-flex align-center gap-2"><div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Identificando...</div>';
            allAssignedAndReady = false;
        } else if (f.status === 'pendiente') {
            statusHtml = '<span style="color: var(--md-sys-color-on-surface-variant);">Pendiente</span>';
            if (!f.providerId) allAssignedAndReady = false;
        } else if (f.status === 'validando') {
            statusHtml = '<div class="d-flex align-center gap-2"><div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Validando...</div>';
            allAssignedAndReady = false;
        } else if (f.status === 'exito') {
            statusHtml = '<span style="color: var(--md-sys-color-success); display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">check_circle</span> Éxito</span>';
        } else if (f.status === 'error') {
            statusHtml = '<span style="color: var(--md-sys-color-error); display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">error</span> Error</span>';
        }

        let options = '<option value="">Seleccionar Regla</option>';
        allProviders.forEach(p => {
            options += `<option value="${p.id}" ${p.id === f.providerId ? 'selected' : ''}>${p.name}</option>`;
        });

        const disableSelect = (f.status === 'validando' || f.status === 'exito' || f.status === 'error') ? 'disabled' : '';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        tr.innerHTML = `
            <td style="padding: 12px;">${f.file.name}</td>
            <td style="padding: 12px;">
                <select class="select-field browser-default" style="padding: 4px 8px; font-size: 0.85rem;" onchange="updateMassFileProvider(${f.id}, this.value)" ${disableSelect}>
                    ${options}
                </select>
            </td>
            <td style="padding: 12px; font-size: 0.85rem;">${statusHtml}</td>
            <td style="padding: 12px;">
                <button class="btn-icon danger" onclick="removeMassFile(${f.id})" ${disableSelect} title="Eliminar">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (massFiles.length === 0) {
        document.getElementById('mass-file-list-container').style.display = 'none';
        allAssignedAndReady = false;
    }

    startBtn.disabled = !allAssignedAndReady;
}

window.updateMassFileProvider = (id, providerId) => {
    const file = massFiles.find(f => f.id === id);
    if (file) {
        file.providerId = providerId;
        renderMassFiles();
    }
};

window.removeMassFile = (id) => {
    massFiles = massFiles.filter(f => f.id !== id);
    renderMassFiles();
};

async function startMassValidation() {
    const startBtn = document.getElementById('mass-start-btn');
    startBtn.disabled = true;
    
    document.getElementById('mass-results-container').style.display = 'block';
    const accordion = document.getElementById('mass-results-accordion');
    accordion.innerHTML = ''; // Clear previous

    for (const f of massFiles) {
        f.status = 'validando';
        renderMassFiles();
        
        try {
            const formData = new FormData();
            formData.append('invoice', f.file);
            formData.append('providerId', f.providerId);

            const res = await fetch('/api/validate-strict', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Error desconocido');

            f.resultData = data;
            f.status = data.success ? 'exito' : 'error';
        } catch (err) {
            f.status = 'error';
            f.resultData = { success: false, error: err.message };
        }
        
        renderMassFiles();
        appendMassResult(f);
    }
    
    startBtn.disabled = false;
    showToast('Validación masiva completada', 'success');
}

function appendMassResult(f) {
    const accordion = document.getElementById('mass-results-accordion');
    const data = f.resultData;
    const provider = allProviders.find(p => p.id === f.providerId);
    
    const div = document.createElement('div');
    div.className = 'surface-card';
    div.style.marginBottom = '0';
    div.style.padding = '0';
    div.style.overflow = 'hidden';
    
    const header = document.createElement('div');
    header.style.padding = '16px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    header.style.background = f.status === 'exito' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)';
    
    const icon = f.status === 'exito' ? 'check_circle' : 'error';
    const color = f.status === 'exito' ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)';
    
    header.innerHTML = `
        <div class="d-flex align-center gap-2">
            <span class="material-symbols-rounded" style="color: ${color};">${icon}</span>
            <span style="font-weight: 500;">${f.file.name}</span>
            <span style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant); margin-left: 8px;">Regla: ${provider ? provider.name : 'Desconocida'}</span>
        </div>
        <span class="material-symbols-rounded expand-icon" style="transition: transform 0.2s;">expand_more</span>
    `;
    
    const content = document.createElement('div');
    content.style.padding = '16px';
    content.style.borderTop = '1px solid rgba(0,0,0,0.05)';
    content.style.display = 'none'; // Hidden by default
    
    // Build content using the same logic as strict validation
    let resultBoxClass = f.status === 'exito' ? 'success' : 'error';
    let html = `<div class="result-box ${resultBoxClass}" style="display:block; margin:0;">`;
    
    if (data.success) {
        html += `
            <div class="d-flex align-center gap-2 mb-4" style="margin-bottom: 16px;">
                <h3 style="margin:0;">¡Validación Exitosa!</h3>
            </div>
            <p style="margin-bottom: 12px; font-size: 0.9rem;">Todos los campos coinciden perfectamente.</p>
        `;
        for (const [key, value] of Object.entries(data.extractedData || {})) {
            html += `
            <div class="validation-item match">
                <div class="validation-field-name">
                    <span class="material-symbols-rounded" style="color: var(--md-sys-color-success); font-size: 20px;">check</span>
                    ${key}
                </div>
                <div class="validation-value-row">
                    <span class="validation-label">Extraído</span>
                    <span class="value-text text-success">${value}</span>
                </div>
            </div>`;
        }
    } else {
        html += `
            <div class="d-flex align-center gap-2 mb-4" style="margin-bottom: 16px;">
                <h3 style="margin:0;">Alerta de Validación</h3>
            </div>
            <p style="margin-bottom: 12px; font-size: 0.9rem;">${data.error}</p>
        `;
        
        if (data.missingDetails && data.missingDetails.length > 0) {
            data.missingDetails.forEach(detail => {
                html += `
                <div class="validation-item mismatch">
                    <div class="validation-field-name">
                        <span class="material-symbols-rounded" style="color: var(--md-sys-color-error); font-size: 20px;">close</span>
                        ${detail.field}
                    </div>
                    <div class="validation-value-row">
                        <span class="validation-label">Esperaba</span>
                        <span class="value-text text-success">${detail.expected}</span>
                    </div>
                    <div class="validation-value-row">
                        <span class="validation-label" style="color:var(--md-sys-color-error);">No Encontrado</span>
                        <span class="value-text text-error">Revisar documento</span>
                    </div>
                </div>`;
            });
        }

        if (data.extractedData && Object.keys(data.extractedData).length > 0) {
            html += `<h4 style="margin-top: 24px; margin-bottom: 12px;">Campos correctos:</h4>`;
            for (const [key, value] of Object.entries(data.extractedData)) {
                html += `
                <div class="validation-item match" style="opacity: 0.8;">
                    <div class="validation-field-name">
                        <span class="material-symbols-rounded" style="color: var(--md-sys-color-success); font-size: 20px;">check</span>
                        ${key}
                    </div>
                    <div class="validation-value-row">
                        <span class="validation-label">Extraído</span>
                        <span class="value-text">${value}</span>
                    </div>
                </div>`;
            }
        }
    }
    
    html += `</div>`;
    content.innerHTML = html;
    
    header.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        header.querySelector('.expand-icon').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
    
    div.appendChild(header);
    div.appendChild(content);
    accordion.appendChild(div);
}

// Banguat Info Modal Logic
window.openBanguatModal = async () => {
    const modal = document.getElementById('banguat-info-modal');
    if (modal) modal.classList.add('active');
    
    try {
        const res = await fetch('/api/exchange-rate');
        const data = await res.json();
        document.getElementById('banguat-rate-display').textContent = 'Q ' + (data.rate || '0.00');
        document.getElementById('banguat-date-display').textContent = 'Fecha de referencia: ' + (data.date || 'Desconocida');
    } catch (err) {
        document.getElementById('banguat-rate-display').textContent = 'Error';
        document.getElementById('banguat-date-display').textContent = 'No se pudo obtener el tipo de cambio';
    }
};

window.closeBanguatModal = () => {
    const modal = document.getElementById('banguat-info-modal');
    if (modal) modal.classList.remove('active');
};

window.refreshBanguatRate = async () => {
    document.getElementById('banguat-rate-display').textContent = '...';
    document.getElementById('banguat-date-display').textContent = 'Consultando Banguat...';
    
    try {
        const res = await fetch('/api/exchange-rate/refresh', { method: 'POST' });
        const data = await res.json();
        document.getElementById('banguat-rate-display').textContent = 'Q ' + (data.rate || '0.00');
        document.getElementById('banguat-date-display').textContent = 'Fecha de referencia: ' + (data.date || 'Desconocida');
        showToast('Tipo de cambio actualizado exitosamente', 'success');
    } catch (err) {
        document.getElementById('banguat-rate-display').textContent = 'Error';
        document.getElementById('banguat-date-display').textContent = 'No se pudo refrescar el tipo de cambio';
        showToast('Error al conectar con Banguat', 'error');
    }
};
