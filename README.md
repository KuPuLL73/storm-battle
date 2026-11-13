# Шторм батл — соревнование за лучший дроп

Локальный HTML5-прототип кейс-симулятора: 33 кейса, 73 скина, 10 уровней и премиальные награды, апгрейды, контракты, лобби батлов, аимка с тремя ветками прокачки, подарки и задания. TypeScript, Vite, HTML/CSS, Web Animations и Web Audio.

## Запуск

Нужен Node.js 20.12 или новее.

```powershell
npm install
npm run dev
```

Открыть http://127.0.0.1:5173/ . Реклама локально недоступна, для заработка доступна аимка без рекламы. Прогресс сохраняется в storm-battle.save.v1.

## Проверка

```powershell
npm test
npx playwright install chromium
npm run test:browser
npm run test:progression
npm run test:economy
npm run build
npm run preview
```

Production-просмотр: http://127.0.0.1:4173/ . Браузерные сценарии используют работающий сервер 5173; другой адрес задаётся переменной GAME_URL. Снимки и отчёт — artifacts/storm/. Тесты платформы используют контролируемые SDK callbacks, а не настоящую рекламу. Реальные облачные сохранения и выдача рекламы дополнительно проверяются в черновике Яндекса.

## Подготовка к отправке

`npm run release` создаёт проверенный архив `artifacts/storm-battle-yandex.zip`. `npm run promos` и `npm run capture` готовят актуальные материалы «Шторм батл» в `artifacts/yandex/`: иконку, RU/EN-обложки, реальные скриншоты и MP4. Для записи видео нужен FFmpeg. Записывать материалы после завершения сборки, при работающем `npm run preview`.

[Инструкция отправки](docs/RELEASE-RU.md), [тексты карточки](docs/STORE-LISTING.md), [статус проекта](docs/PROJECT-STATUS-RU.md), [проверки](docs/STORM-QA-RU.md).

[Черновик Яндекса №634880](https://games.yandex.ru/console/application/634880#application-info-draft). Игра не отправлена на модерацию и не опубликована. Коммерческие права на оригинальные изображения CS не подтверждены. В черновике №634880 подтверждены запуск настоящего SDK, Game Ready, I18N и рекламная пауза. Все исходы rewarded, облако на другом устройстве, физические телефоны и заявленная маркировка ещё требуют проверки. Карточки RU/EN и все изображения сохранены; Оба видео обработаны. На модерацию не отправлено.

[Бриф](docs/STORM-BATTLE-BRIEF-RU.md), [требования Яндекса](docs/YANDEX-COMPLIANCE-RU.md), [возраст конкурентов](docs/AGE-RATINGS-RU.md), [источники графики](docs/CS-ASSET-SOURCES-RU.md), [исследование](docs/CASE-RESEARCH-RU.md).

Старый прототип доступен через `/train.html` в dev-сервере. Его инструкция: `docs/TRAIN-PROTOTYPE-README.md`, выпуск: `docs/TRAIN-RELEASE-RU.md`, карточка: `docs/TRAIN-STORE-LISTING.md`. Скрипты `promos:train` и `capture:train`, `artifacts/store/` и `last-carriage-yandex.zip` относятся к поезду.


Обновление 0.1.1: добровольные ×2 монет за задания и ежедневную награду, проверка `npm run test:ad-claims`. Профиль и монетизация: [текущее состояние](docs/MONETIZATION-SETUP-RU.md).

Обновление 0.1.2: выбранный кейс за рекламу, возврат после проигрыша, бонус колеса и редкая межстраничная пауза; `npm run test:ad-flows`. Подробности и честный протокол длительных сессий: [COMPETITOR-ADS-RU.md](docs/COMPETITOR-ADS-RU.md).
