"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { MarketplaceSidebar } from "../_components/marketplace-sidebar";
import { useChatThreads } from "@/features/marketplace/hooks/use-chat-threads";
import { MarketplaceFederationVisual } from "./_components/marketplace-federation-visual";

export default function EthosPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { threads, activeThreadId, isHydrated, createThread, selectThread } = useChatThreads();

  const openNewChat = () => {
    createThread();
    router.push("/");
  };
  const openThread = (threadId: string) => {
    selectThread(threadId);
    router.push("/");
  };

  if (!isHydrated) return null;

  return (
    <div className="flex h-dvh gap-0 overflow-hidden bg-canvas p-0 text-ink sm:p-2.5 lg:pl-0">
      <MarketplaceSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onNew={openNewChat}
        onSelect={openThread}
      />
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-0 border-line bg-page shadow-none sm:rounded-[14px] sm:border sm:shadow-card">
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
          <button
            type="button"
            aria-label="Open sidebar"
            aria-controls="marketplace-sidebar"
            aria-expanded={mobileSidebarOpen}
            title="Open sidebar"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex size-6 shrink-0 items-center justify-center text-ink-3 transition-[color,transform] duration-150 hover:text-ink active:scale-[.96] lg:hidden"
          >
            <PanelLeftOpen className="size-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="marketplace-sidebar"
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="hidden size-6 shrink-0 items-center justify-center text-ink-3 transition-[color,transform] duration-150 hover:text-ink active:scale-[.96] lg:flex"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-3.5" strokeWidth={1.8} /> : <PanelLeftClose className="size-3.5" strokeWidth={1.8} />}
          </button>
          <div className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
          <Link href="/" className="flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink">
            <ArrowLeft className="size-3.5" />
            Marketplace
          </Link>
          <div className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
          <span className="px-1 text-[12.5px] font-medium text-ink-3">Ethos</span>
        </div>
        <article className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-dashed border-line px-5 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto max-w-2xl text-left">
              <a
                href="https://openship.org/products/marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-5 flex items-center gap-1.5 font-mono text-[12px] font-semibold uppercase tracking-[.06em] text-ink-2 transition-colors hover:text-ink sm:text-[12.5px]"
              >
                An Openship initiative <ArrowUpRight className="size-3.5" />
              </a>
              <h1 className="ethos-title-gradient font-[family-name:var(--font-brand)] text-5xl font-semibold uppercase sm:text-6xl">
                A Market Without Masters
              </h1>
              <div className="mt-5 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://avatars.githubusercontent.com/u/34615258"
                  alt="Junaid Kabani"
                  width="48"
                  height="48"
                  className="size-12 shrink-0 rounded-[12px] border border-line object-cover shadow-btn"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-ink">Junaid Kabani</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.07em] text-ink-3">Founder &amp; CEO</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
                    <a href="https://github.com/junaid33" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">GitHub</a>
                    <span className="text-ink-3" aria-hidden="true">·</span>
                    <a href="https://www.linkedin.com/in/junaid-kabani" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">LinkedIn</a>
                  </div>
                </div>
              </div>
              <MarketplaceFederationVisual />
            </div>
          </div>

          <div className="ethos-document px-5 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto max-w-2xl divide-y divide-dashed divide-line">
          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Office Chair Empire That Wasn't</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              In the early 2010s, a friend built a thriving business selling office chairs on Amazon.
              He became one of the platform's largest sellers, with thousands of customers and steady growth.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Then Amazon struck. They traced his supply chain, sourced the same chairs from his manufacturer,
              and launched them under Amazon Basics at a price lower than his cost. Overnight, his business
              disappeared. Years of work, customer trust, and expertise, wiped out by a platform that could
              copy what worked and crush the original creator.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Marketplace Feudalism</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              In the mid-2010s, I started noticing a pattern. Amazon sellers were switching to Shopify in droves.
              They'd build their own stores, connect them to Amazon and other marketplaces, and finally feel like
              they owned something. The pitch was simple: instead of being trapped on Amazon, you could have your
              own infrastructure that connected to every channel.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That was the first version of the idea: if sellers already have cart, checkout, and payment processing,
              then a marketplace doesn't need to rebuild any of it. It just needs to connect to what already exists.
              Discovery without the overhead.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Then the problem became obvious. That infrastructure was closed too. Moving from Amazon to Shopify
              wasn't really escaping platform dependence. It was just choosing a different owner. Shopify controls
              the code, sets the terms, and can change the rules whenever it wants. When they removed their Amazon
              sales channel over a payment dispute, thousands of merchants lost a critical integration overnight.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              I wanted to build the marketplace first, but the deeper I got, the more obvious it became that the hard
              part came earlier, the infrastructure itself.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Building Openfront</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We built <a href="https://github.com/openshiporg/openfront" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">Openfront</a>: open source e-commerce platforms for every vertical. <a href="https://openship.org" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">Retail stores, restaurants,
              salons, barbershops, hotels</a>. Each one comes with the complete source code, can be self-hosted or
              hosted with us, and includes built-in AI that understands your entire business.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Businesses fork the code, run it themselves, modify it however they want. True ownership. When you
              deploy Openfront, you're not renting infrastructure. You're owning it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Openfront isn't required to use this marketplace. But it's the cleanest answer I know if a business
              actually wants to own the stack it's running on. That's the bigger point for me. The marketplace can
              do discovery, but the store should still own the system underneath it.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Discovery Without Rent</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Discovery doesn't have to cost a percentage. Traditional platforms charge 10-30% to finance
              infrastructure they insist on owning: carts, checkouts, fraud tooling, data lakes. If stores
              already run all of that, a marketplace doesn't need to rebuild it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That's what this is. A marketplace that works like a directory, connecting you to independent stores
              right here, in the conversation. Ask for a product, it appears. Pick options, add to cart, enter shipping,
              complete payment. All conversationally. When you checkout, payment goes directly to the store's account.
              We don't touch it. We don't see it. We don't take a cut.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              When the marketplace stops building rails it doesn't need, the rationale for transaction taxes disappears.
              Connect to what exists, don't replicate it.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Conversation Is the Store</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Pages are optional now. The full shopping flow (browse, options, cart, shipping, payment) happens
              inside a conversation and it's still the store's flow, not ours. Protocols like <a href="https://modelcontextprotocol.io/extensions/apps/overview" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">MCP Apps</a> make it
              possible to render a store's components directly in chat without copying state.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We took a complete e-commerce storefront and broke it down into conversational components. Product
              cards, shopping cart, checkout form, payment interface, all embedded in AI chat. Each store's full
              checkout flow, rendered in real-time, without leaving the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every store runs their own platform: Openfront, Shopify, WooCommerce, whatever they want. They keep
              their customer data, process payments through their own accounts, manage orders in their own system.
              We query their API and render the experience conversationally.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Privacy Without Loopholes</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Privacy is consent practiced, not promised. Each checkout is scoped to a single store. When you
              buy something, your email, shipping address, and payment details go directly to that store's system.
              Not to us. Not to a shared database. Just to that one store.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We literally can't track your behavior across stores because we don't store it. There are no
              cross-store identifiers, no shadow profiles, no quiet "personalization" that bleeds across contexts.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Each transaction is independent. Buy from three stores? That's three separate checkouts. No cross-store
              profile. No behavior tracking. No data aggregation. The technical reason: we don't have a database.
              We query stores in real-time, render checkout conversationally, then step aside.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Standardize the Interface</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The idea is pretty simple, stores expose a small standard surface for catalog, offer, cart, checkout,
              payment, and order status. Marketplaces talk to that instead of building a custom integration every time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              For merchants: set up your store once, and it automatically works with every marketplace using this
              standard. No per-marketplace integration. No special plugins for each marketplace. Someone launches
              a vintage furniture marketplace tomorrow? If your store exposes the standard interface, you're already
              compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Compare to today: list on Amazon, build for Amazon's Seller Central. List on eBay, build for eBay's
              system. List on Etsy, build for Etsy's dashboard. Each marketplace has its own proprietary integration,
              its own lock-in. You're building their business, not yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              With a standardized interface, new marketplaces can appear without stores changing anything. The more
              marketplaces that use this standard, the more valuable it becomes for stores. The more stores that
              expose it, the easier to launch new marketplaces. Power distributes instead of concentrating.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Curation Is the Service</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Infrastructure is not what buyers come for. Taste is. The real value a marketplace provides is
              the editorial layer that helps buyers trust what they find. Operators do the work: test orders,
              customer service checks, warranty clarity, fulfillment reliability. That signal is the product.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The stores in this marketplace are in our <a href="https://github.com/openshiporg/marketplace/blob/master/marketplace.config.json" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">configuration file, which you can view on GitHub</a>. We've personally
              used these stores, checked their shipping, verified their customer service. That's what we provide:
              a signal that these stores are worth your time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              If you find a store here and later buy directly from them, that's success, not leakage. Discovery
              should compound for the merchant, not for the middleman.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone Can Curate Their Own Marketplace</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is <a href="https://github.com/openshiporg/marketplace" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">fully open source</a>. Open the marketplace, edit the store configuration directly in chat,
              save it to your browser. Your curated list persists across sessions. No deployment, no hosting, no technical setup.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a marketplace for sustainable brands in your region? Add those stores. Building one for
              your city's independent shops? Connect them. Creating a niche marketplace for vintage collectibles?
              Edit the config, add the stores that matter to your community, and start shopping.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces make it impossible to compete because of network effects. You can't compete
              with Amazon because they have millions of sellers and customers. The network is the moat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              When stores aren't locked in and anyone can edit the config, network effects change shape. The same store
              can appear in multiple curated marketplaces serving different audiences. Your competitive advantage becomes
              knowing which stores to trust, not controlling the infrastructure.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">How We Get Paid (and How We Don't)</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"If you charge zero fees, how do you make money?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We sell the software. Openfront is open source e-commerce platforms for every vertical: retail stores,
              restaurants, salons, barbershops, hotels. Businesses get the complete source code, <a href="https://docs.openship.org" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">self-host or host
              with us</a>, and own their entire commerce stack. That's our business. That's what we sell.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace connects to stores running their own stack. Because they already have cart, checkout,
              payment processing, the marketplace just provides discovery. No infrastructure to build means no transaction
              fees required. We're not capturing payments. We're connecting to stores that process their own.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplace operators who fork this can charge flat listing fees, affiliate commissions, or subscriptions.
              The model works because discovery is separate from infrastructure. What operators can't do: skim payments,
              sell behavioral data, or hide listings behind pay-to-play algorithms.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Our revenue: selling Openfront platforms. The more businesses that own their stack, the more valuable
              this decentralized model becomes. Marketplaces provide discovery. Stores own everything else.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Governance With a Built-In Exit</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"What stops you from becoming the next Amazon?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The code is open source. If we start playing games, people can fork it and compete with us. That's how
              it should be.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When new marketplaces appear, stores connect effortlessly. No new dashboards to learn. No new platforms
              to log into. Orders from every marketplace flow directly into their existing system. A store running
              Openfront processes orders the same way whether they come from this marketplace, ten other marketplaces,
              or their own direct site. One system. One workflow. Infinite discovery channels.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"Why would stores trust this?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because there's less to trust in the first place. We don't hold their money. We don't own their
              customers. We don't control their data. We're querying their existing API and rendering it
              conversationally. If we shut down, they keep operating exactly as before.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Path Forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The office chair story doesn't have to be yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're a merchant:</strong> <a href="https://docs.openship.org" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">Deploy Openfront</a> or run any platform that exposes the <a href="https://github.com/openshiporg/marketplace/blob/master/app/api/mcp-transport/adapters/types.ts" target="_blank" rel="noopener noreferrer" className="text-fd-foreground underline hover:text-fd-muted-foreground transition-colors">standard
              interface</a>. Set up once, appear in every marketplace that uses this standard. No per-marketplace integrations.
              No lock-in. Your first customer costs $0 in platform fees. Your 10,000th customer costs $0. You keep
              your customer data, process payments on your terms, fulfill orders your way. As new curated marketplaces
              appear for different niches and regions, you're automatically compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you want to build a marketplace:</strong> Fork this code. Add stores that matter to your
              community. Deploy it. Any store exposing the standard interface automatically works, no custom integrations
              required. You don't need permission, capital, or technical infrastructure. Your competitive advantage
              is knowing which stores to trust, not building infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're shopping:</strong> Know that when you buy from a store in this marketplace, your data
              goes directly to them, not to a central database. No cross-store tracking. No behavior profiling.
              No data reselling. Just a direct connection between you and the business you're buying from, facilitated
              through a conversational interface.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The model is straightforward, stores own their stack, customers deal directly with the store they're
              buying from, and marketplaces compete on curation instead of ownership. No platform in the middle
              deciding who matters. No one in a position to copy what works and bury the original seller.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Pledge</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If this works, it works because nobody has to ask permission, nobody has to give up their processor,
              and nobody gets trapped.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              If you sell, expose the interface and keep your processor. If you curate, build a directory and be clear
              about your standards. If you build, harden the spec, write adapters, improve the tests, and fork it if
              you need to.
            </p>
          </div>

            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
