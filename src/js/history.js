/**
 * Модуль истории конвертаций
 * Управляет отображением и управлением историей операций
 */

import { currencyAPI } from "./api.js";

class ConversionHistory {
  constructor() {
    this.historyContainer = document.getElementById("historyTableContainer");
    this.historyTableBody = document.getElementById("historyTableBody");
    this.historyLoading = document.getElementById("historyLoading");
    this.historyEmpty = document.getElementById("historyEmpty");
    this.clearButton = document.getElementById("clearHistory");

    this.history = [];
    this.isLoading = false;
    this.maxRecords = 10;

    this.init();
  }

  /**
   * Инициализация модуля истории
   */
  async init() {
    this.bindEvents();
    await this.loadHistory();
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    this.clearButton.addEventListener("click", () => this.clearHistory());

    // Слушаем события новых конвертаций
    document.addEventListener("currencyConverted", (e) => {
      this.addNewRecord(e.detail);
    });
  }

  /**
   * Загрузка истории
   */
  async loadHistory() {
    this.setLoading(true);
    this.hideContent();

    try {
      this.history = await currencyAPI.getHistory();
      this.displayHistory();
    } catch (error) {
      console.error("Error loading history:", error);
      this.showError("Не удалось загрузить историю конвертаций");
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Отображение истории
   */
  displayHistory() {
    if (this.history.length === 0) {
      this.showEmpty();
      return;
    }

    this.hideEmpty();
    this.renderHistoryTable();
  }

  /**
   * Рендеринг таблицы истории
   */
  renderHistoryTable() {
    const limitedHistory = this.history.slice(0, this.maxRecords);

    this.historyTableBody.innerHTML = limitedHistory
      .map((record, index) => this.createHistoryRow(record, index === 0))
      .join("");

    this.historyContainer.style.display = "block";
  }

  /**
   * Создание строки истории
   */
  createHistoryRow(record, isNew = false) {
    const date = new Date(record.date);
    const formattedDate = date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rowClass = isNew ? "history__row--new" : "";

    return `
      <tr class="history__row ${rowClass}">
        <td class="history__td">${formattedDate}</td>
        <td class="history__td">${record.from}</td>
        <td class="history__td">${record.to}</td>
        <td class="history__td">${this.formatAmount(record.amount)}</td>
        <td class="history__td">${this.formatAmount(record.result)}</td>
      </tr>
    `;
  }

  /**
   * Форматирование суммы
   */
  formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0.00";

    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
    } else {
      return num.toFixed(2);
    }
  }

  /**
   * Добавление новой записи
   */
  addNewRecord(record) {
    // Добавляем в начало массива
    this.history.unshift(record);

    // Ограничиваем количество записей
    if (this.history.length > 50) {
      this.history.splice(50);
    }

    // Обновляем отображение
    this.displayHistory();
  }

  /**
   * Очистка истории
   */
  async clearHistory() {
    if (!confirm("Вы уверены, что хотите очистить историю конвертаций?")) {
      return;
    }

    try {
      await currencyAPI.clearHistory();
      this.history = [];
      this.displayHistory();

      // Показываем уведомление
      this.showNotification("История конвертаций очищена", "success");
    } catch (error) {
      console.error("Error clearing history:", error);
      this.showNotification("Ошибка при очистке истории", "error");
    }
  }

  /**
   * Установка состояния загрузки
   */
  setLoading(loading) {
    this.isLoading = loading;

    if (loading) {
      this.historyLoading.style.display = "flex";
    } else {
      this.historyLoading.style.display = "none";
    }
  }

  /**
   * Скрытие всего контента
   */
  hideContent() {
    this.historyContainer.style.display = "none";
    this.historyEmpty.style.display = "none";
  }

  /**
   * Показ пустого состояния
   */
  showEmpty() {
    this.historyContainer.style.display = "none";
    this.historyEmpty.style.display = "flex";
  }

  /**
   * Скрытие пустого состояния
   */
  hideEmpty() {
    this.historyEmpty.style.display = "none";
  }

  /**
   * Показ ошибки
   */
  showError(message) {
    this.hideContent();

    // Создаем элемент ошибки
    const errorElement = document.createElement("div");
    errorElement.className = "history__error";
    errorElement.innerHTML = `
      <div class="history__error-icon">⚠️</div>
      <p class="history__error-text">${message}</p>
      <button class="history__retry" onclick="location.reload()">Попробовать снова</button>
    `;

    // Добавляем стили для ошибки
    errorElement.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
      color: var(--accent-error);
    `;

    this.historyContainer.parentNode.appendChild(errorElement);
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
   * Получение истории
   */
  getHistory() {
    return this.history;
  }

  /**
   * Установка максимального количества записей
   */
  setMaxRecords(max) {
    this.maxRecords = max;
    this.displayHistory();
  }

  /**
   * Экспорт истории в CSV
   */
  exportToCSV() {
    if (this.history.length === 0) {
      this.showNotification("История пуста", "warning");
      return;
    }

    const headers = [
      "Дата",
      "Из валюты",
      "В валюту",
      "Сумма",
      "Результат",
      "Курс",
    ];
    const csvContent = [
      headers.join(","),
      ...this.history.map((record) => {
        const date = new Date(record.date).toLocaleString("ru-RU");
        return [
          `"${date}"`,
          record.from,
          record.to,
          record.amount,
          record.result,
          record.rate,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `currency_history_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotification("История экспортирована", "success");
  }

  /**
   * Фильтрация истории
   */
  filterHistory(filter) {
    if (!filter) {
      this.displayHistory();
      return;
    }

    const filtered = this.history.filter(
      (record) =>
        record.from.toLowerCase().includes(filter.toLowerCase()) ||
        record.to.toLowerCase().includes(filter.toLowerCase())
    );

    this.historyTableBody.innerHTML = filtered
      .slice(0, this.maxRecords)
      .map((record) => this.createHistoryRow(record))
      .join("");

    if (filtered.length === 0) {
      this.showEmpty();
    } else {
      this.hideEmpty();
      this.historyContainer.style.display = "block";
    }
  }
}

// Экспортируем класс
export { ConversionHistory };
