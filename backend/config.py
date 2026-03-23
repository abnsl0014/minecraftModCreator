from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-120b"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str = ""
    mod_template_dir: str = "../mod-template"
    temp_dir_base: str = "/tmp/modcreator"
    max_fix_iterations: int = 3
    build_timeout_seconds: int = 300

    class Config:
        env_file = ".env"


settings = Settings()
