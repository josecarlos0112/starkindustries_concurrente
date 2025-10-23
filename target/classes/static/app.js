// ---- Estado
let stomp = null;
let paused = false;
let alerts = [];
const counters = { total:0, MOTION:0, ACCESS:0, TEMPERATURE:0 };

// ---- Utilidades
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmtTime = ts => new Date(ts || Date.now()).toLocaleTimeString();

// ---- WebSocket / STOMP
function connectWS(){
    const sock = new SockJS('/ws');
    stomp = Stomp.over(sock);
    stomp.debug = null; // silenciar logs
    stomp.connect({}, () => {
        setConnected(true);
        stomp.subscribe('/topic/alerts', m => {
            const alert = JSON.parse(m.body);
            onAlert(alert);
        });
    }, () => setConnected(false));
}

function setConnected(on){
    $('#wsDot').className = 'dot ' + (on ? 'dot--connected' : 'dot--disconnected');
    $('#wsText').textContent = on ? 'Conectado' : 'Desconectado';
}

// ---- Manejo de alertas entrantes
function onAlert(alert){
    // estructura esperada: {id, type, sensorId, severity, message, timestamp}
    counters.total++;
    counters[alert.type] = (counters[alert.type]||0) + 1;
    updateCounters();

    // Agrega al buffer
    alerts.unshift(alert);
    if (alerts.length > 500) alerts.pop();

    if (!paused) renderList();

    // Actualiza la serie del gráfico
    pushChartPoint();
}

// ---- Render
function updateCounters(){
    $('#countTotal').textContent = counters.total;
    $('#countMotion').textContent = counters.MOTION || 0;
    $('#countAccess').textContent = counters.ACCESS || 0;
    $('#countTemp').textContent = counters.TEMPERATURE || 0;
}

function renderList(){
    const types = $$('.flt-type').filter(c => c.checked).map(c => c.value);
    const q = $('#searchBox').value.trim().toLowerCase();

    const list = $('#alerts');
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

// ---- Controles
$('#btnPause').addEventListener('click', () => {
    paused = true;
    $('#btnPause').disabled = true;
    $('#btnResume').disabled = false;
});
$('#btnResume').addEventListener('click', () => {
    paused = false;
    $('#btnPause').disabled = false;
    $('#btnResume').disabled = true;
    renderList();
});
$('#btnClear').addEventListener('click', () => {
    alerts = [];
    counters.total = counters.MOTION = counters.ACCESS = counters.TEMPERATURE = 0;
    updateCounters();
    renderList();
});

$$('.flt-type').forEach(cb => cb.addEventListener('change', renderList));
$('#searchBox').addEventListener('input', () => {
    // debounce simple
    clearTimeout(window.__t);
    window.__t = setTimeout(renderList, 120);
});

// ---- Chart (eventos/minuto, ventana móvil 10 min)
const chartCtx = $('#rateChart');
const chartData = {
    labels: [],
    datasets: [{ label: 'Eventos/min', data: [] }]
};
const rateChart = new Chart(chartCtx, {
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
});

// contador por minuto
let currentMinute = minuteKey(Date.now());
let countThisMinute = 0;
function minuteKey(ts){ const d=new Date(ts); d.setSeconds(0,0); return d.toISOString(); }

function pushChartPoint(){
    const nowKey = minuteKey(Date.now());
    if (nowKey !== currentMinute){
        // cerrar minuto anterior
        appendPoint(currentMinute, countThisMinute);
        currentMinute = nowKey;
        countThisMinute = 0;
    }
    countThisMinute++;
    // actualización suave del punto actual (opcional)
}

function appendPoint(label, value){
    chartData.labels.push(label.substring(11,16)); // hh:mm
    chartData.datasets[0].data.push(value);
    const MAX = 10; // 10 minutos
    if (chartData.labels.length > MAX){
        chartData.labels.shift();
        chartData.datasets[0].data.shift();
    }
    rateChart.update();
}

// Rollover cada minuto aunque no haya eventos
setInterval(() => pushChartPoint(), 5000);

// ---- Simulador (opcional)
$$('[data-sim]').forEach(btn => {
    btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-sim');
        const user = $('#simUser').value || 'op';
        const pass = $('#simPass').value || 'op123';
        const payload = buildSample(type);
        try{
            const ok = await sendReading(payload, user, pass);
            if(!ok) alert('Error enviando la lectura (401/403/otra). Revisa credenciales.');
        }catch(e){
            console.error(e);
            alert('Fallo al enviar la lectura.');
        }
    });
});

function buildSample(type){
    const ts = Date.now();
    if (type === 'MOTION') {
        return { type, sensorId: 'M-UI', timestamp: ts, value: 0.9 };
    }
    if (type === 'TEMPERATURE') {
        return { type, sensorId: 'T-UI', timestamp: ts, value: 75.0 };
    }
    // ACCESS
    return { type: 'ACCESS', sensorId: 'D-UI', timestamp: ts, value: 1, metadata: 'BADGE-XYZ' };
}

async function sendReading(payload, user, pass){
    const res = await fetch('/api/sensors/reading', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(`${user}:${pass}`)
        },
        body: JSON.stringify(payload)
    });
    return res.ok || res.status === 202;
}

// ---- Init
connectWS();
updateCounters();
renderList();
