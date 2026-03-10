import asyncio
import logging
from typing import List, Dict

from groq import AsyncGroq, RateLimitError

from config import settings

logger = logging.getLogger(__name__)


class GroqClient:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    async def chat(
        self,
        messages: List[Dict],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> str:
        kwargs = {
            "messages": messages,
            "model": self.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        for attempt in range(4):
            try:
                response = await self.client.chat.completions.create(**kwargs)
                return response.choices[0].message.content
            except RateLimitError as e:
                wait = 2 ** (attempt + 1)
                logger.warning(f"Rate limited, retrying in {wait}s (attempt {attempt + 1}/4)")
                await asyncio.sleep(wait)

        raise Exception("Groq rate limit exceeded after 4 retries")


groq_client = GroqClient()
