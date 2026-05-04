from flask import Flask, render_template, request, jsonify
from bs_model import BSModel
import numpy as np

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/price', methods=['POST'])
def calculate_price():
    data = request.json
    try:
        S = float(data['S'])
        K = float(data['K'])
        T = float(data['T'])
        r = float(data['r'])
        sigma = float(data['sigma'])

        model = BSModel(S, K, T, r, sigma)

        return jsonify({
            'success': True,
            'call': model.all_greeks('call'),
            'put': model.all_greeks('put')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/implied_vol', methods=['POST'])
def calculate_iv():
    data = request.json
    try:
        price = float(data['price'])
        S = float(data['S'])
        K = float(data['K'])
        T = float(data['T'])
        r = float(data['r'])
        option_type = data.get('option_type', 'call')

        iv = BSModel.implied_vol(price, S, K, T, r, option_type)

        return jsonify({
            'success': True,
            'implied_vol': iv,
            'implied_vol_pct': f"{iv * 100:.2f}%"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/sensitivity', methods=['POST'])
def sensitivity():
    data = request.json
    try:
        K = float(data['K'])
        T = float(data['T'])
        r = float(data['r'])
        sigma = float(data['sigma'])
        option_type = data.get('option_type', 'call')

        S_min = K * 0.5
        S_max = K * 1.5
        S_range = np.linspace(S_min, S_max, 100)

        prices = []
        deltas = []
        gammas = []
        thetas = []
        vegas = []
        rhos = []

        for S in S_range:
            model = BSModel(S, K, T, r, sigma)
            prices.append(model.call_price() if option_type == 'call' else model.put_price())
            deltas.append(model.delta(option_type))
            gammas.append(model.gamma())
            thetas.append(model.theta(option_type))
            vegas.append(model.vega())
            rhos.append(model.rho(option_type))

        return jsonify({
            'success': True,
            'S_values': S_range.tolist(),
            'prices': prices,
            'deltas': deltas,
            'gammas': gammas,
            'thetas': thetas,
            'vegas': vegas,
            'rhos': rhos
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, port=5000)
