# План выпуска сайта Style of Mind

## Структура каталога

- Расстановки, концепт 0: `v0.1` и `v0.2`; `v0.2` — перенесённая прежняя рабочая `v0.3`.
- Расстановки, концепт 1: `v1.1`, `v1.2` и `v1.3`.
- Расстановки, концепт 2: `v2.1`.
- Расстановки, концепт 3: `v3.1` — перенесённая прежняя версия концепта 2.2.
- Расстановки, концепт 4: `v4.1` и `v4.2`.
- Лендинг, концепт 0: `концеп лендинга/concept-0/v0.1/` и `v0.2/`.

`development/концеп расстановки/concept-2/v2.2/` — устаревший URL. Актуальная версия находится в `concept-3/v3.1/`; старый редирект не восстанавливать.

## Финальные проверки

- Все 21 HTML-файл проверен Chromium на ширинах 1440, 768, 390 и 320 px.
- Проверено 345 локальных ссылок и ресурсов: отсутствующих файлов не обнаружено.
- Проверены 16 отслеживаемых JS-файлов командой `node --check` и 3 inline-скрипта; ошибок синтаксиса нет.
- Галерея сертификатов, FAQ, cookie consent, мобильная навигация и просмотрщик скриншотов проверены интерактивными тестами.
- `CHECK_CONCEPT.ps1` для `v4.1` и `v4.2` проходит; отсутствующих ассетов нет.
- Каталог имеет отдельную кнопку скриншотов у каждой из 11 версий. 33 полностраничных снимка ПК/планшета/телефона хранятся в WebP; общий размер набора после обновления — около 15.49 MiB.
- `robots.txt` разрешает обход сайта и указывает корневой `sitemap.xml`. Sitemap содержит пять canonical production URL: главную, политику конфиденциальности и три страницы форматов/информации. Каталог `development/` исключён.
- `404.html` показывает сообщение и ссылку в каталог без автоматического перенаправления.

## Индексация и аналитика preview

- Все HTML-страницы в `development/` имеют `noindex,nofollow`; preview остаются доступными по прямым ссылкам, но исключены из поиска.
- У preview удалены canonical, meta description, Open Graph, Twitter Cards и JSON-LD. Вложенные `robots.txt` и `sitemap.xml` не используются.
- В `development/` нет GA4, Яндекс Метрики, GTM, рекламных пикселей, tracking-вызовов или баннеров согласия на аналитику. Для локального состояния интерфейса допустим `sessionStorage`.
- Production SEO и изоляцию preview проверяет `tools/seo_checks.mjs`; workflow запускает эту проверку на pull request и на push в `main`, затрагивающих production SEO или `development/`.

## Изображения

Проверены варианты повторного сжатия трёх сертификатов и фотографии онлайн-расстановки. Перекодирование сертификатов не уменьшило размер при исходном разрешении, а для фотографии выигрыш на качестве 90 составил около 9%. Файлы оставлены без изменений: сохранение мелкого текста и деталей важнее небольшого выигрыша.

## Выпуск

Перед каждым выпуском: выполнить `git diff --check`, статический аудит ресурсов/JavaScript, браузерные тесты на четырёх ширинах, проверить публичный GitHub Pages и результат Actions, затем коммитить и пушить только проверенные изменения. Не использовать force push/reset для синхронизации истории.

Основная работа по оформлению завершена; дальше вносить адресные изменения по конкретным дефектам.


## CSS cleanup ? stage 1 (2026-11-18)

- Removed CSS rules with no references in the checked HTML/JavaScript: obsolete arch illustration, unused diagnostic layout pieces, unused intro/quote/note styles, final decorative stars/orbit, and the unused contact-menu arrow.
- Removed unused selectors from grouped rules while preserving selectors still used by the page.
- Merged the two `.contact-menu__panel` declarations into one rule with the currently effective transparent, card-free appearance.
- Simplified `.about-copy` paragraph selectors after removing the unused `.intro-text` exception.
- Validation: tinycss2 parse errors = 0; local Chromium smoke audit covered 1440, 768, 390, and 320 px; horizontal overflow = 0 at all four widths; broken images = 0; console/page errors = 0; failed requests = 0. The smoke audit reports the dynamically assigned `#booking-options` fragment; booking links are intercepted by `js/app.js`.
- No commit or push in this stage.

## CSS cleanup ? stage 3 (2026-11-18)

- Consolidated certificate carousel layout, track, slides, arrows, landscape-image rotation, mobile sizing, and reduced-motion behavior into one rule set.
- Removed superseded carousel declarations and thumbnail CSS: the current HTML has no `.certificate-thumbnail` or `.certificate-thumbnails` elements; the JavaScript optional queries remain unchanged.
- Preserved the effective carousel geometry and styles measured before the refactor.
- Chromium comparison: 1440/768/390/320 px; slide dimensions, track geometry, arrow dimensions, landscape rotation, and active/inactive opacity match the pre-refactor values.
- Functional checks: next arrow advances to slide 2; selecting a slide opens the lightbox; 12 slides detected; page errors = 0; failed requests = 0; horizontal overflow = 0 at all tested widths.
- No commit or push in this stage.

## CSS cleanup ? stage 4 (2026-11-18)

- Merged repeated global `.hero-art` and nested video-preview declarations into their first definitions; responsive media rules remain separate.
- Preserved the effective poster crop, play control size, overlay, border radius, stacking order, and desktop/tablet/mobile positioning.
- Removed the later duplicate reduced-motion rule.
- Chromium comparison at 1440/1024/768/390/320 px: hero frame geometry and computed styles match the pre-refactor values; horizontal overflow = 0; page errors = 0.
- No commit or push in this stage.

## CSS cleanup ? stage 5 (2026-11-18)

- Removed superseded generic format-card declarations and consolidated the active `.formats-section` card, number, icon, title, description, metadata, and button rules.
- Kept diagnostic-offer styling and responsive grid breakpoints separate; preserved card clipping/positioning and title color where those values were not redefined by later rules.
- Chromium comparison at 1440/1280/1024/768/600/390/320 px: grid columns, card geometry, padding, border, typography, icon dimensions, metadata layout, and featured-card background match the pre-refactor computed values.
- Horizontal overflow = 0; page errors = 0 at all seven widths.
- No commit or push in this stage.


## Booking chooser restore (2026-11-18)

- Restored one shared compact vertical list for MAX, Telegram, and WhatsApp.
- Standard booking CTAs keep their service-specific prefilled message for Telegram and WhatsApp.
- The floating quick-contact button now opens the same chooser with the generic booking message.
- The chooser has no heading; each row shows the channel icon and name.
- Updated CSS/JavaScript cache keys to 20261118-booking-list.
- Validation: `node --check js/app.js` = 0 errors; tinycss2 = 0 CSS parse errors; `git diff --check` = clean. Chromium checks at 390 px and 1440 px: standard CTA opens the dialog; floating trigger opens the same dialog without opening its native details panel; 3 channel rows and labels are present; custom and generic Telegram messages are encoded in their respective links; WhatsApp number is correct; close button and Escape close the dialog; page errors = 0; horizontal overflow = false.
- No commit or push.
