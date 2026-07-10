import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Go to dashboard" : "Create free account";

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--board-bg)]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-mono-board text-lg tracking-widest text-[var(--amber)]">
            NUMLYSMS
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-primary)]">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)]">How it works</a>
            <a href="#pricing" className="hover:text-[var(--text-primary)]">Pricing</a>
            <a href="#faq" className="hover:text-[var(--text-primary)]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button variant="secondary" className="!px-3 !py-2 text-xs sm:text-sm sm:!px-4">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-2">
                  Log in
                </Link>
                <Link href="/signup">
                  <Button className="!px-3 !py-2 text-xs sm:text-sm sm:!px-4">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="split-flap inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono-board text-[var(--mint)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint)]" />
            LIVE &mdash; codes arriving in seconds
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold leading-tight max-w-3xl">
            Virtual numbers. Real SMS.
            <br />
            <span className="text-[var(--amber)]">No waiting at the gate.</span>
          </h1>

          <p className="text-[var(--text-muted)] mt-5 max-w-xl text-base sm:text-lg">
            Rent a phone number in seconds and watch verification codes land in
            your dashboard live &mdash; like a departure board, but for SMS.
            Built for signups, account verification, and app testing.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href={primaryHref}>
              <Button className="w-full sm:w-auto !px-6 !py-3 text-sm">{primaryLabel}</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" className="w-full sm:w-auto !px-6 !py-3 text-sm">
                See how it works
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 max-w-lg">
            <div>
              <div className="font-mono-board text-xl sm:text-2xl text-[var(--text-primary)]">190+</div>
              <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">countries</div>
            </div>
            <div>
              <div className="font-mono-board text-xl sm:text-2xl text-[var(--text-primary)]">1000+</div>
              <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">services supported</div>
            </div>
            <div>
              <div className="font-mono-board text-xl sm:text-2xl text-[var(--text-primary)]">24/7</div>
              <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">support &amp; delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Departure board demo strip */}
      <section className="border-y border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 overflow-x-auto">
          <div className="flex gap-3 min-w-max font-mono-board text-xs sm:text-sm">
            {[
              { num: "+1 302 ••• 4471", svc: "WhatsApp", status: "ARRIVED", color: "var(--mint)" },
              { num: "+44 7•• ••• 902", svc: "Google", status: "ARRIVED", color: "var(--mint)" },
              { num: "+234 80• ••• 214", svc: "Telegram", status: "WAITING", color: "var(--amber)" },
              { num: "+91 98••• •• 33", svc: "Instagram", status: "ARRIVED", color: "var(--mint)" },
              { num: "+27 6•• ••• 087", svc: "Uber", status: "WAITING", color: "var(--amber)" },
            ].map((row, i) => (
              <div key={i} className="split-flap flex items-center gap-3 px-4 py-2.5 whitespace-nowrap">
                <span className="text-[var(--text-primary)]">{row.num}</span>
                <span className="text-[var(--text-muted)]">{row.svc}</span>
                <span className="flex items-center gap-1.5" style={{ color: row.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.color }} />
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-xs font-mono-board text-[var(--amber)] tracking-wider mb-3">FEATURES</div>
        <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl">
          Everything you need to verify, without the friction
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {[
            {
              title: "SMS verification",
              desc: "Receive OTP and verification codes instantly on a temporary number. Keep your personal number private.",
            },
            {
              title: "Instant activation",
              desc: "Pick a country and service, pay, and get a working number in seconds. No paperwork, no SIM to wait for.",
            },
            {
              title: "Live inbox",
              desc: "Watch codes arrive in real time on your order page, styled like a live departure board.",
            },
            {
              title: "Automatic refunds",
              desc: "If no message arrives before your number expires, you're refunded to your wallet automatically.",
            },
          ].map((f, i) => (
            <div key={i} className="panel p-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--panel-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--amber)] font-mono-board text-sm mb-4">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-xs font-mono-board text-[var(--amber)] tracking-wider mb-3">HOW IT WORKS</div>
          <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl">Three steps, no learning curve</h2>

          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {[
              { step: "1", title: "Fund your wallet", desc: "Top up in Naira with a card or transfer. Funds land instantly." },
              { step: "2", title: "Choose country & service", desc: "Search from 190+ countries and 1000+ supported apps and platforms." },
              { step: "3", title: "Receive your code", desc: "Your number activates immediately and the SMS shows up live in your dashboard." },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="font-mono-board text-4xl text-[var(--border)]">{s.step}</div>
                <h3 className="font-medium mt-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us / trust */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-xs font-mono-board text-[var(--amber)] tracking-wider mb-3">WHY NUMLYSMS</div>
        <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl">Built to be trusted with every code</h2>

        <div className="grid sm:grid-cols-3 gap-6 mt-10">
          <div className="panel p-6">
            <h3 className="font-medium text-[var(--mint)]">Transparent pricing</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Pay only for numbers you use. No monthly minimums or hidden fees,
              and failed deliveries are refunded automatically to your wallet.
            </p>
          </div>
          <div className="panel p-6">
            <h3 className="font-medium text-[var(--sky)]">Secure by default</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Your account and wallet are protected with encrypted sessions,
              audited transactions, and abuse detection on every order.
            </p>
          </div>
          <div className="panel p-6">
            <h3 className="font-medium text-[var(--amber)]">Support that responds</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              Real people behind the dashboard. Reach out any time an order
              looks off and we'll sort it out quickly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-y border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-xs font-mono-board text-[var(--amber)] tracking-wider mb-3">PRICING</div>
          <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl">Pay as you go, in Naira</h2>
          <p className="text-[var(--text-muted)] mt-3 max-w-xl">
            Prices vary by country and service. Fund your wallet, browse live
            rates in the dashboard, and only pay for the numbers you order.
          </p>
          <Link href={primaryHref} className="inline-block mt-6">
            <Button className="!px-6 !py-3 text-sm">{user ? "View live pricing" : "Sign up to view pricing"}</Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-xs font-mono-board text-[var(--amber)] tracking-wider mb-3">FAQ</div>
        <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl mb-10">Frequently asked questions</h2>

        <div className="space-y-4 max-w-3xl">
          {[
            {
              q: "How fast do I get a number?",
              a: "Numbers activate immediately after payment. Most codes arrive within seconds to a couple of minutes, depending on the service.",
            },
            {
              q: "What happens if no code arrives?",
              a: "If a message doesn't arrive before your number expires, the order is automatically refunded back to your wallet balance.",
            },
            {
              q: "Which countries and services are supported?",
              a: "We support 190+ countries and 1000+ services, from social apps to banking and delivery platforms. Full list is available after signup.",
            },
            {
              q: "Is my payment and data secure?",
              a: "Yes. All wallet transactions are encrypted and logged, and your account is protected with secure authentication throughout.",
            },
          ].map((f, i) => (
            <div key={i} className="panel p-5">
              <h3 className="font-medium">{f.q}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Ready to get your first number?</h2>
          <p className="text-[var(--text-muted)] mt-3 max-w-md mx-auto">
            Create a free account, fund your wallet, and receive your first
            verification code in minutes.
          </p>
          <Link href={primaryHref} className="inline-block mt-6">
            <Button className="!px-6 !py-3 text-sm">{primaryLabel}</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-mono-board text-sm tracking-widest text-[var(--amber)]">NUMLYSMS</div>
            <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xs">
              Virtual numbers and instant SMS verification, delivered live.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text-primary)]">Features</a>
            <a href="#pricing" className="hover:text-[var(--text-primary)]">Pricing</a>
            <a href="#faq" className="hover:text-[var(--text-primary)]">FAQ</a>
            <Link href="/login" className="hover:text-[var(--text-primary)]">Log in</Link>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 sm:px-6 py-4 text-xs text-[var(--text-muted)] text-center">
          © {new Date().getFullYear()} Numlysms. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
