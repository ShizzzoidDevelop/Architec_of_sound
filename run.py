#!/usr/bin/env python3
"""
Скрипт для запуска Architecture of Sound
"""

import uvicorn

if __name__ == "__main__":
    print("🚀 Запуск Architecture of Sound...")
    print("📱 Откройте http://localhost:8000 в браузере")
    print("🎵 Погрузись в мир звуковых волн и шейдеров!")
    print("-" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
