"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMinor } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Country = { code: string; name: string };
type Service = { code: string; name: string; priceMinor: number; currency: string };
type Platform = { label: string; emoji: string; color: string; match: string[] };

// Quick-select shortcuts for the platforms people actually come here for.
// Using color + emoji rather than official logos deliberately — keeps this
// visually recognizable without reproducing anyone's brand mark.
const PLATFORMS: Platform[] = [
  { label: "WhatsApp", emoji: "💬", color: "#25D366", match: ["whatsapp"] },
  { label: "Telegram", emoji: "✈️", color: "#229ED9", match: ["telegram"] },
  { label: "Instagram", emoji: "📷", color: "#E1306C", match: ["instagram"] },
  { label: "Facebook", emoji: "👍", color: "#1877F2", match: ["facebook"] },
  { label: "TikTok", emoji: "🎵", color: "#111111", match: ["tiktok"] },
  { label: "Google", emoji: "✉️", color: "#EA4335", match: ["google"] },
];

export default function BuyPage() {
  const router = useRouter();
  const { show } = useToast();
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [services, setServices] = useState<Service[] | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => setCountries(data.countries))
      .catch(() => show("Couldn't load countries. Pull to refresh.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectCountry(c: Country) {
    setCountry(c);
    setService(null);
    setServices(null);
    fetch(`/api/catalog?country=${c.code}`)
      .then((r) => r.json())
      .then((data) => setServices(data.services))
      .catch(() => show("Couldn't load services for this country.", "error"));
  }

  function togglePlatform(p: Platform) {
    setPlatform((current) => (current?.label === p.label ? null : p));
    setService(null);
  }

  // Filter the loaded services down to whichever platform is selected, but
  // never leave the user with an empty screen — if nothing matches, fall
  // back to showing everything with a note, rather than a dead end.
  const { visibleServices, filterMissed } = useMemo(() => {
    if (!services) return { visibleServices: null, filterMissed: false };
    if (!platform) return { visibleServices: services, filterMissed: false };

    const matched = services.filter((s) =>
      platform.match.some((keyword) => s.name.toLowerCase().includes(keyword))
    );
    return matched.length > 0
      ? { visibleServices: matched, filterMissed: false }
      : { visibleServices: services, filterMissed: true };
  }, [services, platform]);

  async function handlePurchase() {
    if (!country || !service || purchasing) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: country.code,
          countryName: country.name,
          serviceCode: service.code,
          serviceName: service.name,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "insufficient_balance") {
          show("Insufficient balance — fund your wallet to continue.", "error");
        } else {
          show(data.message ?? "Purchase failed. Please try again.", "error");
        }
        return;
      }
      show("Number purchased — waiting for SMS.", "success");
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch {
      show("Network error. Please try again.", "error");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-medium">Buy a virtual number</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Get a number that receives SMS instantly — verify WhatsApp, Telegram,
          Instagram, Facebook, TikTok, and more.
        </p>
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">Popular platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platform?.label === p.label;
            return (
              <button
                key={p.label}
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-2 pl-2 pr-3 py-2 rounded-full border text-sm transition-all ${
                  active
                    ? "border-transparent text-white"
                    : "border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] hover:border-[var(--text-muted)]"
                }`}
                style={active ? { background: p.color } : undefined}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{ background: active ? "rgba(255,255,255,0.2)" : `${p.color}1A` }}
                >
                  {p.emoji}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">1. Country</label>
        {countries === null ? (
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <select
            value={country?.code ?? ""}
            onChange={(e) => {
              const c = countries.find((c) => c.code === e.target.value);
              if (c) selectCountry(c);
            }}
            className="w-full rounded-lg bg-[var(--panel-raised)] border border-[var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50"
          >
            <option value="" disabled>
              Select a country
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {country && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-[var(--text-muted)]">2. Service</label>
            {platform && (
              <button
                onClick={() => setPlatform(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                Showing {platform.label} <span aria-hidden>✕</span>
              </button>
            )}
          </div>

          {services === null ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : services.length === 0 ? (
            <div className="panel p-6 text-center text-sm text-[var(--text-muted)]">
              No services available for {country.name} right now.
            </div>
          ) : (
            <div className="space-y-2">
              {filterMissed && (
                <p className="text-xs text-[var(--text-muted)] px-1">
                  No {platform?.label} listing for {country.name} right now — showing all services instead.
                </p>
              )}
              {visibleServices?.map((s) => (
                <button
                  key={s.code}
                  onClick={() => setService(s)}
                  className={`w-full panel flex items-center justify-between p-4 text-left transition-colors ${
                    service?.code === s.code ? "border-[var(--amber)]" : "hover:border-[var(--text-muted)]"
                  }`}
                >
                  <span className="text-sm">{s.name}</span>
                  <span className="font-mono-board text-sm text-[var(--mint)]">
                    {formatMinor(s.priceMinor, s.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {service && (
        <div className="panel p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Total</span>
            <span className="font-mono-board text-[var(--mint)]">
              {formatMinor(service.priceMinor, service.currency)}
            </span>
          </div>
          <Button onClick={handlePurchase} loading={purchasing} className="w-full">
            Buy number
          </Button>
        </div>
      )}
    </div>
  );
}
