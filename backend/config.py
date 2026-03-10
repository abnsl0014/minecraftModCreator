from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"
    supabase_url: str
    supabase_key: str
    mod_template_dir: str = "../mod-template"
    temp_dir_base: str = "/tmp/modcreator"
    max_fix_iterations: int = 3
    build_timeout_seconds: int = 300

    class Config:
        env_file = ".env"


settings = Settings()
