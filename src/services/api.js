export class CurrencyAPI {
  constructor() {
    this.baseURL = "http://localhost:8000";
    this.externalAPI = "https://api.fxratesapi.com";
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 минут

    // Fallback данные для демо режима
    this.fallbackSymbols = {
      USD: { description: "US Dollar", symbol: "$" },
      EUR: { description: "Euro", symbol: "€" },
      GBP: { description: "British Pound", symbol: "£" },
      JPY: { description: "Japanese Yen", symbol: "¥" },
      CHF: { description: "Swiss Franc", symbol: "CHF" },
      CAD: { description: "Canadian Dollar", symbol: "C$" },
      AUD: { description: "Australian Dollar", symbol: "A$" },
      CNY: { description: "Chinese Yuan", symbol: "¥" },
      RUB: { description: "Russian Ruble", symbol: "₽" },
      INR: { description: "Indian Rupee", symbol: "₹" },
      BRL: { description: "Brazilian Real", symbol: "R$" },
      KRW: { description: "South Korean Won", symbol: "₩" },
      MXN: { description: "Mexican Peso", symbol: "$" },
      SGD: { description: "Singapore Dollar", symbol: "S$" },
      HKD: { description: "Hong Kong Dollar", symbol: "HK$" },
      NOK: { description: "Norwegian Krone", symbol: "kr" },
      SEK: { description: "Swedish Krona", symbol: "kr" },
      DKK: { description: "Danish Krone", symbol: "kr" },
      PLN: { description: "Polish Zloty", symbol: "zł" },
      CZK: { description: "Czech Koruna", symbol: "Kč" },
    };

    this.fallbackRates = {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CHF: 0.92,
      CAD: 1.25,
      AUD: 1.35,
      CNY: 6.45,
      RUB: 75.0,
      INR: 74.0,
      BRL: 5.2,
      KRW: 1180.0,
      MXN: 20.0,
      SGD: 1.35,
      HKD: 7.8,
      NOK: 8.5,
      SEK: 8.7,
      DKK: 6.3,
      PLN: 3.9,
      CZK: 21.5,
    };
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async getSymbols() {
    const cacheKey = "symbols";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const data = await this.request(`${this.baseURL}/symbols.php`);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn("Backend symbols API failed, using fallback data:", error);
      const fallbackData = {
        success: true,
        symbols: this.fallbackSymbols,
        cached: false,
        timestamp: new Date().toISOString(),
        fallback: true,
      };
      this.cache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
      return fallbackData;
    }
  }

  async convert(from, to, amount) {
    if (!from || !to || !amount || amount <= 0) {
      throw new Error("Неверные параметры конвертации");
    }

    try {
      const params = new URLSearchParams({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount: amount.toString(),
      });
      const data = await this.request(`${this.baseURL}/convert.php?${params}`);
      return data;
    } catch (error) {
      console.warn(
        "Backend convert API failed, using fallback calculation:",
        error
      );
      const fromUpper = from.toUpperCase();
      const toUpper = to.toUpperCase();
      if (!this.fallbackRates[fromUpper] || !this.fallbackRates[toUpper]) {
        throw new Error("Валюта не поддерживается в демо режиме");
      }
      const rate = this.fallbackRates[toUpper] / this.fallbackRates[fromUpper];
      const result = amount * rate;
      return {
        success: true,
        from: fromUpper,
        to: toUpper,
        amount: amount,
        result: Math.round(result * 100) / 100,
        rate: Math.round(rate * 1000000) / 1000000,
        date: new Date().toISOString(),
        fallback: true,
      };
    }
  }

  async getHistory() {
    try {
      const data = await this.request(`${this.baseURL}/history.php`);
      return data;
    } catch (error) {
      console.warn("Backend history API failed, using localStorage:", error);
      const localHistory = localStorage.getItem("currencyHistory");
      return {
        success: true,
        history: localHistory ? JSON.parse(localHistory) : [],
        fallback: true,
      };
    }
  }

  async saveHistory(conversion) {
    try {
      const data = await this.request(`${this.baseURL}/history.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(conversion),
      });
      return data;
    } catch (error) {
      console.warn("Backend save history failed, using localStorage:", error);
      const localHistory = JSON.parse(
        localStorage.getItem("currencyHistory") || "[]"
      );
      localHistory.unshift(conversion);
      localStorage.setItem(
        "currencyHistory",
        JSON.stringify(localHistory.slice(0, 10))
      );
      return { success: true, fallback: true };
    }
  }

  async getTimeSeries(from, to, days = 30) {
    const cacheKey = `timeseries_${from}_${to}_${days}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        days: days.toString(),
      });
      const data = await this.request(
        `${this.baseURL}/timeseries.php?${params}`
      );
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn(
        "Backend timeseries API failed, using fallback data:",
        error
      );
      const fromUpper = from.toUpperCase();
      const toUpper = to.toUpperCase();
      if (!this.fallbackRates[fromUpper] || !this.fallbackRates[toUpper]) {
        throw new Error("Валюта не поддерживается в демо режиме");
      }
      const baseRate =
        this.fallbackRates[toUpper] / this.fallbackRates[fromUpper];
      const rates = {};
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const variation = (Math.random() - 0.5) * 0.1; // ±5%
        const rate = baseRate * (1 + variation);
        rates[dateStr] = rate;
      }
      const result = {
        from: fromUpper,
        to: toUpper,
        rates,
        fallback: true,
      };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  }
}
