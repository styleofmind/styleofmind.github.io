# Локальный просмотр сайта

## Открыть сайт

Дважды щёлкните `open_site_local.bat`. Если локальный сервер ещё не запущен, он стартует автоматически. Страница откроется в браузере по адресу:

`http://127.0.0.1:8000/`

Сервер доступен только на этом компьютере. Чтобы остановить его, закройте окно **Style of Mind Preview** или нажмите в нём Ctrl+C.

## Проверить сайт на разных экранах

Дважды щёлкните `check_site.bat`.

Автотест откроет страницу в Chromium на размерах 1440×900, 768×1024, 390×844 и 320×740, проверит горизонтальное переполнение, якоря, изображения и ошибки браузера.

Отчёт и полностраничные скриншоты сохраняются в папку `../site-audit` рядом с репозиторием.

## Запуск из PowerShell

В корне репозитория выполните:

```powershell
# Локальный предпросмотр
.\.venv\Scripts\python.exe .\tools\site_tools.py preview --page concepts/concept-1/v1.2 --port 8000

# Автопроверка и скриншоты
.\.venv\Scripts\python.exe .\tools\site_tools.py audit

# Проверить другую HTML-страницу
.\.venv\Scripts\python.exe .\tools\site_tools.py audit --page index.html
```

## Окружение разработки

Инструменты используют Python 3.12 в локальной папке `.venv`. Виртуальное окружение и кеши не включаются в Git.

Установленные пакеты: Playwright + Chromium, Requests, BeautifulSoup4, lxml, html5lib, tinycss2, cssutils, pytest, Pillow и Rich.

Для восстановления окружения:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-audit.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```
