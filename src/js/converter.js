/**
 * Модуль конвертера валют
 * Управляет формой конвертации и отображением результатов
 */

import { currencyAPI } from "./api.js";

class CurrencyConverter {
  constructor() {
    this.form = document.getElementById("converterForm");
    this.fromSelect = document.getElementById("fromCurrency");
    this.toSelect = document.getElementById("toCurrency");
    this.amountInput = document.getElementById("amount");
    this.convertButton = document.getElementById("convertButton");
    this.converterLoader = document.getElementById("converterLoader");
    this.swapButton = document.getElementById("swapCurrencies");
    this.resultContainer = document.getElementById("converterResult");
    this.rateElement = document.getElementById("exchangeRate");
    this.amountElement = document.getElementById("convertedAmount");
    this.dateElement = document.getElementById("conversionDate");

    this.isLoading = false;
    this.symbols = {};
    this.lastConversion = null;

    this.init();
  }

  /**
   * Инициализация конвертера
   */
  async init() {
    await this.loadSymbols();
    this.loadLastCurrencies();
    this.bindEvents();
    this.setupFormValidation();
  }

  /**
   * Загрузка списка валют
   */
  async loadSymbols() {
    try {
      const data = await currencyAPI.getSymbols();
      this.symbols = data.symbols || {};
      this.populateSelects();
    } catch (error) {
      console.error("Error loading symbols:", error);
      this.showError("Не удалось загрузить список валют");
    }
  }

  /**
   * Заполнение селектов валютами
   */
  populateSelects() {
    const options = Object.entries(this.symbols)
      .map(([code, info]) => {
        const name = info.description || info.name || code;
        return `<option value="${code}">${code} - ${name}</option>`;
      })
      .join("");

    this.fromSelect.innerHTML =
      '<option value="">Выберите валюту</option>' + options;
    this.toSelect.innerHTML =
      '<option value="">Выберите валюту</option>' + options;
  }

  /**
   * Загрузка последних выбранных валют из localStorage
   */
  loadLastCurrencies() {
    try {
      const lastFrom = localStorage.getItem("lastFromCurrency");
      const lastTo = localStorage.getItem("lastToCurrency");

      if (lastFrom && this.symbols[lastFrom]) {
        this.fromSelect.value = lastFrom;
      }

      if (lastTo && this.symbols[lastTo]) {
        this.toSelect.value = lastTo;
      }

      // Если не выбраны валюты, устанавливаем популярные по умолчанию
      if (!lastFrom && !lastTo) {
        this.fromSelect.value = "USD";
        this.toSelect.value = "EUR";
      }
    } catch (error) {
      console.error("Error loading last currencies:", error);
    }
  }

  /**
   * Сохранение выбранных валют в localStorage
   */
  saveLastCurrencies() {
    try {
      localStorage.setItem("lastFromCurrency", this.fromSelect.value);
      localStorage.setItem("lastToCurrency", this.toSelect.value);
    } catch (error) {
      console.error("Error saving last currencies:", error);
    }
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.swapButton.addEventListener("click", () => this.swapCurrencies());
    this.fromSelect.addEventListener("change", () => this.saveLastCurrencies());
    this.toSelect.addEventListener("change", () => this.saveLastCurrencies());
    this.amountInput.addEventListener("input", () => this.validateAmount());
  }

  /**
   * Настройка валидации формы
   */
  setupFormValidation() {
    this.amountInput.addEventListener("input", () => {
      const value = parseFloat(this.amountInput.value);
      if (value < 0) {
        this.amountInput.setCustomValidity("Сумма не может быть отрицательной");
      } else {
        this.amountInput.setCustomValidity("");
      }
    });
  }

  /**
   * Валидация суммы
   */
  validateAmount() {
    const value = parseFloat(this.amountInput.value);
    if (value < 0) {
      this.amountInput.setCustomValidity("Сумма не может быть отрицательной");
      return false;
    } else {
      this.amountInput.setCustomValidity("");
      return true;
    }
  }

  /**
   * Обработка отправки формы
   */
  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    const from = this.fromSelect.value;
    const to = this.toSelect.value;
    const amount = parseFloat(this.amountInput.value);

    // Валидация
    if (!from || !to) {
      this.showError("Выберите валюты для конвертации");
      return;
    }

    if (!amount || amount <= 0) {
      this.showError("Введите корректную сумму");
      return;
    }

    if (from === to) {
      this.showError("Исходная и целевая валюты не могут быть одинаковыми");
      return;
    }

    await this.convert(from, to, amount);
  }

  /**
   * Выполнение конвертации
   */
  async convert(from, to, amount) {
    this.setLoading(true);
    this.hideResult();

    try {
      const result = await currencyAPI.convert(from, to, amount);
      this.lastConversion = result;
      this.displayResult(result);
      this.saveLastCurrencies();

      // Сохраняем в историю
      await this.saveToHistory(result);

      // Уведомляем другие модули о новой конвертации
      this.dispatchConversionEvent(result);
    } catch (error) {
      console.error("Conversion error:", error);
      this.showError(error.message || "Ошибка при конвертации валют");
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Отображение результата конвертации
   */
  displayResult(result) {
    const fromSymbol = this.symbols[result.from]?.symbol || result.from;
    const toSymbol = this.symbols[result.to]?.symbol || result.to;

    this.rateElement.textContent = `1 ${result.from} = ${result.rate.toFixed(
      6
    )} ${result.to}`;
    this.amountElement.textContent = `${result.result.toFixed(2)} ${toSymbol}`;
    this.dateElement.textContent = `Курс на ${new Date(
      result.date
    ).toLocaleString("ru-RU")}`;

    this.resultContainer.classList.add("converter__result--visible");
    this.resultContainer.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  /**
   * Скрытие результата
   */
  hideResult() {
    this.resultContainer.classList.remove("converter__result--visible");
  }

  /**
   * Показ ошибки
   */
  showError(message) {
    this.rateElement.textContent = "";
    this.amountElement.textContent = message;
    this.dateElement.textContent = "";
    this.amountElement.style.color = "var(--accent-error)";

    this.resultContainer.classList.add("converter__result--visible");

    // Возвращаем обычный цвет через 3 секунды
    setTimeout(() => {
      this.amountElement.style.color = "";
    }, 3000);
  }

  /**
   * Установка состояния загрузки
   */
  setLoading(loading) {
    this.isLoading = loading;

    if (loading) {
      this.convertButton.disabled = true;
      this.convertButton.classList.add("converter--loading");
    } else {
      this.convertButton.disabled = false;
      this.convertButton.classList.remove("converter--loading");
    }
  }

  /**
   * Обмен валют местами
   */
  swapCurrencies() {
    const fromValue = this.fromSelect.value;
    const toValue = this.toSelect.value;

    this.fromSelect.value = toValue;
    this.toSelect.value = fromValue;

    this.saveLastCurrencies();
    this.hideResult();

    // Анимация кнопки
    this.swapButton.style.transform = "rotate(180deg)";
    setTimeout(() => {
      this.swapButton.style.transform = "";
    }, 300);
  }

  /**
   * Сохранение в историю
   */
  async saveToHistory(result) {
    try {
      const historyRecord = {
        from: result.from,
        to: result.to,
        amount: result.amount,
        result: result.result,
        rate: result.rate,
        date: result.date,
      };

      await currencyAPI.saveHistory(historyRecord);
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  }

  /**
   * Отправка события о новой конвертации
   */
  dispatchConversionEvent(result) {
    const event = new CustomEvent("currencyConverted", {
      detail: result,
    });
    document.dispatchEvent(event);
  }

  /**
   * Получение последней конвертации
   */
  getLastConversion() {
    return this.lastConversion;
  }

  /**
   * Установка валют для конвертации
   */
  setCurrencies(from, to) {
    if (this.symbols[from]) {
      this.fromSelect.value = from;
    }
    if (this.symbols[to]) {
      this.toSelect.value = to;
    }
    this.saveLastCurrencies();
  }

  /**
   * Установка суммы
   */
  setAmount(amount) {
    this.amountInput.value = amount;
  }

  /**
   * Получение текущих значений формы
   */
  getFormData() {
    return {
      from: this.fromSelect.value,
      to: this.toSelect.value,
      amount: parseFloat(this.amountInput.value) || 0,
    };
  }
}

// Экспортируем класс
export { CurrencyConverter };
