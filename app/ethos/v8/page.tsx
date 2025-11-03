"use client";

import { ArrowUpRight } from "lucide-react";
import { CombinedLogo } from "@/components/CombinedLogo";

export default function EthosV8Page() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="pt-28 pb-8 md:pt-36 md:pb-16">
            <div className="max-w-2xl text-left">
              <div className="flex items-center justify-start mb-4">
                <CombinedLogo />
              </div>
              <a
                href="https://openship.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-muted-foreground mb-4 uppercase font-medium tracking-wide hover:text-foreground transition-colors"
              >
                An Openship initiative <ArrowUpRight className="size-4 ml-1"/>
              </a>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent font-instrument-serif">
                the / marketplace
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="max-w-2xl space-y-8">
          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Office Chair Empire That Wasn't</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              In the early 2010s, a friend built a thriving business selling office chairs on Amazon.
              He became one of the platform's largest sellers, with thousands of customers and steady growth.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Then Amazon struck. They traced his supply chain, sourced the same chairs from his manufacturer,
              and launched them under Amazon Basics at a price lower than his cost. Overnight, his business
              disappeared. Years of work, customer trust, and expertise—wiped out by a platform that could
              copy what worked and crush the original creator.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This isn't just his story. A leather bag maker does $35,000 monthly on Amazon. After referral
              fees, sponsored ads, and FBA costs, Amazon takes $9,450—27% of her revenue. Year one: $113,400
              in fees. Year five: $567,000. That's not payment for infrastructure. That's rent for being discovered.
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
              This sparked the core idea: if sellers already have all the infrastructure—cart, checkout, payment
              processing—then a marketplace doesn't need to build any of that. It just needs to connect to what
              already exists. Discovery without infrastructure. Zero overhead, zero fees.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              But then I realized the problem: that infrastructure itself is closed source. You're not escaping
              platform dependence by moving from Amazon to Shopify. You're just trading one owner for another.
              Shopify controls the code, sets the terms, and can change the rules whenever they want. When they
              removed their Amazon sales channel over a payment dispute, thousands of merchants lost a critical
              integration overnight.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              True independence requires owning the infrastructure. Which meant that before I could build a
              decentralized marketplace, I first had to build the platforms that merchants could actually own.
              The marketplace was the apple pie. But first, I had to invent the universe.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What if discovery didn't cost anything?</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge 10-30% per transaction because they built massive infrastructure—payment
              processing, cart systems, checkout flows, databases, fraud detection. All that overhead requires revenue.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              But what if stores already had that infrastructure? What if every store already had their own cart,
              checkout, and payment processor? Then the marketplace wouldn't need to build anything. It would just
              make those stores discoverable.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              That's what this is. A marketplace that works like a directory—connecting you to independent stores
              right here, in the conversation. Ask for a product, it appears. Pick options, add to cart, enter shipping,
              complete payment. All conversationally. When you checkout, payment goes directly to the store's account.
              We don't touch it. We don't see it. We don't take a cut. Zero transaction fees.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The chat is the store</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Shopping doesn't need pages anymore. The entire experience—products, cart, checkout, payment—happens
              in a conversation. This is powered by MCP UI (Model Context Protocol UI), which lets AI render
              interactive store interfaces directly in chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We took a complete e-commerce storefront and broke it down into conversational components. Product
              cards, shopping cart, checkout form, payment interface—all embedded in AI chat. Each store's full
              checkout flow, rendered in real-time, without leaving the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every store runs their own platform—Openfront, Shopify, WooCommerce, whatever they want. They keep
              their customer data, process payments through their own accounts, manage orders in their own system.
              We query their API and render the experience conversationally.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Your data goes to one store, period</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you checkout on Amazon, your data goes into their database. They use it to recommend products,
              target ads, and decide what to sell under Amazon Basics. Your data is Amazon's most valuable asset.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace works differently. When you buy something, your email, shipping address, and payment
              details go directly to that store's system. Not to us. Not to a shared database. Just to that one
              store. We literally can't track your behavior across stores because we don't store it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Each transaction is independent. Buy from three stores? That's three separate checkouts. No cross-store
              profile. No behavior tracking. No data aggregation. The technical reason: we don't have a database.
              We query stores in real-time, render checkout conversationally, then step aside.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">List once, appear everywhere</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We're standardizing the interface. Every store exposes the same API structure—products, cart, checkout,
              payment. Every marketplace uses the same protocol to query those stores. It's like RSS for commerce.
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
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Building Openfront: the universe before the apple pie</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace works with any e-commerce platform—Shopify, WooCommerce, whatever. But for this
              model to truly work, stores need to own their infrastructure. If every store runs on proprietary
              platforms, they're dependent. Rules can change. Fees can rise. Integrations can disappear.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Before we could build an open source decentralized marketplace, we had to first invent the universe.
              We built Openfront—open source e-commerce platforms for every vertical: retail, restaurants,
              salons, barbershops, hotels. Businesses fork the code, run it themselves, modify it however they
              want. True ownership.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Openfront isn't required to use this marketplace. But it's our answer to "what should businesses
              run if they want complete independence." Together, Openfront and this marketplace create fully
              decentralized commerce: businesses own their platforms, marketplaces provide discovery without rent,
              and customers know their data stays with the stores they trust.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone can run their own marketplace</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is fully open source. Fork the code, add your own stores to a configuration file, deploy your
              own marketplace. No permission required. No fees. No platform approval.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a marketplace for sustainable brands in your region? Add those stores. Building one for
              your city's independent shops? Connect them. Creating a niche marketplace for vintage collectibles?
              Curate the stores that matter to your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces make it impossible to compete because of network effects. You can't compete
              with Amazon because they have millions of sellers and customers. The network is the moat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But when stores aren't locked in, when there's no central database, when anyone can fork the code—network
              effects work differently. Stores exist independently. Customers can find them through any marketplace.
              Multiple marketplaces can list the same stores for different audiences. Power distributes instead of
              concentrating. Domain expertise becomes the moat, not infrastructure.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What we actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplaces claim they provide value through infrastructure—payment processing, fraud detection,
              customer service. But that's just overhead they built to justify their fees. The real value is curation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When customers come to a trusted marketplace, they're more likely to trust the stores listed there.
              Marketplaces signal which stores are legitimate, which have been vetted, which are worth your time.
              That's the actual value.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The stores in this marketplace are in our configuration file—you can view it on GitHub. We've personally
              used these stores, checked their shipping, verified their customer service. That's what we provide:
              a signal that these stores are worth your time. If you find a store here and later buy directly from
              them, we don't get a cut. We're not rent-seeking. We're providing discovery.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Addressing the obvious questions</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"If you charge zero fees, how do you make money?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We don't, yet. Right now this is a demonstration that the model works. Our business is building
              Openfront—the platforms that businesses actually own. This marketplace proves that ownable platforms
              can connect without rent-seeking middlemen.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Long-term, marketplace operators could charge stores a flat monthly fee for inclusion or earn affiliate
              commissions from sales. The point is: the revenue model doesn't require transaction fees because the
              infrastructure doesn't require overhead. We're connecting to platforms that merchants already run—whether
              they're hosting with us or self-hosting Openfront. The infrastructure already exists. We just make it
              discoverable.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"What stops you from becoming the next Amazon?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The code is open source. If we started charging 15% or playing algorithmic favorites, anyone could
              fork and launch a competing marketplace in an afternoon. Stores aren't locked in. They don't lose
              reviews or rankings by connecting to a different marketplace. The power is structural, not just philosophical.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"Why would stores trust this?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because there's nothing to trust. We don't hold their money. We don't own their customers. We don't
              control their data. We're querying their existing API and rendering it conversationally. The worst
              case is we shut down and nothing happens to them. They keep operating exactly as before. That's not
              trust. That's architecture.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Path Forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The office chair story doesn't have to be yours. The $567,000 in fees doesn't have to be yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're a merchant:</strong> Deploy Openfront or run any platform that exposes the standard
              interface. Set up once, appear in every marketplace that uses this standard. No per-marketplace integrations.
              No lock-in. Your first customer costs $0 in platform fees. Your 10,000th customer costs $0. You keep
              your customer data, process payments on your terms, fulfill orders your way. As new curated marketplaces
              appear for different niches and regions, you're automatically compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you want to build a marketplace:</strong> Fork this code. Add stores that matter to your
              community. Deploy it. Any store exposing the standard interface automatically works—no custom integrations
              required. You don't need permission, capital, or technical infrastructure. Your competitive advantage
              is knowing which stores to trust, not building infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're shopping:</strong> Know that when you buy from a store in this marketplace, your data
              goes directly to them—not to a central database. No cross-store tracking. No behavior profiling.
              No data reselling. Just a direct connection between you and the business you're buying from, facilitated
              through a conversational interface.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is commerce where merchants own the infrastructure, customers control their data, and discovery
              happens through open protocols instead of closed algorithms. No landlords. No gatekeepers. No one can
              copy your success and crush you with it. Discovery doesn't have to cost anything. The question isn't
              "can this work?" It's "why are we still paying rent?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
