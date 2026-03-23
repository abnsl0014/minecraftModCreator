import asyncio
import logging
from typing import List, Dict

from groq import AsyncGroq, RateLimitError
from anthropic import AsyncAnthropic

from config import settings

logger = logging.getLogger(__name__)

GROQ_MODEL = "gpt-oss-120b"
SONNET_MODEL = "sonnet-4.6"


class ModelRouter:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.groq_api_key)
        self.groq_model = settings.groq_model
        self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None
        self.anthropic_model = settings.anthropic_model

    async def chat(
        self,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
        model_preference: str = GROQ_MODEL,
    ) -> str:
        if model_preference == SONNET_MODEL:
            primary = self._call_anthropic
            fallback = self._call_groq
        else:
            primary = self._call_groq
            fallback = self._call_anthropic

        try:
            return await primary(messages, temperature, max_tokens, json_mode)
        except Exception as e:
            logger.warning(f"Primary model ({model_preference}) failed: {e}. Trying fallback.")
            try:
                return await fallback(messages, temperature, max_tokens, json_mode)
            except Exception as fallback_err:
                raise Exception(f"Both models failed. Primary: {e} | Fallback: {fallback_err}")

    async def _call_groq(
        self,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        kwargs = {
            "messages": messages,
            "model": self.groq_model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        for attempt in range(6):
            try:
                response = await self.groq_client.chat.completions.create(**kwargs)
                return response.choices[0].message.content
            except RateLimitError as e:
                wait = min(2 ** (attempt + 1), 60)
                logger.warning(f"Groq rate limited, retrying in {wait}s (attempt {attempt + 1}/6)")
                await asyncio.sleep(wait)

        raise Exception("Groq rate limit exceeded after 6 retries")

    async def _call_anthropic(
        self,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        if not self.anthropic_client:
            raise Exception("Anthropic API key not configured")

        # Separate system messages from user/assistant messages
        system_parts = []
        chat_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_parts.append(msg["content"])
            else:
                chat_messages.append({"role": msg["role"], "content": msg["content"]})

        system_prompt = "\n\n".join(system_parts) if system_parts else ""

        # Anthropic doesn't support response_format; append JSON instruction instead
        if json_mode:
            json_instruction = "You MUST respond with valid JSON only. No markdown, no explanation, just JSON."
            system_prompt = f"{system_prompt}\n\n{json_instruction}" if system_prompt else json_instruction

        kwargs = {
            "model": self.anthropic_model,
            "messages": chat_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        for attempt in range(6):
            try:
                response = await self.anthropic_client.messages.create(**kwargs)
                return response.content[0].text
            except Exception as e:
                if "rate" in str(e).lower() or "overloaded" in str(e).lower():
                    wait = min(2 ** (attempt + 1), 60)
                    logger.warning(f"Anthropic rate limited, retrying in {wait}s (attempt {attempt + 1}/6)")
                    await asyncio.sleep(wait)
                else:
                    raise

        raise Exception("Anthropic rate limit exceeded after 6 retries")


model_router = ModelRouter()
