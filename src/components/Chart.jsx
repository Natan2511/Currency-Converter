import React, { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Chart = ({ currencyAPI, sharedCurrencies, onCurrencyChange }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("7");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [symbols, setSymbols] = useState({});
  const chartRef = useRef(null);

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    if (Object.keys(symbols).length > 0) {
      loadChartData();
    }
  }, [period, fromCurrency, toCurrency, symbols]);

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

  const loadChartData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await currencyAPI.getTimeSeries(
        fromCurrency,
        toCurrency,
        parseInt(period)
      );

      if (data && data.rates) {
        const labels = Object.keys(data.rates).sort();
        const values = labels.map((date) => data.rates[date]);

        const chartConfig = {
          labels,
          datasets: [
            {
              label: `${fromCurrency} → ${toCurrency}`,
              data: values,
              borderColor: "#4fd1c5",
              backgroundColor: "rgba(79, 209, 197, 0.15)",
              borderWidth: 4,
              fill: true,
              tension: 0.6,
              pointBackgroundColor: "#4fd1c5",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 3,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: "#4fd1c5",
              pointHoverBorderWidth: 3,
              shadowOffsetX: 0,
              shadowOffsetY: 4,
              shadowBlur: 10,
              shadowColor: "rgba(79, 209, 197, 0.3)",
            },
          ],
        };

        setChartData(chartConfig);
      } else {
        setError("Не удалось загрузить данные для графика");
      }
    } catch (error) {
      setError("Ошибка при загрузке данных графика");
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(22, 27, 34, 0.98)",
        titleColor: "#f0f6fc",
        bodyColor: "#f0f6fc",
        borderColor: "#4fd1c5",
        borderWidth: 2,
        cornerRadius: 16,
        displayColors: false,
        titleFont: {
          size: 15,
          weight: "bold",
        },
        bodyFont: {
          size: 14,
          weight: "500",
        },
        padding: 16,
        shadowOffsetX: 0,
        shadowOffsetY: 8,
        shadowBlur: 20,
        shadowColor: "rgba(0, 0, 0, 0.3)",
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
            });
          },
          label: (context) => {
            return `1 ${fromCurrency} = ${context.parsed.y.toFixed(
              4
            )} ${toCurrency}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(48, 54, 61, 0.15)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          color: "#8b949e",
          maxTicksLimit: 8,
          font: {
            size: 12,
            weight: "500",
          },
          padding: 8,
          callback: function (value, index, ticks) {
            const date = new Date(this.getLabelForValue(value));
            return date.toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
            });
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "rgba(48, 54, 61, 0.15)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          color: "#8b949e",
          font: {
            size: 12,
            weight: "500",
          },
          padding: 8,
          callback: function (value) {
            return value.toFixed(4);
          },
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    elements: {
      point: {
        hoverRadius: 10,
        hoverBorderWidth: 4,
        hoverBackgroundColor: "#ffffff",
        hoverBorderColor: "#4fd1c5",
      },
      line: {
        borderWidth: 4,
        tension: 0.6,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowBlur: 10,
        shadowColor: "rgba(79, 209, 197, 0.3)",
      },
    },
    animation: {
      duration: 2000,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="chart">
      <div className="chart__header">
        <h2 className="chart__title">График курсов</h2>
        <div className="chart__controls">
          <select
            className="chart__select"
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
                {code}
              </option>
            ))}
          </select>

          <span className="chart__arrow">→</span>

          <select
            className="chart__select"
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
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart__period-controls">
        <button
          className={`chart__period ${
            period === "7" ? "chart__period--active" : ""
          }`}
          onClick={() => setPeriod("7")}
        >
          7 дней
        </button>
        <button
          className={`chart__period ${
            period === "30" ? "chart__period--active" : ""
          }`}
          onClick={() => setPeriod("30")}
        >
          30 дней
        </button>
        <button
          className={`chart__period ${
            period === "90" ? "chart__period--active" : ""
          }`}
          onClick={() => setPeriod("90")}
        >
          90 дней
        </button>
      </div>

      <div className="chart__container">
        {loading ? (
          <div className="chart__loading">
            <div className="chart__loading-spinner"></div>
            Загрузка графика...
          </div>
        ) : error ? (
          <div className="chart__error">
            <div className="chart__error-icon">📈</div>
            <div className="chart__error-text">{error}</div>
            <div className="chart__error-subtext">
              Попробуйте выбрать другие валюты или период
            </div>
          </div>
        ) : chartData ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div className="chart__empty">
            <div className="chart__empty-icon">📊</div>
            <div className="chart__empty-text">Нет данных</div>
            <div className="chart__empty-subtext">
              Выберите валюты для отображения графика
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chart;
