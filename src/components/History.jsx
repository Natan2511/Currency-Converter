import React, { useState, useEffect } from "react";

const History = ({ currencyAPI }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await currencyAPI.getHistory();
      if (data.success && data.history) {
        setHistory(data.history);
      } else {
        setError("Не удалось загрузить историю");
      }
    } catch (error) {
      setError("Ошибка при загрузке истории");
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (window.confirm("Вы уверены, что хотите очистить историю?")) {
      try {
        // Очищаем localStorage
        localStorage.removeItem("currencyHistory");
        setHistory([]);
        setError("");
      } catch (error) {
        setError("Ошибка при очистке истории");
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="history">
        <div className="history__loading">
          <div className="history__loading-spinner"></div>
          Загрузка истории...
        </div>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history__header">
        {history.length > 0 && (
          <button className="history__clear" onClick={clearHistory}>
            Очистить
          </button>
        )}
      </div>

      <div className="history__content">
        {error && <div className="history__error">{error}</div>}

        {history.length === 0 ? (
          <div className="history__empty">
            <div className="history__empty-icon">📊</div>
            <div className="history__empty-text">История пуста</div>
            <div className="history__empty-subtext">
              Выполните конвертацию, чтобы увидеть историю операций
            </div>
          </div>
        ) : (
          <>
            {/* Десктопная таблица */}
            <div className="history__table-wrapper">
              <table className="history__table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Из</th>
                    <th>В</th>
                    <th>Сумма</th>
                    <th>Результат</th>
                    <th>Курс</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={index} className="history__row">
                      <td className="history__row-date">
                        {formatDate(item.date)}
                      </td>
                      <td className="history__row-from">{item.from}</td>
                      <td className="history__row-to">{item.to}</td>
                      <td className="history__row-amount">{item.amount}</td>
                      <td className="history__row-result">
                        {item.result.toLocaleString()}
                      </td>
                      <td className="history__row-rate">{item.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильные карточки */}
            <div className="history__mobile-cards">
              {history.map((item, index) => (
                <div key={index} className="history__card">
                  <div className="history__card-header">
                    <div className="history__card-date">
                      {formatDate(item.date)}
                    </div>
                    <div className="history__card-rate">Курс: {item.rate}</div>
                  </div>
                  <div className="history__card-body">
                    <div className="history__card-item">
                      <div className="history__card-label">Из валюты</div>
                      <div className="history__card-value history__card-value--from">
                        {item.amount} {item.from}
                      </div>
                    </div>
                    <div className="history__card-item">
                      <div className="history__card-label">В валюту</div>
                      <div className="history__card-value history__card-value--to">
                        {item.to}
                      </div>
                    </div>
                    <div className="history__card-item">
                      <div className="history__card-label">Результат</div>
                      <div className="history__card-value history__card-value--result">
                        {item.result.toLocaleString()} {item.to}
                      </div>
                    </div>
                    <div className="history__card-item">
                      <div className="history__card-label">Курс</div>
                      <div className="history__card-value">
                        1 {item.from} = {item.rate} {item.to}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default History;
