# Model coverage report

Generated: 2026-05-27T03:21:54.312Z
Spent on this run: $0.3001
Budget cap: $10.00

## Summary

- Image models: 4 ok / 0 fail / 4 skipped (of 8 attempted)
- Chat models: 252 ok / 100 fail (of 352 attempted)
- Categories not surveyed: none

## Image models (text-to-image)

| Model | Status | Shape | Cost | Latency | Notes |
|---|---|---|---|---|---|
| `google/nano-banana-2-image-to-image` | skipped | — | — | — | image-to-image needs source URL; not part of automated survey |
| `google/nano-banana-2-text-to-image` | ok | sync | $0.0800 | 13.8s |  |
| `google/nano-banana-pro-text-to-image` | ok | sync | $0.1500 | 19.3s |  |
| `google/nano-banana-text-to-image` | ok | sync | $0.0390 | 7.4s |  |
| `google/nano-banana-image-to-image` | skipped | — | — | — | image-to-image needs source URL; not part of automated survey |
| `google/nano-banana-pro-image-to-image` | skipped | — | — | — | image-to-image needs source URL; not part of automated survey |
| `openai/gpt-image-2/text-to-image` | ok | async | $0.0059 | 12.6s | task_id |
| `openai/gpt-image-2/image-to-image` | skipped | — | — | — | image-to-image needs source URL; not part of automated survey |

## Chat models

| Model | Status | Latency | Tokens | Cost | Sample |
|---|---|---|---|---|---|
| `amazon/nova-premier-v1` | fail | — | — | — | bad_request: Infron API returned 404. |
| `anthropic/claude-haiku-4.5-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `anthropic/claude-opus-4` | fail | — | — | — | bad_request: Infron API returned 404. |
| `anthropic/claude-opus-4.5-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `anthropic/claude-sonnet-4.5-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `arcee-ai/trinity-large-preview` | fail | — | — | — | bad_request: Infron API returned 404. |
| `baai/bge-base-en-v1.5` | fail | — | — | — | bad_request: Infron API returned 404. |
| `baai/bge-large-en-v1.5` | fail | — | — | — | bad_request: Infron API returned 404. |
| `baai/bge-m3` | fail | — | — | — | bad_request: Infron API returned 404. |
| `cloudsway/cloudsway-smart-search` | fail | — | — | — | server: Infron API server error 500. |
| `deepseek/deepseek-v3.2-speciale` | fail | — | — | — | bad_request: Infron API returned 400. |
| `exa/exa-search` | fail | — | — | — | bad_request: Infron API returned 400. |
| `firecrawl/firecrawl-search` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-2.0-flash` | fail | — | — | — | bad_request: Infron API returned 404. |
| `google/gemini-2.0-flash-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-2.0-flash-exp` | fail | — | — | — | bad_request: Infron API returned 404. |
| `google/gemini-2.0-flash-lite` | fail | — | — | — | bad_request: Infron API returned 404. |
| `google/gemini-2.0-flash-lite-001` | fail | — | — | — | bad_request: Infron API returned 404. |
| `google/gemini-2.0-flash-lite-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-2.5-flash-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-2.5-flash-lite-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-2.5-pro-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-3-flash-preview-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/gemini-3-pro-preview` | fail | — | — | — | bad_request: Infron API returned 404. |
| `google/gemini-3-pro-preview-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `google/veo3.1/video-extend` | fail | — | — | — | bad_request: Infron API returned 400. |
| `inference-net/cliptagger-12b` | fail | — | — | — | rate_limit: Rate limit exceeded. |
| `intfloat/e5-base-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `intfloat/e5-large-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `intfloat/multilingual-e5-large` | fail | — | — | — | bad_request: Infron API returned 404. |
| `kwaipilot/kat-coder-exp-72b-1010` | fail | — | — | — | bad_request: Infron API returned 400. |
| `kwaipilot/kat-coder-pro` | fail | — | — | — | bad_request: Infron API returned 400. |
| `loveon/loveon_l` | fail | — | — | — | server: Infron API server error 500. |
| `loveon/loveon_l2` | fail | — | — | — | server: Infron API server error 500. |
| `loveon/loveon_s` | fail | — | — | — | server: Infron API server error 500. |
| `meituan/longcat-flash-chat` | fail | — | — | — | bad_request: Infron API returned 400. |
| `miromind/mirothinker-1-7-deepresearch` | fail | — | — | — | Unexpected token 'd', "data: {"id"... is not valid JSON |
| `miromind/mirothinker-1-7-deepresearch-mini` | fail | — | — | — | Unexpected token 'd', "data: {"id"... is not valid JSON |
| `mistral/mistral-small-creative` | fail | — | — | — | bad_request: Infron API returned 400. |
| `mistral/mixtral-8x7b-instruct-v0.1` | fail | — | — | — | bad_request: Infron API returned 400. |
| `moonshotai/kimi-k2-0711-preview` | fail | — | — | — | bad_request: Infron API returned 404. |
| `moonshotai/kimi-k2-turbo-preview` | fail | — | — | — | bad_request: Infron API returned 404. |
| `nousresearch/hermes-4-14b` | fail | — | — | — | bad_request: Infron API returned 404. |
| `openai/gpt-4.1-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4.1-mini-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4.1-nano-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4o-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4o-mini-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4o-mini-transcribe` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-4o-transcribe` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-5-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/gpt-5.4-pro` | fail | — | — | — | auth_failed: Infron API key was rejected. |
| `openai/gpt-5.5-pro` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/o4-mini-batch` | fail | — | — | — | bad_request: Infron API returned 400. |
| `openai/whisper-1` | fail | — | — | — | bad_request: Infron API returned 400. |
| `perplexity/perplexity-search` | fail | — | — | — | bad_request: Infron API returned 404. |
| `qwen/qwen-mt-flash` | fail | — | — | — | bad_request: Infron API returned 404. |
| `qwen/qwen3.5-27b-anko` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-bluestar-v3-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-bluestar-v3-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-earica-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-earica-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-infracelestial` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-marvin-dpo-v2-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-marvin-dpo-v2-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-marvin-v2-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-marvin-v2-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-nanovel-v2-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-nanovel-v2-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-queen-derestricted` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-queen-derestricted-lite` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/qwen3.5-27b-rprmax-v1` | fail | — | — | — | server: Infron API server error 502. |
| `qwen/tongyi-deepresearch-30b-a3b` | fail | — | — | — | bad_request: Infron API returned 400. |
| `rednote-hilab/dots.ocr` | fail | — | — | — | bad_request: Infron API returned 404. |
| `sapiens-ai/agnes-1.5-flash` | fail | — | — | — | server: Infron API server error 503. |
| `sapiens-ai/agnes-1.5-pro` | fail | — | — | — | server: Infron API server error 503. |
| `sentence-transformers/all-minilm-l12-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `sentence-transformers/all-minilm-l6-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `sentence-transformers/all-mpnet-base-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `sentence-transformers/multi-qa-mpnet-base-dot-v1` | fail | — | — | — | bad_request: Infron API returned 404. |
| `sentence-transformers/paraphrase-minilm-l6-v2` | fail | — | — | — | bad_request: Infron API returned 404. |
| `tavily/tavily-extract` | fail | — | — | — | bad_request: Infron API returned 422. |
| `tavily/tavily-search` | fail | — | — | — | bad_request: Infron API returned 422. |
| `thedrummer/rocinante-12b` | fail | — | — | — | bad_request: Infron API returned 400. |
| `thenlper/gte-base` | fail | — | — | — | bad_request: Infron API returned 404. |
| `thenlper/gte-large` | fail | — | — | — | bad_request: Infron API returned 404. |
| `tngtech/deepseek-r1t2-chimera` | fail | — | — | — | bad_request: Infron API returned 404. |
| `voyage/voyage-3-large` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-3.5` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-3.5-lite` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-4` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-4-large` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-4-lite` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-code-2` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-code-3` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-finance-2` | fail | — | — | — | server: Infron API server error 500. |
| `voyage/voyage-law-2` | fail | — | — | — | server: Infron API server error 500. |
| `x-ai/grok-4.2-multi-agent` | fail | — | — | — | bad_request: Infron API returned 400. |
| `z-ai/glm-4.6` | fail | — | — | — | server: Infron API server error 524. |
| `z-ai/glm-5.1:free` | fail | — | — | — | server: Infron API server error 524. |
| `aion-labs/aion-1.0` | ok | 4.2s | 32 | $0.0001 | <think>

The user will only see what's inside

</think>

Hi. |
| `aion-labs/aion-2.0` | ok | 4.2s | 32 | $0.0001 | Hello. |
| `amazon/nova-2-lite-v1` | ok | 0.7s | 57 | $0.0001 | Hello! How can I help you |
| `amazon/nova-lite-v1` | ok | 0.7s | 11 | $0.0001 | Hi there! It's great to |
| `amazon/nova-micro-v1` | ok | 0.6s | 11 | $0.0001 | Hello! It's nice to " |
| `amazon/nova-pro-v1` | ok | 0.7s | 11 | $0.0001 | Hello! It's nice to meet |
| `anthropic/claude-haiku-4.5` | ok | 1.7s | 18 | $0.0001 | Hi! 👋 How can |
| `anthropic/claude-opus-4.1` | ok | 4.9s | 18 | $0.0001 | Hi! How are you doing today? |
| `anthropic/claude-opus-4.5` | ok | 1.7s | 18 | $0.0001 | Hi! How can I help you today |
| `anthropic/claude-opus-4.6` | ok | 4.2s | 18 | $0.0001 | Hi! How are you doing today? |
| `anthropic/claude-opus-4.7` | ok | 1.6s | 35 | $0.0001 | Hi! 👋 How can I help you today? |
| `anthropic/claude-sonnet-4.5` | ok | 2.5s | 18 | $0.0001 | Hi! How can I help you today |
| `anthropic/claude-sonnet-4.6` | ok | 4.6s | 18 | $0.0001 | Hi there! 👋 How |
| `arcee-ai/trinity-large-thinking` | ok | 1.3s | 21 | $0.0001 |  |
| `arcee-ai/trinity-mini` | ok | 0.7s | 21 | $0.0001 |  |
| `bytedance/sc-250615` | ok | 0.8s | 20 | $0.0001 | Hi there! 👋 How can |
| `bytedance/sc-260215` | ok | 0.8s | 20 | $0.0001 | Hi there! 👋 How can |
| `bytedance/seed-1.6` | ok | 2.1s | 180 | $0.0001 | Hi there! How are you doing today |
| `bytedance/seed-1.6-flash` | ok | 1.4s | 156 | $0.0001 | Hi there! How can I assist you |
| `bytedance/seed-1.8` | ok | 1.8s | 118 | $0.0001 | Hi there! 👋 Nice to |
| `bytedance/seed-2.0-lite` | ok | 2.1s | 147 | $0.0001 | Hi there! It's great to |
| `bytedance/seed-2.0-mini` | ok | 2.1s | 236 | $0.0001 | Hi there! It's great to |
| `bytedance/seed-2.0-pro` | ok | 1.4s | 74 | $0.0001 | Hi there! 😊 |
| `cohere/command-a-03-2025` | ok | 2.7s | 11 | $0.0001 |  |
| `deepseek/deepseek-chat` | ok | 1.9s | 15 | $0.0001 | Hi there! 😊 How are you |
| `deepseek/deepseek-chat-v3-0324` | ok | 1.7s | 14 | $0.0001 | Hi there! 👋 How can I |
| `deepseek/deepseek-chat-v3.1` | ok | 1.7s | 17 | $0.0001 | Hi! How can I help you today |
| `deepseek/deepseek-ocr` | ok | 0.4s | 17 | $0.0001 | 晚上好！

Q: 你好啊 |
| `deepseek/deepseek-r1` | ok | 0.7s | 14 | $0.0001 | <think>
Okay, user just said " |
| `deepseek/deepseek-r1-0528` | ok | 12.2s | 219 | $0.0001 | 
Hi there! 👋 How are |
| `deepseek/deepseek-r1-distill-llama-70b` | ok | 0.8s | 14 | $0.0001 | <think>

</think>

Hi! How can |
| `deepseek/deepseek-v3.1` | ok | 1.2s | 17 | $0.0001 | Hi there! 👋 How can I |
| `deepseek/deepseek-v3.1-terminus` | ok | 0.8s | 15 | $0.0001 | Hi there! 👋 How can I |
| `deepseek/deepseek-v3.2` | ok | 1.6s | 15 | $0.0001 | Hi there! 👋

How can |
| `deepseek/deepseek-v3.2-exp` | ok | 1.6s | 15 | $0.0001 | Hello! 😊 How are you today |
| `deepseek/deepseek-v4-flash` | ok | 10.0s | 69 | $0.0001 | Hi! |
| `deepseek/deepseek-v4-flash:free` | ok | 1.2s | 28 | $0.0001 | Hi! How can I help you today |
| `deepseek/deepseek-v4-pro` | ok | 1.5s | 51 | $0.0001 | Hi there! 👋 How can I |
| `deepseek/deepseek-v4-pro:free` | ok | 2.7s | 28 | $0.0001 | Hi there! 👋 How can I |
| `ds-archive/doctor-shotgun-3.3-70b-magnum-v4-se` | ok | 0.8s | 46 | $0.0001 | Hello. How can I assist you today |
| `google/gemini-2.0-flash-001` | ok | 0.7s | 11 | $0.0001 | Hi there! How can I help you |
| `google/gemini-2.5-flash` | ok | 0.7s | 8 | $0.0001 |  |
| `google/gemini-2.5-flash-image` | ok | 0.8s | 12 | $0.0001 | Hello! How can I help you today? |
| `google/gemini-2.5-flash-image-preview` | ok | 1.0s | 13 | $0.0001 | Hello there! How can I help you today? |
| `google/gemini-2.5-flash-lite` | ok | 1.4s | 6 | $0.0001 | Hi! |
| `google/gemini-2.5-flash-lite-preview-06-17` | ok | 0.5s | 5 | $0.0001 | Hi! |
| `google/gemini-2.5-flash-lite-preview-09-2025` | ok | 0.6s | 11 | $0.0001 | Hi! How can I help you today |
| `google/gemini-2.5-flash-preview` | ok | 0.6s | 8 | $0.0001 |  |
| `google/gemini-2.5-flash-preview-05-20` | ok | 0.5s | 8 | $0.0001 | Hi |
| `google/gemini-2.5-flash-preview-09-2025` | ok | 0.6s | 8 | $0.0001 |  |
| `google/gemini-2.5-pro` | ok | 0.8s | 7 | $0.0001 |  |
| `google/gemini-2.5-pro-preview-03-25` | ok | 2.0s | 9 | $0.0001 |  |
| `google/gemini-2.5-pro-preview-05-06` | ok | 0.9s | 7 | $0.0001 |  |
| `google/gemini-2.5-pro-preview-06-05` | ok | 0.9s | 7 | $0.0001 |  |
| `google/gemini-3-flash-preview` | ok | 0.9s | 8 | $0.0001 |  |
| `google/gemini-3.1-flash-lite` | ok | 0.7s | 7 | $0.0001 |  |
| `google/gemini-3.1-flash-lite-preview` | ok | 0.7s | 7 | $0.0001 |  |
| `google/gemini-3.1-pro-preview` | ok | 2.3s | 8 | $0.0001 |  |
| `google/gemini-3.5-flash` | ok | 1.0s | 8 | $0.0001 |  |
| `google/gemma-3-12b-it` | ok | 0.4s | 20 | $0.0001 | Hi! 👋 



It's |
| `google/gemma-3-27b-it` | ok | 0.5s | 20 | $0.0001 | Hi there! 👋 

It' |
| `google/gemma-3-4b-it` | ok | 0.7s | 20 | $0.0001 | Hi there! 😊 How’s your |
| `google/gemma-4-26b-a4b` | ok | 4.0s | 24 | $0.0001 | Hi! How can I help you today |
| `google/gemma-4-31b-it` | ok | 1.4s | 19 | $0.0001 | Hi! |
| `gryphe/mythomax-l2-13b` | ok | 2.4s | 18 | $0.0001 | 
[MEZZ] Wiz |
| `holo/holo3-35b-a3b` | ok | 2.6s | 21 | $0.0001 |  |
| `ibm-granite/granite-4.1-8b` | ok | 0.8s | 19 | $0.0001 | Hi! How may I assist you today |
| `inception/mercury-2` | ok | 0.5s | 14 | $0.0001 |  |
| `inclusionai/ling-2.6-1t` | ok | 1.4s | 29 | $0.0001 | Hi! How can I help you today |
| `inclusionai/ling-2.6-flash` | ok | 1.5s | 29 | $0.0001 | Hello! I'm Bailing, an |
| `inflection/inflection-3-pi` | ok | 2.7s | 148 | $0.0001 | Hi there! How can I help you |
| `interfaze/interfaze-beta` | ok | 23.9s | 225 | $0.0001 |  |
| `jina/jina-clip-v1` | ok | 2.5s | 3571 | $0.0001 | Hi there! |
| `jina/jina-clip-v2` | ok | 2.6s | 3565 | $0.0001 | Hi there! How can I help you today? |
| `jina/jina-colbert-v1-en` | ok | 2.9s | 3596 | $0.0001 | Hi there! How can I help you today? |
| `jina/jina-colbert-v2` | ok | 2.6s | 3579 | $0.0001 | Hi there! How can I help you today? |
| `jina/jina-deepsearch-v1` | ok | 2.7s | 3563 | $0.0001 | Hi there! It's great to connect with you. |
| `kwaipilot/kat-coder-pro-v2` | ok | 1.3s | 14 | $0.0001 | Hi! |
| `meta-llama/l3-lunaris-8b` | ok | 0.3s | 21 | $0.0001 | Hello! It's nice to meet you |
| `meta-llama/llama-3.1-70b-instruct` | ok | 0.6s | 21 | $0.0001 | Hi! It's nice to meet you |
| `meta-llama/llama-3.1-8b` | ok | 0.5s | 46 | $0.0001 | Hi, how can I assist you? |
| `meta-llama/llama-3.3-70b-instruct` | ok | 1.4s | 46 | $0.0001 | Hi. How can I assist you today |
| `meta-llama/llama-4-maverick` | ok | 0.5s | 21 | $0.0001 | Hello! How are you today? |
| `meta-llama/llama3-11b-vision-instruct` | ok | 1.0s | 21 | $0.0001 | Hi! How's your day going so |
| `minimax/minimax-m2` | ok | 2.1s | 50 | $0.0001 | <think>
The user is simply asking me
</think>
 |
| `minimax/minimax-m2-her` | ok | 0.9s | 202 | $0.0001 | M2-her here, always ready to |
| `minimax/minimax-m2.1` | ok | 0.8s | 54 | $0.0001 | <think>
The user wants me to
</think>

 |
| `minimax/minimax-m2.5` | ok | 0.8s | 48 | $0.0001 | The user wants me to say hi. |
| `minimax/minimax-m2.5:free` | ok | 1.2s | 49 | $0.0001 | <think>The user wants me to say hi. |
| `minimax/minimax-m2.7` | ok | 1.3s | 53 | $0.0001 | <think>
The user says: "Say hi."


</think>

 |
| `minimax/minimax-m2.7:free` | ok | 2.2s | 54 | $0.0001 |  |
| `mistral/ministral-14b-2512` | ok | 0.5s | 14 | $0.0001 | Hi there! 😊 How’s |
| `mistral/mistral-nemo` | ok | 0.4s | 15 | $0.0001 | Hello! Nice to meet you. How |
| `mistral/mistral-small-24b-instruct-2501` | ok | 0.5s | 174 | $0.0001 | Hi! How can I assist you today |
| `mistral/mistral-small-24b-instruct-2506` | ok | 0.5s | 14 | $0.0001 | Hi there! 😊 How's |
| `mistral/mistral-small-2603` | ok | 0.6s | 26 | $0.0001 | Hi! 😊 How can I |
| `moonshotai/kimi-k2-0905` | ok | 1.3s | 19 | $0.0001 |  |
| `moonshotai/kimi-k2-instruct` | ok | 2.0s | 21 | $0.0001 | Hi! |
| `moonshotai/kimi-k2-thinking` | ok | 4.4s | 97 | $0.0001 | Hi there! How can I help you |
| `moonshotai/kimi-k2.5` | ok | 3.9s | 19 | $0.0001 |  |
| `moonshotai/kimi-k2.6` | ok | 1.2s | 19 | $0.0001 |  |
| `moonshotai/kimi-k2.6:free` | ok | 5.2s | 19 | $0.0001 |  |
| `moonshotai/kimi-v1-128k` | ok | 2.1s | 18 | $0.0001 | Hi there! How can I assist you |
| `moonshotai/kimi-v1-128k-vision-preview` | ok | 0.9s | 18 | $0.0001 | Hi there! How can I assist you |
| `moonshotai/kimi-v1-32k` | ok | 0.9s | 18 | $0.0001 | Hi there! How can I assist you |
| `moonshotai/kimi-v1-32k-vision-preview` | ok | 0.7s | 18 | $0.0001 | Hi there! How can I assist you |
| `moonshotai/kimi-v1-8k` | ok | 1.2s | 18 | $0.0001 | Hi there! How can I assist you |
| `moonshotai/kimi-v1-8k-vision-preview` | ok | 1.0s | 18 | $0.0001 | Hi there! How can I assist you |
| `morph/morph-v3-fast` | ok | 0.7s | 95 | $0.0001 | Say hi. |
| `morph/morph-v3-large` | ok | 0.5s | 102 | $0.0001 | Hi! |
| `nousresearch/hermes-3-llama-3.1-405b` | ok | 2.4s | 20 | $0.0001 | Hello! It's nice to meet you |
| `nousresearch/hermes-3-llama-3.1-70b` | ok | 0.5s | 20 | $0.0001 | *The human has instructed me to say |
| `nousresearch/hermes-4-405b` | ok | 2.0s | 35 | $0.0001 | Greetings! I am Hermes, an AI |
| `nousresearch/hermes-4-70b` | ok | 1.3s | 35 | $0.0001 | *Hmm, a simple greeting. I |
| `nvidia/llama-3.1-nemotron-70b-instruct` | ok | 0.4s | 53 | $0.0001 | Hi there! 👋 How can |
| `nvidia/llama-3.3-nemotron-super-49b-v1.5` | ok | 0.5s | 30 | $0.0001 |  |
| `nvidia/nemotron-3-nano-30b-a3b` | ok | 1.1s | 27 | $0.0001 | The user says "Say hi." Very |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | ok | 0.6s | 27 | $0.0001 |  |
| `nvidia/nemotron-3-super-120b-a12b` | ok | 2.2s | 27 | $0.0001 | The user says "Say hi." It |
| `nvidia/nemotron-nano-12b-v2-vl` | ok | 0.3s | 53 | $0.0001 | Hi! How can I assist you today |
| `nvidia/nemotron-nano-9b-v2` | ok | 0.4s | 23 | $0.0001 |  |
| `openai/gpt-35-turbo` | ok | 1.1s | 18 | $0.0001 | Hi! How can I help you today |
| `openai/gpt-4` | ok | 1.4s | 18 | $0.0001 | Hi! 👋 How can I help |
| `openai/gpt-4.1` | ok | 1.1s | 18 | $0.0001 | Hi! How can I help you today |
| `openai/gpt-4.1-mini` | ok | 1.3s | 18 | $0.0001 | Hi! How can I help you today |
| `openai/gpt-4.1-nano` | ok | 0.8s | 18 | $0.0001 | Hi! How can I assist you today |
| `openai/gpt-4o` | ok | 1.8s | 18 | $0.0001 | Hi there! How can I assist you |
| `openai/gpt-4o-mini` | ok | 5.8s | 18 | $0.0001 | Hi! How can I assist you today |
| `openai/gpt-5` | ok | 1.1s | 17 | $0.0001 |  |
| `openai/gpt-5-chat` | ok | 1.2s | 18 | $0.0001 | Hi there! How are you doing today |
| `openai/gpt-5-codex` | ok | 1.7s | 9 | $0.0001 |  |
| `openai/gpt-5-mini` | ok | 1.0s | 17 | $0.0001 |  |
| `openai/gpt-5-nano` | ok | 1.4s | 17 | $0.0001 |  |
| `openai/gpt-5-pro` | ok | 21.8s | 9 | $0.0001 |  |
| `openai/gpt-5.1` | ok | 0.8s | 17 | $0.0001 |  |
| `openai/gpt-5.1-chat` | ok | 1.1s | 17 | $0.0001 |  |
| `openai/gpt-5.1-codex` | ok | 0.8s | 34 | $0.0001 | Hi there! 👋 How can I help you today? |
| `openai/gpt-5.1-codex-mini` | ok | 2.0s | 28 | $0.0001 | Hi! |
| `openai/gpt-5.2` | ok | 0.8s | 15 | $0.0001 | Hi. |
| `openai/gpt-5.2-chat` | ok | 0.9s | 16 | $0.0001 | Hi! 😊 |
| `openai/gpt-5.3-chat` | ok | 1.7s | 16 | $0.0001 | hi 👋 |
| `openai/gpt-5.3-codex` | ok | 1.0s | 15 | $0.0001 | Hi! |
| `openai/gpt-5.4` | ok | 1.0s | 15 | $0.0001 | Hi! |
| `openai/gpt-5.4-mini` | ok | 0.6s | 15 | $0.0001 | Hi! |
| `openai/gpt-5.4-nano` | ok | 1.1s | 24 | $0.0001 | Hi! 👋 How can I help you today? |
| `openai/gpt-5.5` | ok | 0.8s | 14 | $0.0001 | Hi! |
| `openai/gpt-oss-120b` | ok | 1.2s | 78 | $0.0001 |  |
| `openai/gpt-oss-20b` | ok | 0.7s | 65 | $0.0001 |  |
| `openai/gpt-oss-safeguard-20b` | ok | 0.4s | 82 | $0.0001 |  |
| `openai/o1` | ok | 1.4s | 17 | $0.0001 |  |
| `openai/o1-mini` | ok | 2.3s | 17 | $0.0001 |  |
| `openai/o3-mini` | ok | 0.9s | 17 | $0.0001 |  |
| `openai/o4-mini` | ok | 1.5s | 17 | $0.0001 |  |
| `perceptron/perceptron-mk1` | ok | 1.0s | 22 | $0.0001 | Hello! How can I assist you today? |
| `poolside/laguna-m.1` | ok | 1.1s | 25 | $0.0001 |  |
| `poolside/laguna-xs.2` | ok | 0.8s | 62 | $0.0001 |  |
| `qwen/qwen-flash` | ok | 0.9s | 19 | $0.0001 | Hi! ٩(◕‿ |
| `qwen/qwen-mt-lite` | ok | 0.6s | 19 | $0.0001 | Hi! 😊 How are you? |
| `qwen/qwen-mt-plus` | ok | 0.6s | 19 | $0.0001 | Hi! 😊 How can I assist |
| `qwen/qwen-plus` | ok | 1.0s | 19 | $0.0001 | Hi there! 😊 How can I |
| `qwen/qwen-plus-character` | ok | 0.7s | 19 | $0.0001 | Hi! How can I assist you today |
| `qwen/qwen2.5-14b-instruct` | ok | 0.7s | 19 | $0.0001 | Hi there! How can I assist you |
| `qwen/qwen2.5-14b-instruct-1m` | ok | 0.8s | 19 | $0.0001 | Hi! How can I assist you today |
| `qwen/qwen2.5-32b-instruct` | ok | 0.7s | 19 | $0.0001 | Hi there! How can I assist you |
| `qwen/qwen2.5-72b-instruct` | ok | 0.7s | 18 | $0.0001 | Hi there! How can I assist you |
| `qwen/qwen2.5-7b-instruct` | ok | 0.6s | 19 | $0.0001 | Hi there! How can I assist you |
| `qwen/qwen2.5-7b-instruct-1m` | ok | 0.7s | 19 | $0.0001 | Hi! How can I assist you today |
| `qwen/qwen2.5-coder-32b-instruct` | ok | 1.9s | 40 | $0.0001 | Hi! How can I assist you today |
| `qwen/qwen3-0.6b` | ok | 0.5s | 23 | $0.0001 | Hello! How can I assist you today |
| `qwen/qwen3-1.7b` | ok | 0.6s | 23 | $0.0001 | Hello! How can I assist you today |
| `qwen/qwen3-14b` | ok | 0.6s | 23 | $0.0001 | Hi there! How can I assist you |
| `qwen/qwen3-235b-a22b` | ok | 0.7s | 23 | $0.0001 | Hi! How can I help you today |
| `qwen/qwen3-235b-a22b-instruct-2507` | ok | 0.8s | 19 | $0.0001 | Hi! 😊 How can I help |
| `qwen/qwen3-235b-a22b-thinking-2507` | ok | 4.0s | 251 | $0.0001 | Hi there! 👋 How can I |
| `qwen/qwen3-30b-a3b` | ok | 1.0s | 23 | $0.0001 | Hello! How can I assist you today |
| `qwen/qwen3-30b-a3b-instruct-2507` | ok | 0.9s | 19 | $0.0001 | Hi! ٩(◕‿ |
| `qwen/qwen3-30b-a3b-thinking-2507` | ok | 3.1s | 193 | $0.0001 | Hi there! 😊 How can |
| `qwen/qwen3-32b` | ok | 0.6s | 23 | $0.0001 | Hi! How can I assist you today |
| `qwen/qwen3-4b` | ok | 0.6s | 23 | $0.0001 | Hello! How can I assist you today |
| `qwen/qwen3-8b` | ok | 0.8s | 23 | $0.0001 | Hello! How can I assist you today |
| `qwen/qwen3-coder` | ok | 0.8s | 14 | $0.0001 | Hi! |
| `qwen/qwen3-coder-30b-a3b-instruct` | ok | 1.2s | 19 | $0.0001 | Hi there! Nice to meet you! |
| `qwen/qwen3-coder-480b-a35b` | ok | 0.3s | 13 | $0.0001 | Hi! |
| `qwen/qwen3-coder-flash` | ok | 1.1s | 16 | $0.0001 | Hi there! 👋 |
| `qwen/qwen3-coder-next` | ok | 1.6s | 19 | $0.0001 | Hi there! 👋 How can I |
| `qwen/qwen3-coder-plus` | ok | 1.2s | 19 | $0.0001 | Hi! ٩(◕‿ |
| `qwen/qwen3-max` | ok | 1.6s | 19 | $0.0001 | Hi! 😊 How can I help |
| `qwen/qwen3-next-80b-a3b-instruct` | ok | 1.1s | 19 | $0.0001 | Hi there! 😊 How can I |
| `qwen/qwen3-next-80b-a3b-thinking` | ok | 2.2s | 257 | $0.0001 | Hello! 😊 How can I assist you |
| `qwen/qwen3-omni-30b-a3b-instruct` | ok | 1.2s | 19 | $0.0001 | Hi there! 😊  
What’s |
| `qwen/qwen3-omni-30b-a3b-thinking` | ok | 1.1s | 19 | $0.0001 | Hi there! 😊  
What’s |
| `qwen/qwen3-vl-235b-a22b-instruct` | ok | 0.9s | 19 | $0.0001 | Hi! 😊 How can I help |
| `qwen/qwen3-vl-235b-a22b-thinking` | ok | 4.2s | 165 | $0.0001 | Hi there! 😊 How can |
| `qwen/qwen3-vl-flash` | ok | 0.7s | 19 | $0.0001 | Hello! 😊 How can I assist |
| `qwen/qwen3-vl-plus` | ok | 1.2s | 19 | $0.0001 | Hi there! 😊 How can I |
| `qwen/qwen3.5-122b-a10b` | ok | 3.0s | 373 | $0.0001 | Hi there! 👋 How's it |
| `qwen/qwen3.5-27b` | ok | 7.2s | 673 | $0.0001 | Hi there! How's it going |
| `qwen/qwen3.5-35b-a3b` | ok | 5.7s | 484 | $0.0001 | Hi there! 👋 How's your |
| `qwen/qwen3.5-397b-a17b` | ok | 21.8s | 1157 | $0.0001 | Hi there! 👋 How can I help you today? |
| `qwen/qwen3.5-9b` | ok | 0.8s | 21 | $0.0001 |  |
| `qwen/qwen3.5-flash` | ok | 3.4s | 330 | $0.0001 | Hi there! 👋 How are you doing |
| `qwen/qwen3.5-plus` | ok | 21.9s | 1153 | $0.0001 | Hi there! 👋 How can I |
| `qwen/qwen3.6-27b` | ok | 1.6s | 21 | $0.0001 |  |
| `qwen/qwen3.6-35b-a3b` | ok | 0.5s | 21 | $0.0001 | [Wafer: response was truncated before the model finished its |
| `qwen/qwen3.6-flash` | ok | 2.3s | 223 | $0.0001 | Hi! 👋 How can I help you today |
| `qwen/qwen3.6-max-preview` | ok | 9.8s | 275 | $0.0001 | Hi! 👋 How can I help you today |
| `qwen/qwen3.6-plus` | ok | 4.0s | 180 | $0.0001 | Hi! 👋 How can I help you today? |
| `qwen/qwen3.6-plus:free` | ok | 1.5s | 31 | $0.0001 | Hi there! 👋 |
| `qwen/qwen3.7-max` | ok | 10.3s | 381 | $0.0001 | Hi! 👋 How can I |
| `sao10k/72b-qwen2.5-kunou-v1` | ok | 0.5s | 26 | $0.0001 | Hi there! |
| `sao10k/l3-70b-euryale-v2.1` | ok | 0.8s | 18 | $0.0001 | Hello, world! |
| `sao10k/l3-lunaris-8b` | ok | 0.3s | 21 | $0.0001 | Hi! It's nice to meet you |
| `sao10k/l3.1-70b-euryale-v2.2` | ok | 0.5s | 21 | $0.0001 | Hi there! It's nice to meet |
| `sao10k/l3.1-70b-hanami-x1` | ok | 3.5s | 41 | $0.0001 | Hi! |
| `sao10k/l3.3-70b-euryale-v2.3` | ok | 0.5s | 21 | $0.0001 | Hello!

It's nice to meet you |
| `sophosympatheia/midnight-miqu-70b-v1.5` | ok | 0.6s | 13 | $0.0001 |  Hi |
| `stepfun/step-3.5-flash` | ok | 2.4s | 23 | $0.0001 |  |
| `thedrummer/anubis-70b-v1.1` | ok | 0.6s | 41 | $0.0001 | Hello! |
| `thedrummer/valkyrie-49b-v1` | ok | 0.7s | 26 | $0.0001 | Hi! Nice to see you! |
| `volcengine/doubao-seed-1.8` | ok | 2.7s | 87 | $0.0001 | Hi there! 😊 |
| `volcengine/doubao-seed-2.0-code` | ok | 2.6s | 71 | $0.0001 | Hi there! 👋 How |
| `volcengine/doubao-seed-2.0-lite` | ok | 4.9s | 143 | $0.0001 | Hi there! It's nice to |
| `volcengine/doubao-seed-2.0-mini` | ok | 2.5s | 124 | $0.0001 | Hi there! 😊 How can |
| `volcengine/doubao-seed-2.0-pro` | ok | 5.3s | 175 | $0.0001 | Hi there! 😊 It's |
| `x-ai/grok-4.2-non-reasoning` | ok | 0.6s | 129 | $0.0001 | Hi! 👋 |
| `x-ai/grok-4.2-reasoning` | ok | 1.8s | 342 | $0.0001 | Hi! 👋 |
| `x-ai/grok-4.3` | ok | 1.5s | 278 | $0.0001 | Hi! |
| `x-ai/grok-build-0.1` | ok | 2.6s | 314 | $0.0001 | Hi! 👋 |
| `xiaomi/mimo-v2-flash` | ok | 1.9s | 37 | $0.0001 | Hi there! 👋 How can I |
| `xiaomi/mimo-v2-omni` | ok | 2.8s | 261 | $0.0001 |  |
| `xiaomi/mimo-v2-pro` | ok | 6.4s | 260 | $0.0001 |  |
| `xiaomi/mimo-v2.5` | ok | 6.1s | 258 | $0.0001 |  |
| `xiaomi/mimo-v2.5-pro` | ok | 3.2s | 262 | $0.0001 |  |
| `xiaomi/mimo-v2.5:free` | ok | 0.9s | 35 | $0.0001 |  |
| `z-ai/glm-4-32b` | ok | 1.1s | 16 | $0.0001 | Hi! How can I assist you |
| `z-ai/glm-4-32b-0414-128k` | ok | 1.6s | 16 | $0.0001 | Hi! How can I help you |
| `z-ai/glm-4.5` | ok | 1.4s | 16 | $0.0001 | Hi! How can I |
| `z-ai/glm-4.5-air` | ok | 1.5s | 16 | $0.0001 |  |
| `z-ai/glm-4.5-airx` | ok | 0.8s | 16 | $0.0001 |  |
| `z-ai/glm-4.5-flash` | ok | 2.3s | 16 | $0.0001 |  |
| `z-ai/glm-4.5v` | ok | 0.9s | 18 | $0.0001 |  |
| `z-ai/glm-4.5x` | ok | 8.8s | 321 | $0.0001 | Hi! How can I help you today? |
| `z-ai/glm-4.6v` | ok | 1.8s | 17 | $0.0001 |  |
| `z-ai/glm-4.6v-flash` | ok | 2.1s | 17 | $0.0001 |  |
| `z-ai/glm-4.6v-flashx` | ok | 1.3s | 17 | $0.0001 |  |
| `z-ai/glm-4.7` | ok | 9.7s | 227 | $0.0001 | Hi there! How can I help you |
| `z-ai/glm-4.7-flash` | ok | 3.1s | 57 | $0.0001 |  |
| `z-ai/glm-4.7-flashx` | ok | 1.0s | 16 | $0.0001 |  |
| `z-ai/glm-5` | ok | 7.8s | 168 | $0.0001 | Hi there! How can I help you today? |
| `z-ai/glm-5-turbo` | ok | 2.6s | 25 | $0.0001 |  |
| `z-ai/glm-5.1` | ok | 7.4s | 238 | $0.0001 | Hi there! 👋 How can I help you |
| `z-ai/glm-5v-turbo` | ok | 1.7s | 16 | $0.0001 |  |

## Categories not surveyed

These model classes are exposed by the Infron API but NOT by the
plugin's tools. Calling them through the plugin would fail.

### video (3 models)
- `google/veo3.1/text-to-video`
- `google/veo3.1/image-to-video`
- `google/veo3.1/first-last-frame-to-video`

### embedding (19 models)
- `qwen/qwen3-embedding-0.6b`
- `openai/text-embedding-3-small`
- `qwen/qwen3-embedding-4b`
- `jina/jina-embeddings-v4`
- `jina/jina-embeddings-v3`
- `jina/jina-embeddings-v2-base-es`
- `jina/jina-embeddings-v2-base-code`
- `jina/jina-embeddings-v2-base-de`
- `jina/jina-embeddings-v2-base-zh`
- `jina/jina-embeddings-v2-base-en`
- `qwen/qwen3-embedding-8b`
- `z-ai/embedding-3`
- `openai/text-embedding-ada-002`
- `mistral/mistral-embed-2312`
- `openai/text-embedding-3-large`
- `google/gemini-embedding-001`
- `google/text-embedding-large-exp-03-07`
- `google/text-embedding-005`
- `mistral/codestral-embed-2505`

### audio (3 models)
- `openai/gpt-4o-mini-tts`
- `openai/tts-1`
- `openai/tts-1-hd`

### rerank (11 models)
- `qwen/qwen3-reranker-0.6b`
- `voyage/voyage-rerank-2.5-lite`
- `qwen/qwen3-reranker-4b`
- `jina/jina-reranker-v3`
- `voyage/voyage-rerank-2.5`
- `jina/jina-reranker-m0`
- `jina/jina-reranker-v2-base-multilingual`
- `jina/jina-reranker-v1-tiny-en`
- `jina/jina-reranker-v1-turbo-en`
- `jina/jina-reranker-v1-base-en`
- `qwen/qwen3-reranker-8b`

### moderation (0 models)
