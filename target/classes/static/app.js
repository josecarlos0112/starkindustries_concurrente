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
    const dot = $('#wsDot');
    const txt = $('#wsText');
    if (dot) dot.className = 'dot ' + (on ? 'dot--connected' : 'dot--disconnected');
    if (txt) txt.textContent = on ? 'Conectado' : 'Desconectado';
    const logoutBtn = $('#btnLogout');
    // Siempre mostrar el botón de cerrar sesión
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
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
    if ($('#countTotal')) $('#countTotal').textContent = counters.total;
    if ($('#countMotion')) $('#countMotion').textContent = counters.MOTION || 0;
    if ($('#countAccess')) $('#countAccess').textContent = counters.ACCESS || 0;
    if ($('#countTemp')) $('#countTemp').textContent = counters.TEMPERATURE || 0;
}

function renderList(){
    const types = $$('.flt-type').filter(c => c.checked).map(c => c.value);
    const qElem = $('#searchBox');
    const q = qElem ? qElem.value.trim().toLowerCase() : '';

    const list = $('#alerts');
    if (!list) return;
    list.innerHTML = '';

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
            list.appendChild(li);
        });
}

// Controles
if ($('#btnPause')) $('#btnPause').addEventListener('click', () => {
    paused = true;
    $('#btnPause').disabled = true;
    $('#btnResume').disabled = false;
});
if ($('#btnResume')) $('#btnResume').addEventListener('click', () => {
    paused = false;
    $('#btnPause').disabled = false;
    $('#btnResume').disabled = true;
    renderList();
});
if ($('#btnClear')) $('#btnClear').addEventListener('click', () => {
    alerts = [];
    counters.total = counters.MOTION = counters.ACCESS = counters.TEMPERATURE = 0;
    updateCounters();
    renderList();
});

// Chart (eventos/minuto)
const chartCtx = $('#rateChart');
const chartData = { labels: [], datasets: [{ label: 'Eventos/min', data: [] }] };
const rateChart = chartCtx ? new Chart(chartCtx, {
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

// javascript
// ... código existente ...

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
            }, (error) => {
                console.error('WebSocket connection failed:', error);
                updateCounters();
                renderList();
            });
        } else {
            // No autenticado - mostrar login
            showLogin();
            updateCounters();
            renderList();
        }
    } catch(e) {
        console.error('Auth validation failed:', e);
        // En caso de error, permitir funcionamiento básico
        showLogin();
        updateCounters();
        renderList();
    }
})();

// Guardar credenciales después del login exitoso
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = $('#loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function() {
            const user = $('#loginUser')?.value;
            const pass = $('#loginPass')?.value;
            if (user && pass) {
                // Guardar en sessionStorage para usar en simulaciones
                setAuth(btoa(`${user}:${pass}`));
                sessionStorage.setItem('user', user);
            }
        });
    }
});

// ... resto del código existente ...

// Login / Logout UI
if ($('#btnLogout')) $('#btnLogout').addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
    // limpiar credenciales cliente y recargar
    sessionStorage.removeItem('serverAuth');
    clearAuth();
    location.reload();
});

if ($('#loginPreset')) $('#loginPreset').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val && $('#loginUser')) $('#loginUser').value = val;
});

// showLogin / hideLogin completas y seguras
function showLogin() {
    const overlay = $('#loginOverlay');
    const err = $('#loginError');
    const preset = $('#loginPreset');
    const userInput = $('#loginUser');
    const passInput = $('#loginPass');

    if (!overlay) return;

    // Mostrar mensaje de error si la URL contiene ?loginError
    const params = new URLSearchParams(window.location.search);
    const loginError = params.get('loginError');
    if (err) {
        if (loginError) {
            err.style.display = 'block';
            err.textContent = 'Credenciales inválidas.';
            // quitar el parámetro de la URL sin recargar
            params.delete('loginError');
            const newUrl = window.location.pathname + (params.toString() ? ('?' + params.toString()) : '');
            history.replaceState(null, '', newUrl);
        } else {
            err.style.display = 'none';
            err.textContent = '';
        }
    }

    overlay.style.display = 'flex';

    const auth = getAuth();
    if (auth) {
        const savedUser = sessionStorage.getItem('user') || '';
        if (userInput) userInput.value = savedUser;
        if (passInput) passInput.value = '';
    } else {
        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
        if (preset) preset.value = '';
    }

    if (userInput) userInput.focus();
}



