from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-120b"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str = ""
    environment: str = "development"
    frontend_url: str = ""
    mod_template_dir: str = "../mod-template"
    temp_dir_base: str = "/tmp/modcreator"
    # Active payment gateway: "dodo" or "razorpay"
    payment_gateway: str = "razorpay"

    # DodoPayments config
    dodo_payments_api_key: str = ""
    dodo_payments_webhook_key: str = ""
    dodo_payments_environment: str = "test_mode"
    dodo_product_basic_weekly: str = ""
    dodo_product_basic_monthly: str = ""
    dodo_product_unlimited_monthly: str = ""

    # Razorpay config
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_plan_basic_weekly: str = ""
    razorpay_plan_basic_monthly: str = ""
    razorpay_plan_unlimited_monthly: str = ""

    earnings_per_download: int = 100  # paise (₹1 per download)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
