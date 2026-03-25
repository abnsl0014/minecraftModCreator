"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { getUserProfile, getTokenHistory, TokenTransaction } from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    badge: null,
    highlight: false,
    color: "#55ff55",
    features: [
      "5 tokens per day",
      "Basic mod creation",
      "Community gallery access",
      "Bedrock edition only",
    ],
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    badge: "POPULAR",
    highlight: true,
    color: "#d4a017",
    features: [
      "100 tokens per month",
      "Priority generation",
      "All mod categories",
      "Java + Bedrock editions",
      "Custom textures",
    ],
  },
  {
    name: "Unlimited",
    price: "$19.99",
    period: "/mo",
    badge: null,
    highlight: false,
    color: "#aa55ff",
    features: [
      "Unlimited creates",
      "Instant generation",
      "All features included",
      "Priority support",
      "Early access to new features",
    ],
  },
] as const;

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
};

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("Free");
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const authed = await isAuthenticated();
      setLoggedIn(authed);
      if (!authed) return;
      try {
        const [profile, history] = await Promise.all([
          getUserProfile(),
          getTokenHistory(),
        ]);
        setTokenBalance(profile.token_balance);
        setSelectedPlan(profile.tier === "free" ? "Free" : profile.tier === "pro" ? "Pro" : profile.tier === "unlimited" ? "Unlimited" : "Free");
        setTokenHistory(history.transactions);
      } catch (err) {
        console.error("Failed to load token data:", err);
      }
    }
    load();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* ===== HEADER ===== */}
          <section className="text-center mb-16">
            <h1
              className="text-[20px] sm:text-[24px] text-[#d4a017] mb-3"
              style={FONT}
            >
              Tokens &amp; Pricing
            </h1>
            <p
              className="text-[10px] text-[#808080] mb-8"
              style={FONT}
            >
              Power your mod creation
            </p>

            {/* Token balance display */}
            <div className="mc-panel inline-block px-6 py-4">
              <p className="text-[8px] text-[#808080] mb-2" style={FONT}>
                YOUR BALANCE
              </p>
              <div className="flex items-center justify-center gap-3">
                <span
                  className="text-[28px] text-[#d4a017]"
                  style={FONT}
                >
                  {loggedIn ? (tokenBalance ?? "...") : "—"}
                </span>
                <span
                  className="text-[10px] text-[#808080]"
                  style={FONT}
                >
                  tokens
                </span>
              </div>
            </div>
          </section>

          {/* ===== PRICING TIERS ===== */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="mc-panel p-6 flex flex-col relative"
                  style={
                    tier.highlight
                      ? {
                          borderColor: "#d4a017",
                          boxShadow: "0 0 12px rgba(212, 160, 23, 0.25)",
                        }
                      : undefined
                  }
                >
                  {/* Popular badge */}
                  {tier.badge && (
                    <div
                      className="absolute -top-[14px] left-1/2 -translate-x-1/2 px-3 py-1 text-[8px] text-[#0a0a0a] bg-[#d4a017]"
                      style={FONT}
                    >
                      {tier.badge}
                    </div>
                  )}

                  {/* Tier name */}
                  <h3
                    className="text-[14px] mb-4"
                    style={{ ...FONT, color: tier.color }}
                  >
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-6">
                    <span
                      className="text-[24px] text-[#c0c0c0]"
                      style={FONT}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span
                        className="text-[10px] text-[#808080] ml-1"
                        style={FONT}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="flex-1 mb-6 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span
                          className="text-[10px] mt-[1px]"
                          style={{ color: tier.color }}
                        >
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

                  {/* Select button */}
                  <button
                    className="mc-btn w-full py-3 text-[10px]"
                    style={
                      selectedPlan === tier.name
                        ? {
                            background: "#222222",
                            borderColor:
                              "#0d0d0d #3d3d3d #3d3d3d #0d0d0d",
                          }
                        : undefined
                    }
                    onClick={() => setSelectedPlan(tier.name)}
                  >
                    {selectedPlan === tier.name
                      ? "Current Plan"
                      : "Select Plan"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ===== EARN FREE TOKENS ===== */}
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
                  {/* Reward badge */}
                  <div
                    className="text-[20px] mb-3"
                    style={{ ...FONT, color: method.color }}
                  >
                    {method.reward}
                  </div>

                  <h3
                    className="text-[10px] text-[#c0c0c0] mb-2"
                    style={FONT}
                  >
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

          {/* ===== TOKEN HISTORY ===== */}
          <section>
            <h2
              className="text-[16px] text-[#d4a017] text-center mb-8"
              style={FONT}
            >
              Token History
            </h2>

            <div className="mc-panel overflow-hidden">
              {/* Table header */}
              <div
                className="grid grid-cols-3 gap-4 px-4 py-3 border-b-[3px]"
                style={{ borderColor: "#3d3d3d" }}
              >
                <span className="text-[9px] text-[#808080]" style={FONT}>
                  Date
                </span>
                <span className="text-[9px] text-[#808080]" style={FONT}>
                  Action
                </span>
                <span
                  className="text-[9px] text-[#808080] text-right"
                  style={FONT}
                >
                  Tokens
                </span>
              </div>

              {/* Table rows */}
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
