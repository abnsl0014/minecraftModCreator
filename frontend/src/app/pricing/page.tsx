"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  getUserProfile,
  getTokenHistory,
  createCheckoutSession,
  cancelSubscription,
  TokenTransaction,
  UserProfile,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";
import SignupModal from "@/components/SignupModal";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    plan_key: null as string | null,
    badge: null as string | null,
    highlight: false,
    color: "#55ff55",
    features: [
      "5 tokens per day",
      "Basic mod creation",
      "Community gallery access",
      "Bedrock edition only",
      "Ad-supported",
    ],
  },
  {
    name: "Basic Weekly",
    price: "₹99",
    period: "/week",
    plan_key: "basic_weekly",
    badge: null as string | null,
    highlight: false,
    color: "#55aaff",
    features: [
      "600 tokens per week",
      "No ads",
      "Java + Bedrock editions",
      "All mod categories",
      "Custom textures",
    ],
  },
  {
    name: "Basic Monthly",
    price: "₹399",
    period: "/month",
    plan_key: "basic_monthly",
    badge: "BEST VALUE" as string | null,
    highlight: true,
    color: "#d4a017",
    features: [
      "600 tokens per month",
      "No ads",
      "Java + Bedrock editions",
      "All mod categories",
      "Custom textures",
    ],
  },
  {
    name: "Unlimited",
    price: "₹599",
    period: "/month",
    plan_key: "unlimited_monthly",
    badge: null as string | null,
    highlight: false,
    color: "#aa55ff",
    features: [
      "Unlimited creates",
      "No ads",
      "Instant generation",
      "Priority support",
      "Early access to features",
    ],
  },
];

const EARN_METHODS = [
  {
    title: "Watch Ads",
    desc: "Watch a short video to earn 2 tokens",
    reward: "+2",
    color: "#ffaa00",
    button: "Watch Ad",
  },
  {
    title: "Download App",
    desc: "Download our partner app to earn 10 tokens",
    reward: "+10",
    color: "#55ff55",
    button: "Get App",
  },
  {
    title: "Daily Login",
    desc: "Login daily for 1 bonus token",
    reward: "+1",
    color: "#5555ff",
    button: null,
  },
  {
    title: "Share Creation",
    desc: "Share a mod on social media for 3 tokens",
    reward: "+3",
    color: "#aa55ff",
    button: "Share",
  },
] as const;

const REASON_LABELS: Record<string, string> = {
  mod_generation: "Mod Created",
  daily_login: "Daily Login",
  ad_watch: "Ad Watched",
  share: "Share Bonus",
  signup_bonus: "Signup Bonus",
  subscription_purchase: "Subscription",
  subscription_renewal: "Renewal",
  subscription_cancelled: "Sub Cancelled",
  subscription_failed: "Sub Failed",
};

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessBanner(true);
      window.history.replaceState({}, "", "/pricing");
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const authed = await isAuthenticated();
      setLoggedIn(authed);
      if (!authed) return;
      try {
        const [p, history] = await Promise.all([
          getUserProfile(),
          getTokenHistory(),
        ]);
        setProfile(p);
        setTokenHistory(history.transactions);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    load();
  }, []);

  const isPaid = profile && profile.tier !== "free";

  async function handleSubscribe(planKey: string) {
    if (!loggedIn) {
      setShowSignup(true);
      return;
    }
    setLoading(planKey);
    try {
      const { checkout_url } = await createCheckoutSession(planKey);
      window.location.href = checkout_url;
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setLoading(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep access until the end of your billing period.")) return;
    try {
      await cancelSubscription();
      const p = await getUserProfile();
      setProfile(p);
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    }
  }

  function getPlanButton(plan: typeof PLANS[number]) {
    if (!plan.plan_key) {
      if (!isPaid) {
        return (
          <div
            className="mc-panel-inset w-full py-3 text-center text-[10px] text-[#55ff55]"
            style={FONT}
          >
            Current Plan
          </div>
        );
      }
      return null;
    }

    const isCurrentPlan =
      isPaid &&
      profile?.subscription_status === "active" &&
      ((plan.plan_key === "basic_weekly" && profile.tier === "basic" && profile.billing_period === "weekly") ||
       (plan.plan_key === "basic_monthly" && profile.tier === "basic" && profile.billing_period === "monthly") ||
       (plan.plan_key === "unlimited_monthly" && profile.tier === "unlimited"));

    if (isCurrentPlan) {
      return (
        <button
          className="mc-btn w-full py-3 text-[10px]"
          style={{ background: "#222222", borderColor: "#0d0d0d #3d3d3d #3d3d3d #0d0d0d", ...FONT }}
          onClick={handleCancel}
        >
          Cancel Plan
        </button>
      );
    }

    return (
      <button
        className="mc-btn w-full py-3 text-[10px]"
        style={FONT}
        onClick={() => handleSubscribe(plan.plan_key!)}
        disabled={loading === plan.plan_key}
      >
        {loading === plan.plan_key ? "Loading..." : "Subscribe"}
      </button>
    );
  }

  return (
    <>
      <Header />
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {successBanner && (
            <div
              className="mc-panel mb-8 p-4 text-center"
              style={{ borderColor: "#55ff55" }}
            >
              <p className="text-[10px] text-[#55ff55]" style={FONT}>
                Payment successful! Your subscription is being activated...
              </p>
            </div>
          )}

          <section className="text-center mb-16">
            <h1
              className="text-[20px] sm:text-[24px] text-[#d4a017] mb-3"
              style={FONT}
            >
              Tokens &amp; Pricing
            </h1>
            <p className="text-[10px] text-[#808080] mb-8" style={FONT}>
              Power your mod creation
            </p>

            <div className="mc-panel inline-block px-6 py-4">
              <p className="text-[8px] text-[#808080] mb-2" style={FONT}>
                YOUR BALANCE
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[28px] text-[#d4a017]" style={FONT}>
                  {loggedIn ? (profile?.token_balance ?? "...") : "—"}
                </span>
                <span className="text-[10px] text-[#808080]" style={FONT}>
                  tokens
                </span>
              </div>
              {isPaid && (
                <p className="text-[8px] text-[#55ff55] mt-2" style={FONT}>
                  {profile!.tier.toUpperCase()} • {profile!.billing_period}
                </p>
              )}
            </div>
          </section>

          <section className="mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="mc-panel p-6 flex flex-col relative"
                  style={
                    plan.highlight
                      ? {
                          borderColor: "#d4a017",
                          boxShadow: "0 0 12px rgba(212, 160, 23, 0.25)",
                        }
                      : undefined
                  }
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-[14px] left-1/2 -translate-x-1/2 px-3 py-1 text-[8px] text-[#0a0a0a] bg-[#d4a017]"
                      style={FONT}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <h3
                    className="text-[14px] mb-4"
                    style={{ ...FONT, color: plan.color }}
                  >
                    {plan.name}
                  </h3>

                  <div className="mb-6">
                    <span className="text-[24px] text-[#c0c0c0]" style={FONT}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-[10px] text-[#808080] ml-1" style={FONT}>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <ul className="flex-1 mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-[10px] mt-[1px]" style={{ color: plan.color }}>
                          +
                        </span>
                        <span
                          className="text-[9px] text-[#c0c0c0] leading-relaxed"
                          style={FONT}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {getPlanButton(plan)}
                </div>
              ))}
            </div>
          </section>

          {!isPaid && (
            <section className="mb-16">
              <h2
                className="text-[16px] text-[#d4a017] text-center mb-8"
                style={FONT}
              >
                Earn Free Tokens
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {EARN_METHODS.map((method) => (
                  <div key={method.title} className="mc-panel p-4 flex flex-col">
                    <div
                      className="text-[20px] mb-3"
                      style={{ ...FONT, color: method.color }}
                    >
                      {method.reward}
                    </div>
                    <h3 className="text-[10px] text-[#c0c0c0] mb-2" style={FONT}>
                      {method.title}
                    </h3>
                    <p
                      className="text-[8px] text-[#808080] leading-relaxed flex-1 mb-4"
                      style={FONT}
                    >
                      {method.desc}
                    </p>
                    {method.button ? (
                      <button className="mc-btn w-full py-2 text-[9px]">
                        {method.button}
                      </button>
                    ) : (
                      <div
                        className="mc-panel-inset w-full py-2 text-center text-[9px] text-[#55ff55]"
                        style={FONT}
                      >
                        Auto-earned
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2
              className="text-[16px] text-[#d4a017] text-center mb-8"
              style={FONT}
            >
              Token History
            </h2>

            <div className="mc-panel overflow-hidden">
              <div
                className="grid grid-cols-3 gap-4 px-4 py-3 border-b-[3px]"
                style={{ borderColor: "#3d3d3d" }}
              >
                <span className="text-[9px] text-[#808080]" style={FONT}>Date</span>
                <span className="text-[9px] text-[#808080]" style={FONT}>Action</span>
                <span className="text-[9px] text-[#808080] text-right" style={FONT}>Tokens</span>
              </div>

              {!loggedIn ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[9px] text-[#808080]" style={FONT}>
                    Sign in to see your token history
                  </p>
                </div>
              ) : tokenHistory.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[9px] text-[#808080]" style={FONT}>
                    No transactions yet
                  </p>
                </div>
              ) : (
                tokenHistory.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-3 gap-4 px-4 py-3"
                    style={
                      i < tokenHistory.length - 1
                        ? { borderBottom: "1px solid #1a1a1a" }
                        : undefined
                    }
                  >
                    <span className="text-[8px] text-[#808080]" style={FONT}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[8px] text-[#c0c0c0]" style={FONT}>
                      {REASON_LABELS[entry.reason] || entry.reason}
                    </span>
                    <span
                      className="text-[8px] text-right"
                      style={{ ...FONT, color: entry.amount > 0 ? "#55ff55" : "#ff5555" }}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : String(entry.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
