// Modal Controls
function toggleCalculator() {
    const modal = document.getElementById('calculatorModal');
    const backdrop = document.getElementById('modalBackdrop');

    if (modal.classList.contains('active')) {
        closeCalculator();
    } else {
        modal.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeCalculator() {
    const modal = document.getElementById('calculatorModal');
    const backdrop = document.getElementById('modalBackdrop');

    modal.classList.remove('active');
    backdrop.classList.remove('active');
    // Only restore scroll if help modal is also closed
    const helpModal = document.getElementById('helpModal');
    if (!helpModal.classList.contains('active')) {
        document.body.style.overflow = 'auto';
    }
}

function toggleHelp() {
    const modal = document.getElementById('helpModal');
    const backdrop = document.getElementById('helpBackdrop');

    if (modal.classList.contains('active')) {
        closeHelp();
    } else {
        modal.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeHelp() {
    const modal = document.getElementById('helpModal');
    const backdrop = document.getElementById('helpBackdrop');

    modal.classList.remove('active');
    backdrop.classList.remove('active');
    // Only restore scroll if calculator modal is also closed
    const calcModal = document.getElementById('calculatorModal');
    if (!calcModal.classList.contains('active')) {
        document.body.style.overflow = 'auto';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCalculator();
        closeHelp();
    }
});

// Calculator Form Handler
document.getElementById('calcForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const S = parseFloat(formData.get('S'));
    const K = parseFloat(formData.get('K'));
    const T = parseFloat(formData.get('T'));
    const r = parseFloat(formData.get('r')) / 100;
    const sigma = parseFloat(formData.get('sigma')) / 100;

    try {
        const model = new BSModel(S, K, T, r, sigma);

        displayResults('callResults', model.allGreeks('call'), 'Call');
        displayResults('putResults', model.allGreeks('put'), 'Put');

        document.getElementById('results').style.display = 'block';
        document.getElementById('error').style.display = 'none';
    } catch (err) {
        showError(err.message);
    }
});

// Implied Volatility Form Handler
document.getElementById('ivForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const price = parseFloat(formData.get('price'));
    const S = parseFloat(formData.get('S'));
    const K = parseFloat(formData.get('K'));
    const T = parseFloat(formData.get('T'));
    const r = parseFloat(formData.get('r')) / 100;
    const option_type = formData.get('option_type');

    try {
        const iv = BSModel.impliedVol(price, S, K, T, r, option_type);
        const ivResult = document.getElementById('ivResult');
        ivResult.innerHTML = `<strong>Implied Volatility:</strong> ${(iv * 100).toFixed(2)}%`;
        ivResult.style.display = 'block';
    } catch (err) {
        const ivResult = document.getElementById('ivResult');
        ivResult.innerHTML = `<span style="color: #fca5a5;">Error: ${err.message}</span>`;
        ivResult.style.display = 'block';
    }
});

// Display Results
function displayResults(elementId, data, type) {
    const el = document.getElementById(elementId);
    el.innerHTML = `
        <div class="result-item">
            <div class="label">Price</div>
            <div class="value">$${data.price.toFixed(4)}</div>
        </div>
        <div class="result-item">
            <div class="label">Delta</div>
            <div class="value">${data.delta.toFixed(4)}</div>
        </div>
        <div class="result-item">
            <div class="label">Gamma</div>
            <div class="value">${data.gamma.toFixed(4)}</div>
        </div>
        <div class="result-item">
            <div class="label">Theta (daily)</div>
            <div class="value">${data.theta.toFixed(4)}</div>
        </div>
        <div class="result-item">
            <div class="label">Vega (per 1%)</div>
            <div class="value">${data.vega.toFixed(4)}</div>
        </div>
        <div class="result-item">
            <div class="label">Rho (per 1%)</div>
            <div class="value">${data.rho.toFixed(4)}</div>
        </div>
    `;
}

// Show Error
function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = 'Error: ' + message;
    errorEl.style.display = 'block';
    document.getElementById('results').style.display = 'none';
}

// Generate Charts
function generateCharts() {
    const form = document.getElementById('calcForm');
    const formData = new FormData(form);
    const S = parseFloat(formData.get('S'));
    const K = parseFloat(formData.get('K'));
    const T = parseFloat(formData.get('T'));
    const r = parseFloat(formData.get('r')) / 100;
    const sigma = parseFloat(formData.get('sigma')) / 100;
    const optionType = document.getElementById('chartOptionType').value;

    try {
        // Generate S range from 50% to 150% of strike
        const SRange = [];
        const minS = K * 0.5;
        const maxS = K * 1.5;
        for (let i = 0; i <= 100; i++) {
            SRange.push(minS + (maxS - minS) * (i / 100));
        }

        const surface = BSModel.sensitivitySurface(SRange, K, T, r, sigma, optionType);

        const typeLabel = optionType.charAt(0).toUpperCase() + optionType.slice(1);

        plotChart('priceChart', SRange, surface.prices,
            `${typeLabel} Price`, 'Price ($)', '#FFD700');
        plotChart('deltaChart', SRange, surface.deltas, 'Delta', 'Delta', '#D4AF37');
        plotChart('gammaChart', SRange, surface.gammas, 'Gamma', 'Gamma', '#C0C0C0');
        plotChart('thetaChart', SRange, surface.thetas, 'Theta (daily)', 'Theta', '#B8860B');
        plotChart('vegaChart', SRange, surface.vegas, 'Vega (per 1%)', 'Vega', '#FFD700');
        plotChart('rhoChart', SRange, surface.rhos, 'Rho (per 1%)', 'Rho', '#D4AF37');
    } catch (err) {
        console.error('Chart generation error:', err);
    }
}

// Plot Chart with Dark Theme
function plotChart(elementId, x, y, title, yLabel, color = '#FFD700') {
    const trace = {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: color,
            width: 2
        },
        fill: 'tozeroy',
        fillcolor: color.replace(')', ', 0.1)').replace('rgb', 'rgba')
    };

    const layout = {
        title: {
            text: title,
            font: {
                color: '#fafafa',
                size: 16,
                family: 'Playfair Display, serif'
            }
        },
        xaxis: {
            title: {
                text: 'Spot Price ($)',
                font: { color: '#a1a1aa' }
            },
            gridcolor: '#27272a',
            zerolinecolor: '#3f3f46',
            tickfont: { color: '#a1a1aa' }
        },
        yaxis: {
            title: {
                text: yLabel,
                font: { color: '#a1a1aa' }
            },
            gridcolor: '#27272a',
            zerolinecolor: '#3f3f46',
            tickfont: { color: '#a1a1aa' }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#18181b',
        margin: { t: 50, r: 30, l: 60, b: 50 },
        font: {
            color: '#fafafa',
            family: 'Inter, sans-serif'
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot(elementId, [trace], layout, config);
}
