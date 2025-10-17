import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Converter from "./components/Converter";
import History from "./components/History";
import Chart from "./components/Chart";
import { CurrencyAPI } from "./services/api";

function App() {
  const [theme, setTheme] = useState("dark");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currencyAPI] = useState(() => new CurrencyAPI());
  const [sharedCurrencies, setSharedCurrencies] = useState({
    from: "RUB",
    to: "USD",
  });

  useEffect(() => {
    // Инициализация темы
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const toggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const updateSharedCurrencies = (from, to) => {
    setSharedCurrencies({ from, to });
  };

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleHistory={toggleHistory}
      />
      <main className="main">
        <div className="main__grid">
          {/* Конвертер на всю ширину */}
          <div className="main__row main__row--converter">
            <Converter
              currencyAPI={currencyAPI}
              sharedCurrencies={sharedCurrencies}
              onCurrencyChange={updateSharedCurrencies}
            />
          </div>
          {/* График на всю ширину */}
          <div className="main__row main__row--chart">
            <Chart
              currencyAPI={currencyAPI}
              sharedCurrencies={sharedCurrencies}
              onCurrencyChange={updateSharedCurrencies}
            />
          </div>
        </div>
      </main>

      {/* Модальное окно истории */}
      {isHistoryOpen && (
        <div className="modal-overlay" onClick={toggleHistory}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">История конвертаций</h2>
              <button
                className="modal__close"
                onClick={toggleHistory}
                aria-label="Закрыть"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal__content">
              <History currencyAPI={currencyAPI} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
