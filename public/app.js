const API_BASE = '';

function getToken() {
    return localStorage.getItem('dsc_token') || '';
}

async function apiFetch(path, opts = {}) {
    const url = API_BASE + path;
    const headers = {
        'Content-Type': 'application/json',
        ...opts.headers
    };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('dsc_token');
        showLogin();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

// --- Auth UI ---
function showLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

function showApp() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    try {
        const res = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            errEl.textContent = data.error || 'Login gagal';
            return;
        }
        localStorage.setItem('dsc_token', data.token);
        showApp();
        await loadAllData();
    } catch (e) {
        errEl.textContent = 'Terjadi kesalahan. Coba lagi.';
    }
}

function doLogout() {
    localStorage.removeItem('dsc_token');
    location.reload();
}

// --- Data Globals ---
let apiBulanData = [];
let apiReinvestasi = { adit: 0, kama: 0 };

async function loadAllData() {
    try {
        const [bulanRows, reinvestRow] = await Promise.all([
            apiFetch('/api/bulan'),
            apiFetch('/api/reinvestasi')
        ]);
        apiBulanData = bulanRows || [];
        apiReinvestasi = reinvestRow || { adit: 0, kama: 0 };

        hitungModalDSC1();
        renderPengembalianGabungan();
        renderInputBulan();
        loadReinvestasi();

        const allData = getDataGabungan();
        currentBulanIndex = allData.findIndex(d => d.status === 'current');
        if (currentBulanIndex === -1) currentBulanIndex = allData.length - 1;
        renderKalenderBulanan();
        renderGrafik();
    } catch (e) {
        console.error('loadAllData error:', e);
    }
}

// --- Helpers ---
function formatRp(n) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

let modalSummary = { total: 0, lap1: 0, lap2: 0, bersih: 0 };

function hitungModalDSC1() {
    const rows = document.querySelectorAll('#tabelModalDSC1 tbody tr');
    let total = 0, totalLap1 = 0, totalLap2 = 0;
    rows.forEach(row => {
        const nominal = row.querySelector('td[data-nominal]');
        const lapangan = row.querySelector('td:last-child');
        if (nominal) {
            const val = +nominal.dataset.nominal || 0;
            total += val;
            if (lapangan) {
                const lap = lapangan.textContent.trim();
                if (lap === 'Lapangan 1') totalLap1 += val;
                else if (lap === 'Lapangan 2') totalLap2 += val;
            }
        }
    });
    modalSummary = { total, lap1: totalLap1, lap2: totalLap2, bersih: total - 432000000 };
    const totalEl = document.getElementById('totalModalDSC1');
    const bersihEl = document.getElementById('totalBersihDSC1');
    const lap1El = document.getElementById('totalLapangan1');
    const lap2El = document.getElementById('totalLapangan2');
    if (totalEl) totalEl.textContent = formatRp(total);
    if (bersihEl) bersihEl.textContent = formatRp(total - 432000000);
    if (lap1El) lap1El.textContent = formatRp(totalLap1);
    if (lap2El) lap2El.textContent = formatRp(totalLap2);
}

// --- Historical Data (read-only) ---
const dataBulanan = [
    { bulan: 'Des 2024', pemasukanLap: 45075000, pemasukanLap1: 45075000, pemasukanLap2: 0, pemasukanKan: 2500000, pengeluaranOp: 9750000, pengeluaranInv: 30000000, status: 'closed' },
    { bulan: 'Jan 2025', pemasukanLap: 451750, pemasukanLap1: 451750, pemasukanLap2: 0, pemasukanKan: 0, pengeluaranOp: 0, pengeluaranInv: 3400, status: 'closed' },
    { bulan: 'Feb 2025', pemasukanLap: 54715000, pemasukanLap1: 54715000, pemasukanLap2: 0, pemasukanKan: 5070000, pengeluaranOp: 2000000, pengeluaranInv: 34500000, status: 'closed' },
    { bulan: 'Mar 2025', pemasukanLap: 25365000, pemasukanLap1: 12682500, pemasukanLap2: 12682500, pemasukanKan: 3031000, pengeluaranOp: 13838000, pengeluaranInv: 4000000, status: 'closed' },
    { bulan: 'Apr 2025', pemasukanLap: 39090000, pemasukanLap1: 31272000, pemasukanLap2: 7818000, pemasukanKan: 35513000, pengeluaranOp: 17039500, pengeluaranInv: 37000000, status: 'closed' },
    { bulan: 'Mei 2025', pemasukanLap: 48785000, pemasukanLap1: 34149500, pemasukanLap2: 14635500, pemasukanKan: 6000000, pengeluaranOp: 16336000, pengeluaranInv: 31000000, status: 'closed' },
    { bulan: 'Jun 2025', pemasukanLap: 58985000, pemasukanLap1: 41289500, pemasukanLap2: 17695500, pemasukanKan: 10000000, pengeluaranOp: 17198500, pengeluaranInv: 40000000, status: 'closed' },
    { bulan: 'Jul 2025', pemasukanLap: 51064000, pemasukanLap1: 35744800, pemasukanLap2: 15319200, pemasukanKan: 9650000, pengeluaranOp: 16813500, pengeluaranInv: 33000000, status: 'closed' },
    { bulan: 'Agu 2025', pemasukanLap: 59320000, pemasukanLap1: 41524000, pemasukanLap2: 17796000, pemasukanKan: 10000000, pengeluaranOp: 16117000, pengeluaranInv: 34000000, status: 'closed' },
    { bulan: 'Sep 2025', pemasukanLap: 62391275, pemasukanLap1: 43673892, pemasukanLap2: 18717383, pemasukanKan: 8451000, pengeluaranOp: 15528000, pengeluaranInv: 41000000, status: 'closed' },
    { bulan: 'Okt 2025', pemasukanLap: 47930000, pemasukanLap1: 33551000, pemasukanLap2: 14379000, pemasukanKan: 8600000, pengeluaranOp: 29619000, pengeluaranInv: 16000000, status: 'closed' },
    { bulan: 'Nov 2025', pemasukanLap: 61195000, pemasukanLap1: 42836500, pemasukanLap2: 18358500, pemasukanKan: 8987000, pengeluaranOp: 28346000, pengeluaranInv: 0, status: 'closed' },
    { bulan: 'Des 2025', pemasukanLap: 48750000, pemasukanLap1: 34125000, pemasukanLap2: 14625000, pemasukanKan: 7151000, pengeluaranOp: 15550000, pengeluaranInv: 0, status: 'closed' },
    { bulan: 'Jan 2026', pemasukanLap: 55740000, pemasukanLap1: 39018000, pemasukanLap2: 16722000, pemasukanKan: 7288000, pengeluaranOp: 16302100, pengeluaranInv: 0, status: 'closed' },
    { bulan: 'Feb 2026', pemasukanLap: 33525000, pemasukanLap1: 23467500, pemasukanLap2: 10057500, pemasukanKan: 6843000, pengeluaranOp: 13362000, pengeluaranInv: 0, status: 'closed' },
    { bulan: 'Mar 2026', pemasukanLap: 26320000, pemasukanLap1: 18424000, pemasukanLap2: 7896000, pemasukanKan: 2900000, pengeluaranOp: 13936000, pengeluaranInv: 0, status: 'closed' },
    { bulan: 'Apr 2026', pemasukanLap: 50359152, pemasukanLap1: 50359152, pemasukanLap2: 0, pemasukanKan: 10000000, pengeluaranOp: 25775500, pengeluaranInv: 0, status: 'running' },
    { bulan: 'Mei 2026', pemasukanLap: 0, pemasukanLap1: 0, pemasukanLap2: 0, pemasukanKan: 0, pengeluaranOp: 0, pengeluaranInv: 0, status: 'current' },
];

let chartKeuntungan = null;
let chartPengeluaran = null;
let chartTotalKeuntungan = null;
let chartYoY = null;
let chartYoYRevenue = null;

function computeTotalPem(d) {
    const lapNew = (d.pemasukanLap1 || 0) + (d.pemasukanLap2 || 0);
    if (lapNew > 0) return lapNew + (d.pemasukanKan || 0);
    return (d.pemasukanLap || 0) + (d.pemasukanKan || 0);
}

function computeReinvestasi(d, totalPem) {
    if (d.pengeluaranInv > 0) return 0;
    const val = totalPem - d.pengeluaranOp - 12000000;
    return val > 0 ? val : 0;
}

function computeDisplaySisa(d) {
    if (d.pengeluaranInv > 0) return d.sisa;
    return 12000000;
}

const bulanOrder = ['Des 2024','Jan 2025','Feb 2025','Mar 2025','Apr 2025','Mei 2025','Jun 2025','Jul 2025','Agu 2025','Sep 2025','Okt 2025','Nov 2025','Des 2025','Jan 2026','Feb 2026','Mar 2026','Apr 2026','Mei 2026','Jun 2026','Jul 2026','Agu 2026','Sep 2026','Okt 2026','Nov 2026','Des 2026'];

function getBulanIndex(bulan) {
    const idx = bulanOrder.indexOf(bulan);
    return idx >= 0 ? idx : 999;
}

function mapApiRow(d) {
    const lapTotal = (d.pemasukanLap1 || 0) + (d.pemasukanLap2 || 0);
    const totalPem = lapTotal + (d.pemasukanKan || 0);
    const pengeluaranInv = (d.kama || 0) + (d.kiki || 0) + (d.adit || 0) + (d.keuntunganPemodal || 0) + (d.pengembalianModal || 0);
    const reinvestasi = pengeluaranInv > 0 ? 0 : Math.max(0, totalPem - (d.pengeluaranOp || 0) - 12000000);
    const totalPeng = (d.pengeluaranOp || 0) + pengeluaranInv;
    return {
        bulan: d.bulan,
        pemasukanLap: lapTotal,
        pemasukanLap1: d.pemasukanLap1 || 0,
        pemasukanLap2: d.pemasukanLap2 || 0,
        pemasukanKan: d.pemasukanKan || 0,
        pengeluaranOp: d.pengeluaranOp || 0,
        pengeluaranInv,
        reinvestasi,
        status: 'input',
        type: 'input',
        totalPem,
        totalPeng,
        sisa: totalPem - totalPeng,
        detail: {
            kama: d.kama || 0,
            kiki: d.kiki || 0,
            adit: d.adit || 0,
            keuntunganPemodal: d.keuntunganPemodal || 0,
            pengembalianModal: d.pengembalianModal || 0
        }
    };
}

function getDataGabungan() {
    const inputBulans = new Set(apiBulanData.map(d => d.bulan));

    const historis = dataBulanan
        .filter(d => !inputBulans.has(d.bulan))
        .map(d => {
            const totalPem = computeTotalPem(d);
            const reinvestasi = computeReinvestasi(d, totalPem);
            return {
                ...d,
                type: 'historis',
                totalPem,
                reinvestasi,
                totalPeng: d.pengeluaranOp + d.pengeluaranInv,
                sisa: totalPem - (d.pengeluaranOp + d.pengeluaranInv)
            };
        });

    const inputMapped = apiBulanData.map(mapApiRow);

    const gabungan = [...historis, ...inputMapped];
    gabungan.sort((a, b) => getBulanIndex(a.bulan) - getBulanIndex(b.bulan));
    return gabungan;
}

function renderPengembalianGabungan() {
    const tbody = document.getElementById('bodyPengembalian');
    if (!tbody) return;
    tbody.innerHTML = '';

    const allData = getDataGabungan();
    let totLap1 = 0, totLap2 = 0, totKan = 0, totPem = 0, totOp = 0, totInv = 0, totPeng = 0, totSisa = 0;
    let totReinvestasi = 0;
    let kumProfit = 0;
    let kumReinvestasi = 0;

    allData.forEach(d => {
        const displaySisa = computeDisplaySisa(d);
        const reinvestasi = d.reinvestasi || 0;

        totLap1 += d.pemasukanLap1 || 0;
        totLap2 += d.pemasukanLap2 || 0;
        totKan += d.pemasukanKan;
        totPem += d.totalPem;
        totOp += d.pengeluaranOp;
        totInv += d.pengeluaranInv;
        totPeng += d.totalPeng;
        totSisa += displaySisa;
        totReinvestasi += reinvestasi;

        kumProfit += displaySisa;
        kumReinvestasi += reinvestasi;
        const kumulatif = kumProfit + kumReinvestasi;

        const tr = document.createElement('tr');
        let statusBadge = '';
        if (d.status === 'closed') statusBadge = '<span class="badge badge-selesai">&#10003; Selesai</span>';
        else if (d.status === 'running') statusBadge = '<span class="badge badge-running">&#9654; Running</span>';
        else if (d.status === 'current') statusBadge = '<span class="badge badge-current">&#9679; Saat Ini</span>';
        else if (d.status === 'input') statusBadge = '<span class="badge badge-input">&#9998; Input</span>';

        tr.innerHTML = `
            <td><b>${d.bulan}</b></td>
            <td>${formatRp(d.pemasukanLap1 || 0)}</td>
            <td>${formatRp(d.pemasukanLap2 || 0)}</td>
            <td>${formatRp(d.pemasukanKan)}</td>
            <td class="highlight-blue">${formatRp(d.totalPem)}</td>
            <td>${formatRp(d.pengeluaranOp)}</td>
            <td>${formatRp(d.pengeluaranInv)}</td>
            <td class="highlight-reinvest">${formatRp(reinvestasi)}</td>
            <td>${formatRp(d.totalPeng)}</td>
            <td class="${displaySisa >= 0 ? 'text-green' : 'text-red'}">${formatRp(displaySisa)}</td>
            <td class="highlight-kumulatif">${formatRp(kumulatif)}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totPemasukanLap1').textContent = formatRp(totLap1);
    document.getElementById('totPemasukanLap2').textContent = formatRp(totLap2);
    document.getElementById('totPemasukanKan').textContent = formatRp(totKan);
    document.getElementById('totPemasukan').textContent = formatRp(totPem);
    document.getElementById('totPengeluaranOp').textContent = formatRp(totOp);
    document.getElementById('totPengeluaranInv').textContent = formatRp(totInv);
    document.getElementById('totReinvestasi').textContent = formatRp(totReinvestasi);
    document.getElementById('totPengeluaran').textContent = formatRp(totPeng);
    document.getElementById('totSisa').textContent = formatRp(totSisa);
    const totKumEl = document.getElementById('totKumulatif');
    if (totKumEl) totKumEl.textContent = formatRp(kumProfit + kumReinvestasi);
}

function renderGrafik() {
    const allData = getDataGabungan();
    const labels = allData.map(d => d.bulan);
    const sisaData = allData.map(d => d.sisa);
    const pengeluaranData = allData.map(d => d.totalPeng);

    let kumulatif = 0;
    const kumulatifData = allData.map(d => {
        kumulatif += d.sisa;
        return kumulatif;
    });

    // 1. Grafik Keuntungan per Bulan
    const ctx1 = document.getElementById('chartKeuntungan');
    if (ctx1) {
        if (chartKeuntungan) chartKeuntungan.destroy();
        chartKeuntungan = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Keuntungan per Bulan',
                    data: sisaData,
                    backgroundColor: sisaData.map(v => v >= 0 ? 'rgba(46, 125, 50, 0.75)' : 'rgba(198, 40, 40, 0.75)'),
                    borderColor: sisaData.map(v => v >= 0 ? 'rgba(46, 125, 50, 1)' : 'rgba(198, 40, 40, 1)'),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Keuntungan: ' + formatRp(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + 'jt'; },
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // 2. Grafik Pengeluaran per Bulan
    const ctx2 = document.getElementById('chartPengeluaran');
    if (ctx2) {
        if (chartPengeluaran) chartPengeluaran.destroy();
        chartPengeluaran = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran per Bulan',
                    data: pengeluaranData,
                    backgroundColor: 'rgba(239, 108, 0, 0.75)',
                    borderColor: 'rgba(239, 108, 0, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) { return 'Pengeluaran: ' + formatRp(context.raw); }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + 'jt'; },
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // 3. Grafik Total Keuntungan Kumulatif
    const ctx3 = document.getElementById('chartTotalKeuntungan');
    if (ctx3) {
        if (chartTotalKeuntungan) chartTotalKeuntungan.destroy();
        chartTotalKeuntungan = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Keuntungan Kumulatif',
                    data: kumulatifData,
                    borderColor: 'rgba(25, 118, 210, 1)',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(25, 118, 210, 0.3)');
                        gradient.addColorStop(1, 'rgba(25, 118, 210, 0.0)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(25, 118, 210, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) { return 'Total Kumulatif: ' + formatRp(context.raw); }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + 'jt'; },
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // 4. Grafik YoY — Perbandingan Year over Year (Profit per Bulan)
    renderChartYoY(allData);
    // 5. Grafik YoY — Total Pemasukan per Bulan
    renderChartYoYRevenue(allData);
}

function renderChartYoY(allData) {
    const ctx4 = document.getElementById('chartYoY');
    if (!ctx4) return;

    const bulanSingkat = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const bulanMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
        'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
    };

    // Group data by (bulan, tahun)
    const grouped = {}; // { tahun: { bulanIndex: profit } }
    allData.forEach(d => {
        const parts = d.bulan.split(' ');
        if (parts.length !== 2) return;
        const bln = parts[0];
        const thn = parts[1];
        const idx = bulanMap[bln];
        if (idx === undefined) return;
        if (!grouped[thn]) grouped[thn] = {};
        grouped[thn][idx] = computeDisplaySisa(d);
    });

    const tahunList = Object.keys(grouped).sort(); // ['2024','2025','2026']
    // Filter: hanya tampilkan tahun yang punya >= 2 data point (supaya tidak cuma 1 bar)
    const validTahun = tahunList.filter(t => Object.keys(grouped[t]).length >= 1);

    const colors = [
        { bg: 'rgba(57, 73, 171, 0.75)', border: 'rgba(57, 73, 171, 1)' },
        { bg: 'rgba(239, 108, 0, 0.75)', border: 'rgba(239, 108, 0, 1)' },
        { bg: 'rgba(46, 125, 50, 0.75)', border: 'rgba(46, 125, 50, 1)' },
    ];

    const datasets = validTahun.map((t, i) => {
        const c = colors[i % colors.length];
        const data = bulanSingkat.map((_, idx) => grouped[t][idx] ?? null);
        return {
            label: 'Tahun ' + t,
            data: data,
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
        };
    });

    if (chartYoY) chartYoY.destroy();
    chartYoY = new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: bulanSingkat,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 }, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatRp(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + 'jt'; },
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function renderChartYoYRevenue(allData) {
    const ctx5 = document.getElementById('chartYoYRevenue');
    if (!ctx5) return;

    const bulanSingkat = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const bulanMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
        'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
    };

    const grouped = {};
    allData.forEach(d => {
        const parts = d.bulan.split(' ');
        if (parts.length !== 2) return;
        const bln = parts[0];
        const thn = parts[1];
        const idx = bulanMap[bln];
        if (idx === undefined) return;
        if (!grouped[thn]) grouped[thn] = {};
        grouped[thn][idx] = d.totalPem;
    });

    const tahunList = Object.keys(grouped).sort();
    const validTahun = tahunList.filter(t => Object.keys(grouped[t]).length >= 1);

    const colors = [
        { bg: 'rgba(25, 118, 210, 0.75)', border: 'rgba(25, 118, 210, 1)' },
        { bg: 'rgba(239, 108, 0, 0.75)', border: 'rgba(239, 108, 0, 1)' },
        { bg: 'rgba(123, 31, 162, 0.75)', border: 'rgba(123, 31, 162, 1)' },
    ];

    const datasets = validTahun.map((t, i) => {
        const c = colors[i % colors.length];
        const data = bulanSingkat.map((_, idx) => grouped[t][idx] ?? null);
        return {
            label: 'Tahun ' + t,
            data: data,
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
        };
    });

    if (chartYoYRevenue) chartYoYRevenue.destroy();
    chartYoYRevenue = new Chart(ctx5, {
        type: 'bar',
        data: {
            labels: bulanSingkat,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 }, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatRp(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) { return 'Rp ' + (value / 1000000).toFixed(0) + 'jt'; },
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

let currentBulanIndex = 0;

function renderKalenderBulanan() {
    const container = document.getElementById('kalenderBulanan');
    const label = document.getElementById('bulanTahunLabel');
    if (!container || !label) return;

    const allData = getDataGabungan();
    const d = allData[currentBulanIndex];
    if (!d) return;

    label.textContent = d.bulan;

    let statusColor = '#1976d2';
    let statusText = 'Sedang Berjalan';
    let statusClass = 'badge-current';
    if (d.status === 'closed') { statusColor = '#2e7d32'; statusText = 'Bulan Selesai'; statusClass = 'badge-selesai'; }
    if (d.status === 'running') { statusColor = '#ef6c00'; statusText = 'Running'; statusClass = 'badge-running'; }
    if (d.status === 'input') { statusColor = '#7b1fa2'; statusText = 'Data Input'; statusClass = 'badge-input'; }

    let detailHTML = '';
    if (d.type === 'input' && d.detail) {
        detailHTML = `
            <div class="detail-rincian">
                <div class="detail-title">Rincian Pengeluaran:</div>
                <div class="detail-items">
                    <span>Kama: <b>${formatRp(d.detail.kama)}</b></span>
                    <span>Kiki: <b>${formatRp(d.detail.kiki)}</b></span>
                    <span>Adit: <b>${formatRp(d.detail.adit)}</b></span>
                    <span>Keuntungan Pemodal: <b>${formatRp(d.detail.keuntunganPemodal)}</b></span>
                    <span>Pengembalian Modal: <b>${formatRp(d.detail.pengembalianModal)}</b></span>
                </div>
            </div>
        `;
    }

    const lap1 = d.pemasukanLap1 || 0;
    const lap2 = d.pemasukanLap2 || 0;
    const lapTotalOld = d.pemasukanLap || 0;
    let lapanganHTML = '';
    if (lap1 > 0 || lap2 > 0) {
        lapanganHTML = `
            <div class="month-item item-pemasukan">
                <div class="month-label">Pemasukan Lap 1</div>
                <div class="month-value">${formatRp(lap1)}</div>
            </div>
            <div class="month-item item-pemasukan">
                <div class="month-label">Pemasukan Lap 2</div>
                <div class="month-value">${formatRp(lap2)}</div>
            </div>
        `;
    } else {
        lapanganHTML = `
            <div class="month-item item-pemasukan">
                <div class="month-label">Pemasukan Lapangan</div>
                <div class="month-value">${formatRp(lapTotalOld)}</div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="month-card">
            <div class="month-header" style="background:${statusColor}">
                <h3>${d.bulan}</h3>
                <span class="badge ${statusClass}" style="background:rgba(255,255,255,0.25);color:#fff;border:none">${statusText}</span>
            </div>
            <div class="month-body">
                <div class="month-grid">
                    ${lapanganHTML}
                    <div class="month-item item-pemasukan">
                        <div class="month-label">Pemasukan Kantin</div>
                        <div class="month-value">${formatRp(d.pemasukanKan)}</div>
                    </div>
                    <div class="month-item item-pengeluaran">
                        <div class="month-label">Pengeluaran Op</div>
                        <div class="month-value">${formatRp(d.pengeluaranOp)}</div>
                    </div>
                    <div class="month-item item-pengeluaran">
                        <div class="month-label">Pengeluaran Investor</div>
                        <div class="month-value">${formatRp(d.pengeluaranInv)}</div>
                    </div>
                </div>
                <div class="month-summary">
                    <div>
                        <div class="month-summary-label">Total Pemasukan</div>
                        <div class="month-summary-value text-green">${formatRp(d.totalPem)}</div>
                    </div>
                    <div style="text-align:right">
                        <div class="month-summary-label">Sisa / Profit</div>
                        <div class="month-summary-value ${d.sisa >= 0 ? 'text-green' : 'text-red'}">${formatRp(d.sisa)}</div>
                    </div>
                </div>
                ${detailHTML}
            </div>
        </div>
    `;
}

function prevBulan() {
    if (currentBulanIndex > 0) {
        currentBulanIndex--;
        renderKalenderBulanan();
    }
}

function nextBulan() {
    const allData = getDataGabungan();
    if (currentBulanIndex < allData.length - 1) {
        currentBulanIndex++;
        renderKalenderBulanan();
    }
}

async function simpanBulanBaru() {
    const bulan = document.getElementById('inputBulan').value;
    const pemasukanLap1 = +document.getElementById('inputPemasukanLap1').value || 0;
    const pemasukanLap2 = +document.getElementById('inputPemasukanLap2').value || 0;
    const pemasukanKan = +document.getElementById('inputPemasukanKan').value || 0;
    const pengeluaranOp = +document.getElementById('inputPengeluaranOp').value || 0;
    const kama = +document.getElementById('inputKama').value || 0;
    const kiki = +document.getElementById('inputKiki').value || 0;
    const adit = +document.getElementById('inputAdit').value || 0;
    const keuntunganPemodal = +document.getElementById('inputKeuntunganPemodal').value || 0;
    const pengembalianModal = +document.getElementById('inputPengembalianModal').value || 0;

    if (!bulan || (pemasukanLap1 + pemasukanLap2 + pemasukanKan) === 0) {
        alert('Isi bulan dan minimal satu pemasukan');
        return;
    }

    try {
        await apiFetch('/api/bulan', {
            method: 'POST',
            body: JSON.stringify({
                bulan, pemasukanLap1, pemasukanLap2, pemasukanKan,
                pengeluaranOp, kama, kiki, adit,
                keuntunganPemodal, pengembalianModal
            })
        });

        // Refresh data from server
        apiBulanData = await apiFetch('/api/bulan');

        const notif = document.getElementById('inputNotif');
        notif.style.display = 'block';
        setTimeout(() => notif.style.display = 'none', 3000);

        renderInputBulan();
        renderPengembalianGabungan();
        renderKalenderBulanan();
        renderGrafik();
        updateReinvestasiDisplay();
    } catch (e) {
        alert('Gagal menyimpan: ' + e.message);
    }
}

function editInputBulan(bulan) {
    const d = apiBulanData.find(x => x.bulan === bulan);
    if (!d) return;

    document.getElementById('inputBulan').value = d.bulan;
    document.getElementById('inputPemasukanLap1').value = d.pemasukanLap1 || 0;
    document.getElementById('inputPemasukanLap2').value = d.pemasukanLap2 || 0;
    document.getElementById('inputPemasukanKan').value = d.pemasukanKan || 0;
    document.getElementById('inputPengeluaranOp').value = d.pengeluaranOp || 0;
    document.getElementById('inputKama').value = d.kama || 0;
    document.getElementById('inputKiki').value = d.kiki || 0;
    document.getElementById('inputAdit').value = d.adit || 0;
    document.getElementById('inputKeuntunganPemodal').value = d.keuntunganPemodal || 0;
    document.getElementById('inputPengembalianModal').value = d.pengembalianModal || 0;

    document.querySelector('.grid-inputs').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function hapusInputBulan(bulan) {
    try {
        await apiFetch('/api/bulan/' + encodeURIComponent(bulan), { method: 'DELETE' });
        apiBulanData = await apiFetch('/api/bulan');
        renderInputBulan();
        renderPengembalianGabungan();
        renderKalenderBulanan();
        renderGrafik();
        updateReinvestasiDisplay();
    } catch (e) {
        alert('Gagal menghapus: ' + e.message);
    }
}

function renderInputBulan() {
    const tbody = document.getElementById('bodyInputBulan');
    if (!tbody) return;
    tbody.innerHTML = '';

    apiBulanData.forEach(d => {
        const totalPengeluaran = (d.pengeluaranOp || 0) + (d.kama || 0) + (d.kiki || 0) + (d.adit || 0) + (d.keuntunganPemodal || 0) + (d.pengembalianModal || 0);
        const totalPemasukan = (d.pemasukanLap1 || 0) + (d.pemasukanLap2 || 0) + (d.pemasukanKan || 0);
        const sisa = totalPemasukan - totalPengeluaran;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${d.bulan}</b></td>
            <td>${formatRp(d.pemasukanLap1 || 0)}</td>
            <td>${formatRp(d.pemasukanLap2 || 0)}</td>
            <td>${formatRp(d.pemasukanKan || 0)}</td>
            <td>${formatRp(d.pengeluaranOp || 0)}</td>
            <td>${formatRp(d.kama || 0)}</td>
            <td>${formatRp(d.kiki || 0)}</td>
            <td>${formatRp(d.adit || 0)}</td>
            <td>${formatRp(d.keuntunganPemodal || 0)}</td>
            <td>${formatRp(d.pengembalianModal || 0)}</td>
            <td>${formatRp(totalPengeluaran)}</td>
            <td class="${sisa >= 0 ? 'text-green' : 'text-red'}">${formatRp(sisa)}</td>
            <td>
                <button onclick="editInputBulan('${d.bulan}')" class="btn-edit">Edit</button>
                <button onclick="hapusInputBulan('${d.bulan}')" class="btn-hapus">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.add('active');
}

async function simpanReinvestasi() {
    const adit = +document.getElementById('inputReinvestAdit').value || 0;
    const kama = +document.getElementById('inputReinvestKama').value || 0;
    try {
        await apiFetch('/api/reinvestasi', {
            method: 'POST',
            body: JSON.stringify({ adit, kama })
        });
        apiReinvestasi = { adit, kama };
        updateReinvestasiDisplay();
    } catch (e) {
        alert('Gagal menyimpan reinvestasi: ' + e.message);
    }
}

function loadReinvestasi() {
    const aditIn = document.getElementById('inputReinvestAdit');
    const kamaIn = document.getElementById('inputReinvestKama');
    if (aditIn) aditIn.value = apiReinvestasi.adit || '';
    if (kamaIn) kamaIn.value = apiReinvestasi.kama || '';
    updateReinvestasiDisplay();
}

function updateReinvestasiDisplay() {
    const adit = apiReinvestasi.adit || 0;
    const kama = apiReinvestasi.kama || 0;

    const allData = getDataGabungan();
    let totalReinvestasi = 0;
    allData.forEach(d => { totalReinvestasi += d.reinvestasi || 0; });

    const grandTotal = adit + kama;

    const elTotal = document.getElementById('reinvestTotal');
    const elGrand = document.getElementById('reinvestGrandTotal');
    if (elTotal) elTotal.textContent = formatRp(totalReinvestasi);
    if (elGrand) elGrand.textContent = formatRp(grandTotal);
}

// --- AI Analisa ---
let aiChatHistory = [];

function gatherFinancialSummary() {
    const allData = getDataGabungan();
    const closedData = allData.filter(d => d.status === 'closed' || d.status === 'running');
    const n = closedData.length || 1;

    let totRevenue = 0, totProfit = 0, totOp = 0, totInv = 0;
    closedData.forEach(d => {
        totRevenue += d.totalPem;
        totProfit += computeDisplaySisa(d);
        totOp += d.pengeluaranOp;
        totInv += d.pengeluaranInv;
    });

    return {
        totalModal: modalSummary.total,
        totalModalLap1: modalSummary.lap1,
        totalModalLap2: modalSummary.lap2,
        totalBersih: modalSummary.bersih,
        avgRevenuePerMonth: Math.round(totRevenue / n),
        avgProfitPerMonth: Math.round(totProfit / n),
        avgOpPerMonth: Math.round(totOp / n),
        avgInvPerMonth: Math.round(totInv / n),
        totalRevenue: totRevenue,
        totalProfit: totProfit,
        monthsCount: n,
        reinvestasiAdit: apiReinvestasi.adit || 0,
        reinvestasiKama: apiReinvestasi.kama || 0,
        currentDate: 'Mei 2026'
    };
}

async function generateAnalisaAI() {
    const btn = document.getElementById('btnGenerateAI');
    const loading = document.getElementById('aiLoading');
    const resultBox = document.getElementById('aiResultBox');
    const chatArea = document.getElementById('aiChatArea');

    btn.disabled = true;
    loading.style.display = 'flex';
    resultBox.style.display = 'none';

    const s = gatherFinancialSummary();

    const promptText = `Analisis data keuangan DSC berikut dan berikan strategi concrete:

**DATA KEUANGAN:**
- Total Modal Lapangan 1: ${formatRp(s.totalModalLap1)}
- Total Modal Lapangan 2: ${formatRp(s.totalModalLap2)}
- Total Modal Keseluruhan: ${formatRp(s.totalModal)}
- Total Modal Bersih (setelah dikurangi Rp 432jt): ${formatRp(s.totalBersih)}
- **Modal Sewa Lapangan 2 Tahun: Rp 1.300.000.000**
- Rata-rata Revenue per Bulan (${s.monthsCount} bulan): ${formatRp(s.avgRevenuePerMonth)}
- Rata-rata Profit per Bulan: ${formatRp(s.avgProfitPerMonth)}
- Rata-rata Pengeluaran Operasional per Bulan: ${formatRp(s.avgOpPerMonth)}
- Rata-rata Pengeluaran Investor per Bulan: ${formatRp(s.avgInvPerMonth)}
- Total Revenue Kumulatif: ${formatRp(s.totalRevenue)}
- Total Profit Kumulatif: ${formatRp(s.totalProfit)}
- Reinvestasi Adit: ${formatRp(s.reinvestasiAdit)}
- Reinvestasi Kama: ${formatRp(s.reinvestasiKama)}

**PERTANYAAN STRATEGIS:**
Bagaimana cara membayar uang sewa/modal lapangan selama 24 bulan ke depan untuk:
- Lapangan 1 (dimulai Nov 2024, sewa kantor depan Rp 36jt per 2 tahun)
- Lapangan 2 (dimulai Feb 2025, termin pelunasan)

Sambil mempertahankan:
1. Pengembalian modal pelan-pelan ke investor
2. Keuntungan operasional tetap berjalan
3. Cash flow tetap sehat

Berikan dalam format:
1. **Ringkasan Situasi** (2-3 paragraf)
2. **Rekomendasi Strategi** (bullet points, dengan angka rupiah)
3. **Alokasi Bulanan yang Dianjurkan** (tabel/poin)
4. **Milestone per Kuartal** (Q1-Q8 untuk 2 tahun)
5. **Risiko & Mitigasi**
6. **Action Items Prioritas** (5 poin)`;

    try {
        const data = await apiFetch('/api/analisa', {
            method: 'POST',
            body: JSON.stringify({ messages: [{ role: 'user', content: promptText }] })
        });

        resultBox.style.display = 'block';
        resultBox.innerHTML = formatAIResponse(data.reply);
        chatArea.style.display = 'flex';

        // Reset chat history dengan system context
        aiChatHistory = [
            { role: 'system', content: `Konteks data DSC: Total Modal=${s.totalModal}, Avg Revenue/Bulan=${s.avgRevenuePerMonth}, Avg Profit/Bulan=${s.avgProfitPerMonth}. Analisis sebelumnya: ${data.reply.substring(0, 2000)}` },
            { role: 'user', content: promptText },
            { role: 'assistant', content: data.reply }
        ];

        // Tampilkan pesan awal di chat
        const chatMessages = document.getElementById('aiChatMessages');
        chatMessages.innerHTML = `<div class="ai-msg ai-msg-ai">${formatAIResponse(data.reply)}</div>`;

    } catch (e) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `<div style="color:#c62828;font-weight:700">❌ Gagal: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
}

function formatAIResponse(text) {
    // Simple markdown-like formatting
    let html = text
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/## (.*)/g, '<h3>$1</h3>')
        .replace(/# (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/<li>(.*?)<\/li>(\s*<li>)/g, '<li>$1</li>$2')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    return html;
}

async function sendAIChat() {
    const inputEl = document.getElementById('aiChatInput');
    const text = inputEl.value.trim();
    if (!text) return;

    const chatMessages = document.getElementById('aiChatMessages');
    const chatArea = document.getElementById('aiChatArea');

    // Tambah pesan user
    chatMessages.innerHTML += `<div class="ai-msg ai-msg-user">${escapeHtml(text)}</div>`;
    inputEl.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Tambah ke history
    aiChatHistory.push({ role: 'user', content: text });

    try {
        const data = await apiFetch('/api/analisa', {
            method: 'POST',
            body: JSON.stringify({ messages: aiChatHistory })
        });

        aiChatHistory.push({ role: 'assistant', content: data.reply });
        chatMessages.innerHTML += `<div class="ai-msg ai-msg-ai">${formatAIResponse(data.reply)}</div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (e) {
        chatMessages.innerHTML += `<div class="ai-msg ai-msg-ai" style="color:#c62828">❌ Error: ${e.message}</div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Init ---
window.addEventListener('load', async () => {
    const token = getToken();
    if (!token) {
        showLogin();
        return;
    }
    // Verify token
    try {
        await apiFetch('/api/me');
        showApp();
        await loadAllData();
    } catch (e) {
        showLogin();
    }
});
