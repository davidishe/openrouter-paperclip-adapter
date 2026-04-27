# openrouter-paperclip-adapter

Paperclip external adapter for [OpenRouter](https://openrouter.ai) — access 300+ LLMs (GPT-4o, Claude, Gemini, Llama, DeepSeek, Mistral and more) through a single API key.

## Quick Start

### 1. Get an OpenRouter API key

Sign up at [openrouter.ai](https://openrouter.ai) and create a key at [openrouter.ai/keys](https://openrouter.ai/keys).  
Add credits at [openrouter.ai/credits](https://openrouter.ai/credits) (many models have free tiers).

### 2. Install the adapter in Paperclip

```bash
git clone https://github.com/davidishe/openrouter-paperclip-adapter.git
cd openrouter-paperclip-adapter
npm install
npm run build
npm test
```

Then register it in Paperclip — see [INSTALL.md](./INSTALL.md) for the full step-by-step guide.

### 3. Configure an agent

Go to **Settings → Adapters → Add adapter** and set:

```yaml
adapterType: openrouter
adapterConfig:
  apiKey: sk-or-v1-...         # your OpenRouter key
  model: openai/gpt-4o         # or any model from openrouter.ai/models
  # Optional:
  temperature: 0.7
  maxTokens: 8192
  customSystemPrompt: ""
```

## Supported Models

Any model available on OpenRouter. Popular choices:

| Model ID | Provider | Notes |
|---|---|---|
| `openai/gpt-4o` | OpenAI | Flagship multimodal model |
| `openai/gpt-4o-mini` | OpenAI | Fast and affordable |
| `anthropic/claude-sonnet-4-5` | Anthropic | Strong reasoning |
| `anthropic/claude-3-5-haiku` | Anthropic | Fast and cheap |
| `google/gemini-2.0-flash-001` | Google | Very fast |
| `google/gemini-pro-1.5` | Google | Long context |
| `meta-llama/llama-3.3-70b-instruct` | Meta | Open weights, free tier |
| `deepseek/deepseek-chat-v3-0324` | DeepSeek | Strong at code |
| `deepseek/deepseek-r1` | DeepSeek | Reasoning model |
| `mistralai/mistral-large` | Mistral | European option |
| `qwen/qwen-2.5-72b-instruct` | Alibaba | Multilingual |
| `x-ai/grok-3-beta` | xAI | Grok 3 |

Full list: [openrouter.ai/models](https://openrouter.ai/models)

## Features

- **300+ models** through one API key
- **Automatic model list** fetched live from OpenRouter in the adapter config UI
- **Session history** preserved between Paperclip heartbeats (up to 20 messages)
- **Cost tracking** — `costUsd` reported per run when OpenRouter provides it
- **No vendor lock-in** — switch models by changing one config field

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
