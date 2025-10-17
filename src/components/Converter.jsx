import React, { useState, useEffect, useRef } from "react";

const Converter = ({ currencyAPI, sharedCurrencies, onCurrencyChange }) => {
  const [symbols, setSymbols] = useState({});
  const [fromCurrency, setFromCurrency] = useState("RUB");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentRate, setCurrentRate] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    loadSymbols();
    loadLastCurrencies();
  }, []);

  useEffect(() => {
    if (fromCurrency && toCurrency && Object.keys(symbols).length > 0) {
      loadCurrentRate();
    }
  }, [fromCurrency, toCurrency, symbols]);

  // Синхронизация с общими валютами
  useEffect(() => {
    if (sharedCurrencies) {
      setFromCurrency(sharedCurrencies.from);
      setToCurrency(sharedCurrencies.to);
    }
  }, [sharedCurrencies]);

  const loadSymbols = async () => {
    try {
      const data = await currencyAPI.getSymbols();
      if (data.success && data.symbols) {
        setSymbols(data.symbols);
      }
    } catch (error) {
      console.error("Error loading symbols:", error);
    }
  };

  const loadCurrentRate = async () => {
    try {
      const data = await currencyAPI.convert(fromCurrency, toCurrency, 1);
      if (data.success && data.result) {
        setCurrentRate(data.result);
      }
    } catch (error) {
      console.error("Error loading current rate:", error);
      setCurrentRate(null);
    }
  };

  const scrollToResult = () => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  };

  const loadLastCurrencies = () => {
    const lastFrom = localStorage.getItem("lastFromCurrency");
    const lastTo = localStorage.getItem("lastToCurrency");
    if (lastFrom) setFromCurrency(lastFrom);
    if (lastTo) setToCurrency(lastTo);
  };

  const saveLastCurrencies = () => {
    localStorage.setItem("lastFromCurrency", fromCurrency);
    localStorage.setItem("lastToCurrency", toCurrency);
  };

  const handleConvert = async () => {
    if (!amount || amount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await currencyAPI.convert(
        fromCurrency,
        toCurrency,
        parseFloat(amount)
      );
      if (data.success) {
        setResult(data);
        saveLastCurrencies();

        // Сохраняем в историю
        await currencyAPI.saveHistory({
          date: new Date().toISOString(),
          from: data.from,
          to: data.to,
          amount: data.amount,
          result: data.result,
          rate: data.rate,
        });

        // Прокручиваем к результату с небольшой задержкой для анимации
        setTimeout(() => {
          scrollToResult();
        }, 100);
      } else {
        setError(data.error || "Ошибка конвертации");
      }
    } catch (error) {
      setError(error.message || "Ошибка при конвертации");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const newFrom = toCurrency;
    const newTo = fromCurrency;
    setFromCurrency(newFrom);
    setToCurrency(newTo);
    setResult(null);
    setError("");
    // Уведомляем о изменении валют
    if (onCurrencyChange) {
      onCurrencyChange(newFrom, newTo);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setResult(null);
      setError("");
    }
  };

  return (
    <div className="converter">
      <h2 className="converter__title">Конвертер валют</h2>

      <div className="converter__form">
        <div className="converter__row">
          <div className="converter__group">
            <label className="converter__label">Из валюты</label>
            <select
              className="converter__select"
              value={fromCurrency}
              onChange={(e) => {
                setFromCurrency(e.target.value);
                if (onCurrencyChange) {
                  onCurrencyChange(e.target.value, toCurrency);
                }
              }}
            >
              {Object.entries(symbols).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} - {info.description}
                </option>
              ))}
            </select>
          </div>

          <button
            className="converter__swap"
            onClick={handleSwap}
            aria-label="Поменять валюты местами"
          >
            <div className="converter__swap-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 3h5v5" />
                <path d="M8 21H3v-5" />
                <path d="M21 3l-7 7-4-4" />
                <path d="M3 21l7-7 4 4" />
              </svg>
            </div>
          </button>

          <div className="converter__group">
            <label className="converter__label">В валюту</label>
            <select
              className="converter__select"
              value={toCurrency}
              onChange={(e) => {
                setToCurrency(e.target.value);
                if (onCurrencyChange) {
                  onCurrencyChange(fromCurrency, e.target.value);
                }
              }}
            >
              {Object.entries(symbols).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} - {info.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Текущий курс */}
        {currentRate && (
          <div className="converter__rate">
            <div className="converter__rate-label">Текущий курс:</div>
            <div className="converter__rate-value">
              1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
            </div>
          </div>
        )}

        <div className="converter__group">
          <label className="converter__label">Сумма</label>
          <input
            type="text"
            className="converter__input"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Введите сумму"
          />
        </div>

        <button
          className="converter__convert"
          onClick={handleConvert}
          disabled={loading || !amount}
        >
          {loading ? "Конвертация..." : "Конвертировать"}
        </button>

        {error && <div className="converter__error">{error}</div>}

        {result && (
          <div className="converter__result" ref={resultRef}>
            <div className="converter__result-amount">
              {result.result.toLocaleString()} {result.to}
            </div>
            <div className="converter__result-rate">
              Курс: 1 {result.from} = {result.rate} {result.to}
            </div>
            <div className="converter__result-date">
              {new Date(result.date).toLocaleString("ru-RU")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Converter;
