/**
 * Главный модуль приложения
 * Инициализирует все компоненты и управляет общим состоянием
 */

import { CurrencyConverter } from "./converter.js";
import { ConversionHistory } from "./history.js";
import { currencyAPI } from "./api.js";

class CurrencyApp {
  constructor() {
    this.converter = null;
    this.history = null;
    this.chart = null;
    this.isInitialized = false;

    this.init();
  }

  /**
   * Инициализация приложения
   */
  async init() {
    try {
      // Инициализируем тему
      this.initTheme();

      // Инициализируем компоненты
      await this.initComponents();

      // Инициализируем график
      await this.initChart();

      // Привязываем глобальные события
      this.bindGlobalEvents();

      this.isInitialized = true;
      console.log("Currency Converter app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showInitError(error);
    }
  }

  /**
   * Инициализация темы
   */
  initTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = themeToggle.querySelector(".header__theme-icon");

    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem("theme") || "light";
    this.setTheme(savedTheme);

    // Привязываем переключатель темы
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      this.setTheme(newTheme);
    });
  }

  /**
   * Установка темы
   */
  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    const themeIcon = document.querySelector(".header__theme-icon");
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  /**
   * Инициализация компонентов
   */
  async initComponents() {
    // Инициализируем конвертер
    this.converter = new CurrencyConverter();

    // Инициализируем историю
    this.history = new ConversionHistory();
  }

  /**
   * Инициализация графика
   */
  async initChart() {
    try {
      // Динамически импортируем Chart.js
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      this.chart = new ChartManager(Chart);
      await this.chart.init();
    } catch (error) {
      console.warn(
        "Chart.js not available, chart functionality disabled:",
        error
      );
      this.hideChartSection();
    }
  }

  /**
   * Скрытие секции графика
   */
  hideChartSection() {
    const chartSection = document.getElementById("chartSection");
    if (chartSection) {
      chartSection.style.display = "none";
    }
  }

  /**
   * Привязка глобальных событий
   */
  bindGlobalEvents() {
    // Обработка ошибок сети
    window.addEventListener("online", () => {
      this.showNotification("Соединение восстановлено", "success");
      this.refreshData();
    });

    window.addEventListener("offline", () => {
      this.showNotification("Соединение потеряно", "warning");
    });

    // Обработка ошибок JavaScript
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      this.showNotification("Произошла ошибка приложения", "error");
    });

    // Обработка необработанных промисов
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      this.showNotification("Произошла ошибка при загрузке данных", "error");
    });
  }

  /**
   * Обновление данных
   */
  async refreshData() {
    try {
      // Очищаем кэш API
      currencyAPI.clearCache();

      // Перезагружаем символы валют
      if (this.converter) {
        await this.converter.loadSymbols();
      }

      // Перезагружаем историю
      if (this.history) {
        await this.history.loadHistory();
      }

      // Обновляем график
      if (this.chart) {
        await this.chart.refresh();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }

  /**
   * Показ ошибки инициализации
   */
  showInitError(error) {
    const app = document.querySelector(".app");
    app.innerHTML = `
      <div class="error-screen">
        <div class="error-screen__content">
          <h1 class="error-screen__title">Ошибка загрузки</h1>
          <p class="error-screen__message">Не удалось инициализировать приложение</p>
          <p class="error-screen__details">${error.message}</p>
          <button class="error-screen__retry" onclick="location.reload()">
            Попробовать снова
          </button>
        </div>
      </div>
    `;

    // Добавляем стили для экрана ошибки
    const style = document.createElement("style");
    style.textContent = `
      .error-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: var(--bg-secondary);
        padding: 2rem;
      }
      
      .error-screen__content {
        text-align: center;
        max-width: 500px;
        background: var(--bg-primary);
        padding: 3rem;
        border-radius: 1rem;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-primary);
      }
      
      .error-screen__title {
        font-size: 2rem;
        font-weight: bold;
        color: var(--accent-error);
        margin-bottom: 1rem;
      }
      
      .error-screen__message {
        font-size: 1.125rem;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }
      
      .error-screen__details {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 2rem;
        font-family: monospace;
        background: var(--bg-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        word-break: break-all;
      }
      
      .error-screen__retry {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .error-screen__retry:hover {
        background: var(--accent-secondary);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Показ уведомления
   */
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    // Стили уведомления
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: var(--shadow-lg);
    `;

    // Цвета в зависимости от типа
    const colors = {
      success: "var(--accent-success)",
      error: "var(--accent-error)",
      warning: "var(--accent-warning)",
      info: "var(--accent-primary)",
    };

    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Автоматическое скрытие
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Получение экземпляра приложения
   */
  static getInstance() {
    if (!window.currencyApp) {
      window.currencyApp = new CurrencyApp();
    }
    return window.currencyApp;
  }
}

/**
 * Менеджер графиков
 */
class ChartManager {
  constructor(Chart) {
    this.Chart = Chart;
    this.chart = null;
    this.canvas = document.getElementById("currencyChart");
    this.periodSelect = document.getElementById("chartPeriod");
    this.currentFrom = "USD";
    this.currentTo = "EUR";
  }

  /**
   * Инициализация графика
   */
  async init() {
    if (!this.canvas) return;

    this.bindEvents();
    await this.loadChartData();
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    // Слушаем изменения валют
    document.addEventListener("currencyConverted", (e) => {
      this.currentFrom = e.detail.from;
      this.currentTo = e.detail.to;
      this.loadChartData();
    });

    // Слушаем изменения периода
    if (this.periodSelect) {
      this.periodSelect.addEventListener("change", () => {
        this.loadChartData();
      });
    }
  }

  /**
   * Загрузка данных для графика
   */
  async loadChartData() {
    if (!this.canvas) return;

    const days = parseInt(this.periodSelect?.value || 30);

    try {
      const data = await currencyAPI.getTimeSeries(
        this.currentFrom,
        this.currentTo,
        days
      );
      this.updateChart(data);
    } catch (error) {
      console.error("Error loading chart data:", error);
      this.showChartError();
    }
  }

  /**
   * Обновление графика
   */
  updateChart(data) {
    const ctx = this.canvas.getContext("2d");

    // Уничтожаем предыдущий график
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = Object.keys(data.rates).sort();
    const values = labels.map((date) => data.rates[date]);

    this.chart = new this.Chart(ctx, {
      type: "line",
      data: {
        labels: labels.map((date) =>
          new Date(date).toLocaleDateString("ru-RU")
        ),
        datasets: [
          {
            label: `${data.from} → ${data.to}`,
            data: values,
            borderColor: "var(--accent-primary)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "var(--accent-primary)",
            pointBorderColor: "white",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: "var(--border-primary)",
            },
            ticks: {
              color: "var(--text-secondary)",
            },
          },
          y: {
            grid: {
              color: "var(--border-primary)",
            },
            ticks: {
              color: "var(--text-secondary)",
              callback: function (value) {
                return value.toFixed(4);
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  }

  /**
   * Показ ошибки графика
   */
  showChartError() {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "var(--text-secondary)";
    ctx.font = "16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Не удалось загрузить данные графика",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  /**
   * Обновление графика
   */
  async refresh() {
    await this.loadChartData();
  }
}

// Инициализируем приложение при загрузке DOM
document.addEventListener("DOMContentLoaded", () => {
  CurrencyApp.getInstance();
});

// Экспортируем для глобального доступа
window.CurrencyApp = CurrencyApp;
