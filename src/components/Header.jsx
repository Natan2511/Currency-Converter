import React from "react";

const Header = ({ theme, onToggleTheme, onToggleHistory }) => {
  return (
    <header className="header">
      <div className="header__container">
        <h1 className="header__title">💱 Currency Converter</h1>
        <div className="header__controls">
          <button
            className="header__history-toggle"
            onClick={onToggleHistory}
            aria-label="Открыть историю"
          >
            <span className="header__history-icon">📊</span>
          </button>
          <button
            className="header__theme-toggle"
            onClick={onToggleTheme}
            aria-label="Переключить тему"
          >
            <span className="header__theme-icon">
              {theme === "dark" ? "🌙" : "☀️"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
