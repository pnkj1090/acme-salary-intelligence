from typing import Dict, List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ACME Salary Intelligence"
    DATABASE_URL: str = "sqlite:///./acme_salary.db"

    # Allowed CORS origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Standard benchmark currency exchange rates to USD for normalized global reporting
    # 1 Foreign Currency Unit = X USD
    EXCHANGE_RATES_TO_USD: Dict[str, float] = {
        "USD": 1.0,
        "EUR": 1.08,
        "GBP": 1.30,
        "CAD": 0.74,
        "AUD": 0.67,
        "JPY": 0.0067,
        "INR": 0.012,
    }

    # Supported countries and currencies
    SUPPORTED_COUNTRIES: Dict[str, str] = {
        "US": "United States",
        "GB": "United Kingdom",
        "DE": "Germany",
        "JP": "Japan",
        "CA": "Canada",
        "AU": "Australia",
        "IN": "India",
    }

    COUNTRY_TO_CURRENCY: Dict[str, str] = {
        "US": "USD",
        "GB": "GBP",
        "DE": "EUR",
        "JP": "JPY",
        "CA": "CAD",
        "AU": "AUD",
        "IN": "INR",
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
