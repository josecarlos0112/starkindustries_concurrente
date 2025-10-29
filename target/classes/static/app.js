// javascript
// Estado
let stomp = null;
let paused = false;
let alerts = [];
const counters = { total:0, MOTION:0, ACCESS:0, TEMPERATURE:0 };

// Utilidades
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmtTime = ts => new Date(ts || Date.now()).toLocaleTimeString();

function isAuthenticated(){ return !!sessionStorage.getItem('auth'); }
function getAuth(){ return sessionStorage.getItem('auth'); }
function setAuth(base64){ sessionStorage.setItem('auth', base64); }
function clearAuth(){ sessionStorage.removeItem('auth'); sessionStorage.removeItem('user'); }

// Elementos DOM - Almacenar en variables para reutilizar
const domElements = {
    wsDot: $('#wsDot'),
    wsText: $('#wsText'),
    btnLogout: $('#btnLogout'),
    countTotal: $('#countTotal'),
    countMotion: $('#countMotion'),
    countAccess: $('#countAccess'),
    countTemp: $('#countTemp'),
    btnPause: $('#btnPause'),
    btnResume: $('#btnResume'),
    btnClear: $('#btnClear'),
    alerts: $('#alerts'),
    searchBox: $('#searchBox'),
    loginOverlay: $('#loginOverlay'),
    loginError: $('#loginError'),
    loginPreset: $('#loginPreset'),
    loginUser: $('#loginUser'),
    loginPass: $('#loginPass'),
    loginForm: $('#loginForm'),
    chartCtx: $('#rateChart')
};

// WebSocket / STOMP
function connectWS(headers = {}, onSuccess, onError){
    if (stomp && stomp.connected){
        try{ stomp.disconnect(); }catch(e){}
        stomp = null;
    }
    const sock = new SockJS('/ws');
    stomp = Stomp.over(sock);
    stomp.debug = null;

    stomp.connect(headers, () => {
        setConnected(true);
        stomp.subscribe('/topic/alerts', m => {
            const alert = JSON.parse(m.body);
            onAlert(alert);
        });
        if (typeof onSuccess === 'function') onSuccess();
    }, () => {
        setConnected(false);
        if (typeof onError === 'function') onError();
    });
}

function setConnected(on){
    if (domElements.wsDot) domElements.wsDot.className = 'dot ' + (on ? 'dot--connected' : 'dot--disconnected');
    if (domElements.wsText) domElements.wsText.textContent = on ? 'Conectado' : 'Desconectado';
    // Siempre mostrar el botón de cerrar sesión
    if (domElements.btnLogout) domElements.btnLogout.style.display = 'inline-block';
}

// Manejo de alertas entrantes (única definición)
function onAlert(alert){
    counters.total++;
    counters[alert.type] = (counters[alert.type]||0) + 1;
    updateCounters();

    alerts.unshift(alert);
    if (alerts.length > 500) alerts.pop();

    if (!paused) renderList();

    pushChartPoint();
}

// Render
function updateCounters(){
    if (domElements.countTotal) domElements.countTotal.textContent = counters.total;
    if (domElements.countMotion) domElements.countMotion.textContent = counters.MOTION || 0;
    if (domElements.countAccess) domElements.countAccess.textContent = counters.ACCESS || 0;
    if (domElements.countTemp) domElements.countTemp.textContent = counters.TEMPERATURE || 0;
}

function renderList(){
    const types = $$('.flt-type').filter(c => c.checked).map(c => c.value);
    const q = domElements.searchBox ? domElements.searchBox.value.trim().toLowerCase() : '';

    if (!domElements.alerts) return;
    domElements.alerts.innerHTML = '';

    alerts
        .filter(a => types.includes(a.type))
        .filter(a => {
            if (!q) return true;
            return (a.sensorId || '').toLowerCase().includes(q) ||
                (a.message || '').toLowerCase().includes(q);
        })
        .slice(0, 200)
        .forEach(a => {
            const li = document.createElement('li');
            li.className = `alert alert--${a.severity || 'HIGH'}`;
            li.innerHTML = `
                <span class="badge badge--type">${a.type}</span>
                <span><strong>${a.severity || ''}</strong> • ${a.sensorId || ''} — ${a.message || ''}</span>
                <span class="meta">${fmtTime(a.timestamp)}</span>
            `;
            domElements.alerts.appendChild(li);
        });
}

// Controles
if (domElements.btnPause) domElements.btnPause.addEventListener('click', () => {
    paused = true;
    domElements.btnPause.disabled = true;
    domElements.btnResume.disabled = false;
});

if (domElements.btnResume) domElements.btnResume.addEventListener('click', () => {
    paused = false;
    domElements.btnPause.disabled = false;
    domElements.btnResume.disabled = true;
    renderList();
});

if (domElements.btnClear) domElements.btnClear.addEventListener('click', () => {
    alerts = [];
    counters.total = counters.MOTION = counters.ACCESS = counters.TEMPERATURE = 0;
    updateCounters();
    renderList();
});

// Chart (eventos/minuto)
const chartData = { labels: [], datasets: [{ label: 'Eventos/min', data: [] }] };
const rateChart = domElements.chartCtx ? new Chart(domElements.chartCtx, {
    type: 'line',
    data: chartData,
    options: {
        responsive: true,
        animation: false,
        scales: {
            x: { ticks: { maxTicksLimit: 10 } },
            y: { beginAtZero: true, suggestedMax: 10 }
        },
        plugins: { legend: { display: false } }
    }
}) : null;

let currentMinute = minuteKey(Date.now());
let countThisMinute = 0;
function minuteKey(ts){ const d=new Date(ts); d.setSeconds(0,0); return d.toISOString(); }

function pushChartPoint(){
    const nowKey = minuteKey(Date.now());
    if (nowKey !== currentMinute){
        appendPoint(currentMinute, countThisMinute);
        currentMinute = nowKey;
        countThisMinute = 0;
    }
    countThisMinute++;
}

function appendPoint(label, value){
    if (!rateChart) return;
    chartData.labels.push(label.substring(11,16));
    chartData.datasets[0].data.push(value);
    const MAX = 10;
    if (chartData.labels.length > MAX){
        chartData.labels.shift();
        chartData.datasets[0].data.shift();
    }
    rateChart.update();
}

setInterval(() => pushChartPoint(), 5000);

// Función mejorada para enviar lecturas
async function sendReading(payload, user, pass) {
    let authHeader = '';

    // Intentar obtener credenciales de diferentes fuentes
    if (user && pass) {
        authHeader = 'Basic ' + btoa(`${user}:${pass}`);
    } else {
        const sessionAuth = getAuth();
        if (sessionAuth) {
            authHeader = 'Basic ' + sessionAuth;
        }
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (authHeader) {
        headers['Authorization'] = authHeader;
    }

    try {
        const res = await fetch('/api/sensors/reading', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error(`Error ${res.status}: ${res.statusText}`);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error enviando lectura:', error);
        return false;
    }
}

// Función mejorada para el simulador
$$('[data-sim]').forEach(btn => {
    btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-sim');

        const user = 'op';
        const pass = 'op123';

        // Crear payload específico para cada tipo
        let payload;
        switch(type) {
            case 'TEMPERATURE':
                payload = {
                    type: type,
                    sensorId: 'temp-sim-' + Date.now(),
                    timestamp: Date.now(),
                    value: 65.0, // Valor que definitivamente debe activar la alerta
                    metadata: 'temperature_sensor'
                };
                break;
            case 'ACCESS':
                payload = {
                    type: type,
                    sensorId: 'access-sim-' + Date.now(),
                    timestamp: Date.now(),
                    value: 1,
                    metadata: 'BADGE-999' // Badge no autorizado
                };
                break;
            case 'MOTION':
                payload = {
                    type: type,
                    sensorId: 'motion-sim-' + Date.now(),
                    timestamp: Date.now(),
                    value: 1, // Valor > 0.5 para activar alerta
                    metadata: 'motion_sensor'
                };
                break;
        }

        try {
            const ok = await sendReading(payload, user, pass);
            if (!ok) {
                alert('Error enviando lectura. Verifica credenciales.');
            } else {
                console.log('Simulación enviada:', payload);
            }
        } catch (e) {
            console.error(e);
            alert('Fallo al enviar la lectura: ' + e.message);
        }
    });
});

// Función mejorada para initAuthConnect
(async function initAuthConnect() {
    try {
        const res = await fetch('/api/auth/validate', {
            credentials: 'same-origin'
        });

        if (res.ok) {
            // Autenticado - conectar WebSocket
            connectWS({}, () => {
                updateCounters();
                renderList();
                initFilters();
            }, (error) => {
                console.error('WebSocket connection failed:', error);
                updateCounters();
                renderList();
                initFilters();
            });
        } else {
            // No autenticado - mostrar login
            showLogin();
            updateCounters();
            renderList();
            initFilters();
        }
    } catch(e) {
        console.error('Auth validation failed:', e);
        // En caso de error, permitir funcionamiento básico
        showLogin();
        updateCounters();
        renderList();
        initFilters();
    }
})();

// Guardar credenciales después del login exitoso
document.addEventListener('DOMContentLoaded', function() {
    if (domElements.loginForm) {
        domElements.loginForm.addEventListener('submit', function() {
            const user = domElements.loginUser?.value;
            const pass = domElements.loginPass?.value;
            if (user && pass) {
                // Guardar en sessionStorage para usar en simulaciones
                setAuth(btoa(`${user}:${pass}`));
                sessionStorage.setItem('user', user);
            }
        });
    }
});

// Login / Logout UI
if (domElements.btnLogout) domElements.btnLogout.addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
    // limpiar credenciales cliente y recargar
    sessionStorage.removeItem('serverAuth');
    clearAuth();
    location.reload();
});

if (domElements.loginPreset) domElements.loginPreset.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val && domElements.loginUser) domElements.loginUser.value = val;
});

// showLogin / hideLogin completas y seguras
function showLogin() {
    if (!domElements.loginOverlay) return;

    // Mostrar mensaje de error si la URL contiene ?loginError
    const params = new URLSearchParams(window.location.search);
    const loginError = params.get('loginError');
    if (domElements.loginError) {
        if (loginError) {
            domElements.loginError.style.display = 'block';
            domElements.loginError.textContent = 'Credenciales inválidas.';
            // quitar el parámetro de la URL sin recargar
            params.delete('loginError');
            const newUrl = window.location.pathname + (params.toString() ? ('?' + params.toString()) : '');
            history.replaceState(null, '', newUrl);
        } else {
            domElements.loginError.style.display = 'none';
            domElements.loginError.textContent = '';
        }
    }

    domElements.loginOverlay.style.display = 'flex';

    const auth = getAuth();
    if (auth) {
        const savedUser = sessionStorage.getItem('user') || '';
        if (domElements.loginUser) domElements.loginUser.value = savedUser;
        if (domElements.loginPass) domElements.loginPass.value = '';
    } else {
        if (domElements.loginUser) domElements.loginUser.value = '';
        if (domElements.loginPass) domElements.loginPass.value = '';
        if (domElements.loginPreset) domElements.loginPreset.value = '';
    }

    if (domElements.loginUser) domElements.loginUser.focus();
}

function initFilters() {
    console.log('Inicializando filtros...'); // Debug

    // Event listeners para checkboxes de tipo
    const typeCheckboxes = $$('.flt-type');
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log('Checkbox cambiado:', this.value, this.checked); // Debug
            renderList();
        });
    });

    // Event listener para la barra de búsqueda
    if (domElements.searchBox) {
        let searchTimeout;
        domElements.searchBox.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Búsqueda cambiada:', this.value); // Debug
                renderList();
            }, 300);
        });

        // También permitir Enter para búsqueda inmediata
        domElements.searchBox.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('Enter presionado en búsqueda'); // Debug
                renderList();
            }
        });
    }

    console.log('Filtros inicializados'); // Debug
}

// Inicializar filtros cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initFilters();
});