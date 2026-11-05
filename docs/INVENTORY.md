# Инвентаризация проектов adleibzon-rgb

Обход на 04.11.2026: 20 проектов. Все репозитории на GitHub сейчас публичные; на сайте доступ задаёт администратор (открытый / для клиентов / скрыт).

| Проект | Категория | Язык | Файлов | Объём | Коммитов* | Обновлён | Docker | Скриншоты | Установка одной командой |
|---|---|---|---:|---:|---:|---|---|---:|---|
| [keenetic_ssh](https://github.com/adleibzon-rgb/keenetic_ssh) | Keenetic | Python | 15 | 974.9 КБ | 9 | 30.05.2026 | — | 1 | да |
| [keenetic_ssh-web](https://github.com/adleibzon-rgb/keenetic_ssh-web) | Keenetic | Shell | 33 | 251.8 КБ | 36 | 30.05.2026 | — | 5 | да |
| [keenetic-dns-routes](https://github.com/adleibzon-rgb/keenetic-dns-routes) | Keenetic | Python | 17 | 102.2 КБ | 23 | 30.05.2026 | — | 0 | да |
| [keenetic-split-dns](https://github.com/adleibzon-rgb/keenetic-split-dns) | Keenetic | HTML | 25 | 338.7 КБ | 5 | 24.05.2026 | — | 3 | да |
| [pcatelegram_web](https://github.com/adleibzon-rgb/pcatelegram_web) | Telegram | Shell | 34 | 1.5 МБ | 23 | 07.06.2026 | — | 3 | да |
| [amnezia_web](https://github.com/adleibzon-rgb/amnezia_web) | VPN | JavaScript | 23 | 3.0 МБ | 61 | 19.09.2026 | да | 2 | да |
| [amnezia_web-pro](https://github.com/adleibzon-rgb/amnezia_web-pro) | VPN | JavaScript | 54 | 3.4 МБ | 88 | 23.10.2026 | да | 4 | да |
| [amnezia_web-pro-github-mirror](https://github.com/adleibzon-rgb/amnezia_web-pro-github-mirror) | VPN | JavaScript | 51 | 3.1 МБ | 83 | 22.10.2026 | да | 2 | да |
| [amnezia-web-pro-deploy](https://github.com/adleibzon-rgb/amnezia-web-pro-deploy) | VPN | Shell | 13 | 2.7 МБ | 20 | 06.06.2026 | да | 0 | — |
| [kaskad](https://github.com/adleibzon-rgb/kaskad) | VPN | Python | 26 | 160.2 КБ | 10 | 30.05.2026 | — | 0 | да |
| [kaskad_web_vpn](https://github.com/adleibzon-rgb/kaskad_web_vpn) | VPN | Python | 18 | 1.4 МБ | 15 | 17.05.2026 | да | 1 | да |
| [pca_phobos](https://github.com/adleibzon-rgb/pca_phobos) | VPN | Python | 168 | 40.6 МБ | 85 | 03.11.2026 | — | 21 | да |
| [warp-web-ui](https://github.com/adleibzon-rgb/warp-web-ui) | VPN | Python | 14 | 307.9 КБ | 21 | 08.06.2026 | — | 2 | да |
| [warp-web-ui-relay-beta](https://github.com/adleibzon-rgb/warp-web-ui-relay-beta) | VPN | Python | 14 | 307.4 КБ | 20 | 05.06.2026 | — | 2 | да |
| [domain_web](https://github.com/adleibzon-rgb/domain_web) | Домены и маршруты | HTML | 29 | 3.3 МБ | 23 | 29.05.2026 | — | 3 | да |
| [domen_hydra](https://github.com/adleibzon-rgb/domen_hydra) | Домены и маршруты | HTML | 17 | 1018.6 КБ | 39 | 30.05.2026 | — | 1 | да |
| [domen_hydra_new](https://github.com/adleibzon-rgb/domen_hydra_new) | Домены и маршруты | HTML | 16 | 945.5 КБ | 9 | 24.04.2026 | — | 1 | — |
| [safe-monthly-maintenance](https://github.com/adleibzon-rgb/safe-monthly-maintenance) | Серверы | Shell | 9 | 30.7 КБ | 2 | 31.07.2026 | — | 0 | да |
| [ssh-manage](https://github.com/adleibzon-rgb/ssh-manage) | Серверы | Python | 13 | 239.5 КБ | 23 | 26.05.2026 | — | 1 | — |
| [vps_monitoring](https://github.com/adleibzon-rgb/vps_monitoring) | Серверы | Python | 44 | 320.7 КБ | 31 | 30.05.2026 | — | 0 | да |

\* по последним 200 коммитам.

## Keenetic

### keenetic_ssh

**Keenetic SSH через Telegram**

Минимальный бот: пишешь команду в Telegram — она уходит на роутер по SSH. Без веб-морды, без графиков — зато ставится за пару минут на старый VPS.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/Keenetic_SSH/main/uninstall.sh | sudo bash
```

### keenetic_ssh-web

**keeneticssh-web**

Веб‑панель, которая выполняет команды прямо на роутере Keenetic (Entware) и показывает вывод. Подходит для обновления пакетов, перезапусков сервисов, диагностики, и т. п.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/keenetic_ssh-web/main/setup-router.sh | sh
```

### keenetic-dns-routes

**Keenetic DNS Routes**

Один список доменов в браузере — и он уезжает на все твои Keenetic сразу. Без HydraRoute Neo, без SSH: только встроенные «Маршруты DNS» и RCI API.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/keenetic-dns-routes/main/uninstall.sh | sudo bash
```

### keenetic-split-dns

**Keenetic Split DNS**

На Keenetic в настройках DNS можно включить DNS-over-TLS — но только один сервер на всё. Нельзя сказать роутеру: «для vk.com — Яндекс DoT, для остального — как у провайдера». Этот проект как раз про такую «раздельную» DNS-политику.

Последнее изменение: 24.05.2026 — fix: audit corrections

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/Keenetic-Split-DNS/main/install.sh | sh
```

## Telegram

### pcatelegram_web

**PCAtelegramweb**

Отдельный проект PCAtelegramweb: MTProxy на базе telemt, Telegram-бот, локальная web-admin панель, статистика, backup/restore, шаблоны сайта.

Последнее изменение: 07.06.2026 — feat: add Mieru subscription QR

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/PCAtelegram_web/main/bootstrap.sh | bash
```

## VPN

### amnezia_web

**amneziaweb**

Веб‑панель AmneziaWG на своём VPS (Docker): таблица клиентов, статусы «в туннеле», AllowedIPs, несколько инстансов через AWGPROFILES, часы сервера и браузера, смена пароля панели.

Последнее изменение: 19.09.2026 — fix: reset admin password on reinstall

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/amnezia_web/main/scripts/install.sh | sudo bash
```

### amnezia_web-pro

**amneziaweb-PRO**

Полностью открытая веб-панель для сервера Amnezia: все функции бесплатны, без платных или закрытых редакций. Один репозиторий, один установщик.

Последнее изменение: 23.10.2026 — README: screenshot of protocol install

Установка:

```bash
curl -fsSL https://git.bobyrev.com/PCA/amnezia_web-PRO/raw/branch/main/scripts/install.sh | sudo bash
```

### amnezia_web-pro-github-mirror

**amneziaweb-PRO**

Полностью открытая веб-панель для сервера Amnezia: все функции бесплатны, без платных или закрытых редакций. Один репозиторий, один установщик.

Последнее изменение: 22.10.2026 — docs: split old Notes into 09.3.N, fix 00 (news bot), move check scripts to scripts/checks

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/amnezia_web-PRO/main/scripts/install.sh | sudo bash
```

### amnezia-web-pro-deploy

**Amnezia Web PRO Deploy**

Legacy transitional repo для Amnezia Web PRO.

Последнее изменение: 06.06.2026 — docs: mark deploy repo as legacy

### kaskad

**Kaskad**

Живёшь за границей, а Госуслуги, банк и ВК снова открываются «как дома» — через твой сервер в РФ. Netflix и рабочие звонки идут напрямую, без тормозов. RU-узел упал — за минуту подхватит запасной. Управление — в браузере (:8088) или в Telegram.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/kaskad/main/install.sh | sudo bash
```

### kaskad_web_vpn

**kaskadwebvpn — каскад NAT под ключ**

Веб-панель для проброса портов и iptables на VPS: добавляешь правило в таблице — скрипт сам собирает DNAT/MASQUERADE. Удобно, если уже пользуешься kaskad и не хочешь каждый раз править iptables руками.

Последнее изменение: 17.05.2026 — docs: живее README, скрины и понятнее вступление

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/kaskad_web_vpn/main/install.sh | sudo bash
```

### pca_phobos

**PCA Phobos — VPN, который не отключается**

Веб-панель и turnkey-установщик для Phobos — обфусцированного WireGuard VPN. Ставится на чистый VPS одной командой, управляет десятками роутеров и устройств с одной страницы, сам переключается между серверами при сбоях и восстанавливается после перезагрузок.

Последнее изменение: 03.11.2026 — release 1.4.10: накопительный счётчик трафика за месяц на клиента

Установка:

```bash
bash <(curl -fsSL https://git.bobyrev.com/PCA/PCA_Phobos/raw/branch/main/install.sh)
```

### warp-web-ui

**WARP Web UI**

Веб-панель для управления Cloudflare WARP на Linux: подключение и отключение туннеля, активация WARP+, настройка SOCKS-прокси, готовые пресеты для 3x-ui/Amnezia Xray и beta-модуль WARP Relay.

Последнее изменение: 08.06.2026 — fix: read install prompts from terminal

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/WARP-Web-UI/main/install.sh | sudo bash
```

### warp-web-ui-relay-beta

**WARP Web UI**

Веб-панель для управления Cloudflare WARP на Linux: подключение и отключение туннеля, активация WARP+, настройка SOCKS-прокси, готовые пресеты для 3x-ui/Amnezia Xray и beta-модуль WARP Relay.

Последнее изменение: 05.06.2026 — feat: add route preview and relay probe

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/WARP-Web-UI/main/install.sh | sudo bash
```

## Домены и маршруты

### domain_web

**PCA Lab — Domain Web**

Сайт PCA Lab: кабинет студента (VPN Amnezia), группы доменов, поиск доменов (CT, DNS, reverse IP, geosite/geoip, .bat для Keenetic).

Последнее изменение: 29.05.2026 — feat(deploy): full one-line install with search API

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/Domain_web/main/install.sh | sudo bash
```

### domen_hydra

**HydraRoute Manager**

Панель для HydraRoute Neo: домены и IP правишь в браузере на VPS, одной кнопкой — на все роутеры. Есть генератор WireGuard и мастер обратного туннеля, если у провайдера серый IP.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/domen_hydra/main/server/uninstall.sh | sudo bash
```

### domen_hydra_new

**🌐 HydraRoute Manager**

Веб-интерфейс для централизованного управления конфигурацией HydraRoute Neo на роутерах Keenetic. Без мониторинга, без Telegram — только домены и IP.

Последнее изменение: 24.04.2026 — Remove T-Bank donation (README + QR asset)

## Серверы

### safe-monthly-maintenance

**Safe Monthly Maintenance**

Безопасное ежемесячное обслуживание Ubuntu/Debian одной командой.

Последнее изменение: 31.07.2026 — Add ShellCheck workflow

Установка:

```bash
curl -fsSL https://raw.githubusercontent.com/andrey271192/safe-monthly-maintenance/v1.0.2/install.sh | sudo bash -s -- --run-now
```

### ssh-manage

**PCA SSH — Private Control Administration**

SSH-клиент с карточным интерфейсом, AI-агентами и автосохранением сессий.

Последнее изменение: 26.05.2026 — feat: Apple-style UI with draggable PanedWindow layout

### vps_monitoring

**VPS Monitoring**

Платформа мониторинга VPS, Keenetic-роутеров, Synology, Home Assistant и Windows PC с веб-панелью, SSH-терминалом и Telegram-ботом.

Последнее изменение: 30.05.2026 — contact: personal Telegram -> group @PCAdministration

Установка:

```bash
curl -sSL https://raw.githubusercontent.com/andrey271192/vps_monitoring/main/install.sh | bash
```
