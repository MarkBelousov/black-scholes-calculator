// Black-Scholes Model - JavaScript Implementation
class BSModel {
    constructor(S, K, T, r, sigma) {
        this.S = parseFloat(S);
        this.K = parseFloat(K);
        this.T = parseFloat(T);
        this.r = parseFloat(r);
        this.sigma = parseFloat(sigma);
        this._calcD1D2();
    }

    _calcD1D2() {
        if (this.T <= 0 || this.sigma <= 0) {
            this.d1 = null;
            this.d2 = null;
            return;
        }
        this.d1 = (Math.log(this.S / this.K) + (this.r + 0.5 * this.sigma ** 2) * this.T) / (this.sigma * Math.sqrt(this.T));
        this.d2 = this.d1 - this.sigma * Math.sqrt(this.T);
    }

    _normCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return 0.5 * (1.0 + sign * y);
    }

    _normPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    callPrice() {
        if (this.T <= 0) return Math.max(this.S - this.K, 0);
        return this.S * this._normCDF(this.d1) - this.K * Math.exp(-this.r * this.T) * this._normCDF(this.d2);
    }

    putPrice() {
        if (this.T <= 0) return Math.max(this.K - this.S, 0);
        return this.K * Math.exp(-this.r * this.T) * this._normCDF(-this.d2) - this.S * this._normCDF(-this.d1);
    }

    delta(optionType = 'call') {
        if (this.T <= 0 || this.d1 === null) {
            if (optionType === 'call') return this.S > this.K ? 1.0 : 0.0;
            return this.S < this.K ? -1.0 : 0.0;
        }
        if (optionType === 'call') return this._normCDF(this.d1);
        return this._normCDF(this.d1) - 1;
    }

    gamma() {
        if (this.T <= 0 || this.d1 === null) return 0.0;
        return this._normPDF(this.d1) / (this.S * this.sigma * Math.sqrt(this.T));
    }

    theta(optionType = 'call') {
        if (this.T <= 0 || this.d1 === null) return 0.0;
        const common = -this.S * this._normPDF(this.d1) * this.sigma / (2 * Math.sqrt(this.T));
        if (optionType === 'call') {
            return (common - this.r * this.K * Math.exp(-this.r * this.T) * this._normCDF(this.d2)) / 365;
        }
        return (common + this.r * this.K * Math.exp(-this.r * this.T) * this._normCDF(-this.d2)) / 365;
    }

    vega() {
        if (this.T <= 0 || this.d1 === null) return 0.0;
        return this.S * this._normPDF(this.d1) * Math.sqrt(this.T) / 100;
    }

    rho(optionType = 'call') {
        if (this.T <= 0 || this.d1 === null) return 0.0;
        if (optionType === 'call') {
            return this.K * this.T * Math.exp(-this.r * this.T) * this._normCDF(this.d2) / 100;
        }
        return -this.K * this.T * Math.exp(-this.r * this.T) * this._normCDF(-this.d2) / 100;
    }

    allGreeks(optionType = 'call') {
        return {
            price: optionType === 'call' ? this.callPrice() : this.putPrice(),
            delta: this.delta(optionType),
            gamma: this.gamma(),
            theta: this.theta(optionType),
            vega: this.vega(),
            rho: this.rho(optionType)
        };
    }

    static impliedVol(price, S, K, T, r, optionType = 'call', tol = 1e-6, maxIter = 100) {
        let sigmaLow = 0.001;
        let sigmaHigh = 5.0;

        for (let i = 0; i < maxIter; i++) {
            const sigmaMid = (sigmaLow + sigmaHigh) / 2;
            const model = new BSModel(S, K, T, r, sigmaMid);
            const priceMid = optionType === 'call' ? model.callPrice() : model.putPrice();

            if (Math.abs(priceMid - price) < tol) {
                return sigmaMid;
            }

            if (priceMid > price) {
                sigmaHigh = sigmaMid;
            } else {
                sigmaLow = sigmaMid;
            }
        }

        return (sigmaLow + sigmaHigh) / 2;
    }

    static sensitivitySurface(SRange, K, T, r, sigma, optionType = 'call') {
        const prices = [];
        const deltas = [];
        const gammas = [];
        const thetas = [];
        const vegas = [];
        const rhos = [];

        for (const S of SRange) {
            const model = new BSModel(S, K, T, r, sigma);
            prices.push(optionType === 'call' ? model.callPrice() : model.putPrice());
            deltas.push(model.delta(optionType));
            gammas.push(model.gamma());
            thetas.push(model.theta(optionType));
            vegas.push(model.vega());
            rhos.push(model.rho(optionType));
        }

        return { prices, deltas, gammas, thetas, vegas, rhos };
    }
}
