# Установка openrouter-paperclip-adapter

> Пошаговая инструкция для установки адаптера на сервер с запущенным Paperclip.
> Предполагается: Ubuntu/Debian, Paperclip установлен как systemd-сервис.

---

## Шаг 1. Получить API-ключ OpenRouter

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Создайте ключ на [openrouter.ai/keys](https://openrouter.ai/keys)
3. Пополните баланс на [openrouter.ai/credits](https://openrouter.ai/credits)  
   *(Многие модели, включая Llama и DeepSeek, имеют бесплатный лимит)*

---

## Шаг 2. Клонировать и собрать адаптер

```bash
git clone https://github.com/davidishe/openrouter-paperclip-adapter.git
cd openrouter-paperclip-adapter
npm install
npm run build
npm test   # все тесты должны пройти
```

---

## Шаг 3. Зарегистрировать адаптер в Paperclip

Paperclip читает список внешних адаптеров из файла `~/.paperclip/adapter-plugins.json`.

### 3a. Создать директорию для плагинов (если не существует)

```bash
mkdir -p ~/.paperclip/adapter-plugins/node_modules

cat > ~/.paperclip/adapter-plugins/package.json <<'EOF'
{
  "name": "paperclip-adapter-plugins",
  "version": "0.0.0",
  "private": true
}
EOF
```

### 3b. Записать путь адаптера в реестр

Замените `/ABSOLUTE/PATH/TO/openrouter-paperclip-adapter` на реальный путь к папке:

```bash
ADAPTER_PATH="/ABSOLUTE/PATH/TO/openrouter-paperclip-adapter"

# Если adapter-plugins.json уже существует с другими адаптерами,
# добавьте новый объект в массив вручную.
# Если файла нет — создайте:

cat > ~/.paperclip/adapter-plugins.json <<EOF
[
  {
    "packageName": "openrouter-paperclip-adapter",
    "localPath": "${ADAPTER_PATH}",
    "version": "0.1.0",
    "type": "openrouter",
    "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  }
]
EOF
```

Проверьте файл:

```bash
cat ~/.paperclip/adapter-plugins.json
```

---

## Шаг 4. Перезапустить Paperclip

```bash
sudo systemctl restart paperclip
sudo systemctl status paperclip   # должен быть active (running)
```

После перезапуска Paperclip загрузит адаптер и тип `openrouter` появится в UI.

---

## Шаг 5. Проверить адаптер в UI

Откройте Paperclip → **Settings → Adapters**.  
В списке должен появиться адаптер `openrouter`.

Нажмите **Test** — адаптер проверит:
1. Наличие API-ключа
2. Доступность OpenRouter API
3. Корректность указанной модели

---

## Шаг 6. Создать агента с OpenRouter

В Paperclip UI → **Agents → New agent**, выберите:
- **Adapter**: `openrouter`
- **Adapter config**:

```yaml
apiKey: sk-or-v1-ваш-ключ
model: openai/gpt-4o
temperature: 0.7
maxTokens: 8192
```

Сохраните и запустите — агент будет использовать выбранную модель через OpenRouter.

---

## Конфигурация адаптера (все поля)

| Поле | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `apiKey` | string | — | **Обязательно.** API-ключ OpenRouter |
| `model` | string | `openai/gpt-4o` | ID модели в формате `provider/name` |
| `maxTokens` | number | `8192` | Максимум токенов в ответе |
| `temperature` | number | `0.7` | Температура сэмплирования (0.0–2.0) |
| `timeoutMs` | number | `120000` | Таймаут запроса в мс |
| `customSystemPrompt` | string | — | Дополнительные инструкции к системному промту |
| `siteUrl` | string | `https://paperclip.ing` | URL вашего сайта для атрибуции в OpenRouter |
| `siteName` | string | `Paperclip` | Название сайта для атрибуции |

---

## Обновление адаптера

```bash
cd /path/to/openrouter-paperclip-adapter
git pull
npm run build
sudo systemctl restart paperclip
```

---

## Диагностика

```bash
# Проверка подключения к OpenRouter
curl https://openrouter.ai/api/v1/models | jq '.data[0]'

# Логи Paperclip
sudo journalctl -u paperclip -f

# Тест API-ключа напрямую
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer sk-or-v1-ВАШ-КЛЮЧ" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "ping"}],
    "max_tokens": 10
  }'
```
