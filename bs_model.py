import numpy as np
from scipy.stats import norm


class BSModel:
    def __init__(self, S, K, T, r, sigma):
        self.S = float(S)
        self.K = float(K)
        self.T = float(T)
        self.r = float(r)
        self.sigma = float(sigma)
        self._calc_d1_d2()

    def _calc_d1_d2(self):
        if self.T <= 0 or self.sigma <= 0:
            self.d1 = self.d2 = None
            return
        self.d1 = (np.log(self.S / self.K) + (self.r + 0.5 * self.sigma**2) * self.T) / (self.sigma * np.sqrt(self.T))
        self.d2 = self.d1 - self.sigma * np.sqrt(self.T)

    def call_price(self):
        if self.T <= 0:
            return max(self.S - self.K, 0)
        return self.S * norm.cdf(self.d1) - self.K * np.exp(-self.r * self.T) * norm.cdf(self.d2)

    def put_price(self):
        if self.T <= 0:
            return max(self.K - self.S, 0)
        return self.K * np.exp(-self.r * self.T) * norm.cdf(-self.d2) - self.S * norm.cdf(-self.d1)

    def delta(self, option_type='call'):
        if self.T <= 0 or self.d1 is None:
            if option_type == 'call':
                return 1.0 if self.S > self.K else 0.0
            return -1.0 if self.S < self.K else 0.0
        if option_type == 'call':
            return norm.cdf(self.d1)
        return norm.cdf(self.d1) - 1

    def gamma(self):
        if self.T <= 0 or self.d1 is None:
            return 0.0
        return norm.pdf(self.d1) / (self.S * self.sigma * np.sqrt(self.T))

    def theta(self, option_type='call'):
        if self.T <= 0 or self.d1 is None:
            return 0.0
        common = -self.S * norm.pdf(self.d1) * self.sigma / (2 * np.sqrt(self.T))
        if option_type == 'call':
            return (common - self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(self.d2)) / 365
        return (common + self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(-self.d2)) / 365

    def vega(self):
        if self.T <= 0 or self.d1 is None:
            return 0.0
        return self.S * norm.pdf(self.d1) * np.sqrt(self.T) / 100

    def rho(self, option_type='call'):
        if self.T <= 0 or self.d1 is None:
            return 0.0
        if option_type == 'call':
            return self.K * self.T * np.exp(-self.r * self.T) * norm.cdf(self.d2) / 100
        return -self.K * self.T * np.exp(-self.r * self.T) * norm.cdf(-self.d2) / 100

    def all_greeks(self, option_type='call'):
        return {
            'price': self.call_price() if option_type == 'call' else self.put_price(),
            'delta': self.delta(option_type),
            'gamma': self.gamma(),
            'theta': self.theta(option_type),
            'vega': self.vega(),
            'rho': self.rho(option_type)
        }

    @staticmethod
    def implied_vol(price, S, K, T, r, option_type='call', tol=1e-6, max_iter=100):
        sigma_low, sigma_high = 0.001, 5.0
        for _ in range(max_iter):
            sigma_mid = (sigma_low + sigma_high) / 2
            model = BSModel(S, K, T, r, sigma_mid)
            if option_type == 'call':
                price_mid = model.call_price()
            else:
                price_mid = model.put_price()
            if abs(price_mid - price) < tol:
                return sigma_mid
            if price_mid > price:
                sigma_high = sigma_mid
            else:
                sigma_low = sigma_mid
        return (sigma_low + sigma_high) / 2

    @staticmethod
    def sensitivity_surface(S_range, K, T, r, sigma, option_type='call'):
        S_vals = np.array(S_range)
        T_vals = np.linspace(0.01, max(T, 0.1), 50)
        prices = np.zeros((len(S_vals), len(T_vals)))
        for i, s in enumerate(S_vals):
            for j, t in enumerate(T_vals):
                model = BSModel(s, K, t, r, sigma)
                prices[i, j] = model.call_price() if option_type == 'call' else model.put_price()
        return S_vals.tolist(), T_vals.tolist(), prices.tolist()
