/**
 * API модуль для работы с валютными данными
 * Обеспечивает взаимодействие с PHP backend и внешними API
 */

class CurrencyAPI {
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

  /**
   * Универсальный метод для HTTP запросов
   * @param {string} url - URL для запроса
   * @param {Object} options - Опции запроса
   * @returns {Promise<Object>} - Результат запроса
   */
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        Accept: "application/json",
      },
    };

    // Добавляем Content-Type только для POST запросов
    if (options.method === "POST" || options.method === "PUT") {
      defaultOptions.headers["Content-Type"] = "application/json";
    }

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  /**
   * Получение списка доступных валют
   * @returns {Promise<Object>} - Объект с валютами
   */
  async getSymbols() {
    const cacheKey = "symbols";

    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Сначала пробуем наш backend
      const data = await this.request(`${this.baseURL}/symbols.php`);

      // Кэшируем результат
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.warn("Backend symbols API failed, using fallback data:", error);

      // Fallback на встроенные данные
      const fallbackData = {
        success: true,
        symbols: this.fallbackSymbols,
        cached: false,
        timestamp: new Date().toISOString(),
        fallback: true,
      };

      // Кэшируем fallback данные
      this.cache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now(),
      });

      return fallbackData;
    }
  }

  /**
   * Конвертация валют
   * @param {string} from - Исходная валюта
   * @param {string} to - Целевая валюта
   * @param {number} amount - Сумма для конвертации
   * @returns {Promise<Object>} - Результат конвертации
   */
  async convert(from, to, amount) {
    if (!from || !to || !amount || amount <= 0) {
      throw new Error("Неверные параметры конвертации");
    }

    try {
      // Сначала пробуем наш backend
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

      // Fallback на встроенные курсы
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

  /**
   * Получение исторических данных для графика
   * @param {string} from - Исходная валюта
   * @param {string} to - Целевая валюта
   * @param {number} days - Количество дней
   * @returns {Promise<Object>} - Исторические данные
   */
  async getTimeSeries(from, to, days = 30) {
    const cacheKey = `timeseries_${from}_${to}_${days}`;

    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Сначала пробуем наш backend
      const params = new URLSearchParams({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        days: days.toString(),
      });

      const data = await this.request(
        `${this.baseURL}/timeseries.php?${params}`
      );

      // Кэшируем результат
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.warn(
        "Backend timeseries API failed, trying external API:",
        error
      );

      // Fallback на встроенные данные (генерируем фиктивные данные)
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

        // Добавляем небольшую случайную вариацию к курсу
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

      // Кэшируем fallback данные
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    }
  }

  /**
   * Получение истории конвертаций
   * @returns {Promise<Array>} - Массив записей истории
   */
  async getHistory() {
    try {
      const data = await this.request(`${this.baseURL}/history.php`);
      return data.history || [];
    } catch (error) {
      console.warn("Backend history API failed, using localStorage:", error);

      // Fallback на localStorage
      const history = this.getHistoryFromStorage();
      return history;
    }
  }

  /**
   * Сохранение записи в историю
   * @param {Object} record - Запись для сохранения
   * @returns {Promise<Object>} - Результат сохранения
   */
  async saveHistory(record) {
    try {
      const data = await this.request(`${this.baseURL}/history.php`, {
        method: "POST",
        body: JSON.stringify(record),
      });
      return data;
    } catch (error) {
      console.warn("Backend history save failed, using localStorage:", error);

      // Fallback на localStorage
      this.saveHistoryToStorage(record);
      return { success: true, message: "Сохранено локально" };
    }
  }

  /**
   * Очистка истории
   * @returns {Promise<Object>} - Результат очистки
   */
  async clearHistory() {
    try {
      const data = await this.request(`${this.baseURL}/history.php`, {
        method: "DELETE",
      });
      return data;
    } catch (error) {
      console.warn("Backend history clear failed, using localStorage:", error);

      // Fallback на localStorage
      this.clearHistoryFromStorage();
      return { success: true, message: "История очищена локально" };
    }
  }

  /**
   * Получение истории из localStorage
   * @returns {Array} - Массив записей истории
   */
  getHistoryFromStorage() {
    try {
      const history = localStorage.getItem("currency_history");
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Error reading history from localStorage:", error);
      return [];
    }
  }

  /**
   * Сохранение записи в localStorage
   * @param {Object} record - Запись для сохранения
   */
  saveHistoryToStorage(record) {
    try {
      const history = this.getHistoryFromStorage();
      history.unshift(record);

      // Ограничиваем историю 50 записями
      if (history.length > 50) {
        history.splice(50);
      }

      localStorage.setItem("currency_history", JSON.stringify(history));
    } catch (error) {
      console.error("Error saving history to localStorage:", error);
    }
  }

  /**
   * Очистка истории в localStorage
   */
  clearHistoryFromStorage() {
    try {
      localStorage.removeItem("currency_history");
    } catch (error) {
      console.error("Error clearing history from localStorage:", error);
    }
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.cache.clear();
  }
}

// Экспортируем экземпляр API
export const currencyAPI = new CurrencyAPI();
