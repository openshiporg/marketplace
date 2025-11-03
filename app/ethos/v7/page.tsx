"use client";

import { ArrowUpRight } from "lucide-react";
import { CombinedLogo } from "@/components/CombinedLogo";

export default function EthosV7Page() {
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
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                marketplace
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
              In the early 2010s, a friend of mine built a thriving business selling office chairs on Amazon.
              He became one of the platform's largest sellers, with thousands of happy customers and steady growth.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Then Amazon struck. They traced his supply chain, sourced the same chairs from his manufacturer,
              and launched them under Amazon Basics at a price lower than his cost. Overnight, his business
              disappeared. Years of work, customer trust, and expertise were wiped out by a platform that
              could copy what worked and crush the original creator.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This isn't just his story. It's happening everywhere. A leather bag maker I know does $35,000
              in monthly revenue on Amazon. After referral fees (15%), sponsored ads, and FBA costs, Amazon
              takes $9,450—27% of her revenue. Year one: $113,400 in fees. Year five: $567,000. That's not
              payment for infrastructure. That's rent for being discovered.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Marketplace Feudalism</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Modern marketplaces create a kind of digital feudalism. Independent businesses struggle while
              the platforms they depend on face no real competition. You can't simply move from Amazon to
              eBay—shifting means starting over, losing reviews, retraining algorithms, abandoning years
              of optimization.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Even platforms that claim you "own your store" still control the rules, take transaction fees,
              and can change terms whenever they want. Shopify once removed their Amazon sales channel over
              a payment dispute, cutting off thousands of merchants overnight. You may have more freedom
              than selling on Amazon, but you're still operating on someone else's platform.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The result is an ecosystem where rules change overnight, fees rise without warning, and even
              your best ideas can be copied by the platform you rely on. Businesses look like owners but
              operate more like tenants, paying rent in the form of data, fees, and dependence.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What if discovery didn't cost anything?</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge 10-30% per transaction because they built massive infrastructure—payment
              processing, cart systems, checkout flows, customer databases, fraud detection. All that overhead
              requires revenue to maintain.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              But what if stores already had all that infrastructure? What if every store already had their
              own cart, checkout, and payment processor? Then the marketplace wouldn't need to build anything.
              It would just need to make those stores discoverable.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              That's what this is. A directory of independent stores that you can shop from—right here, in
              the conversation. Ask for a product, it appears. Pick options, add to cart, enter shipping,
              complete payment. All conversationally. When you checkout, payment goes directly to the store's
              own Stripe or PayPal account. We don't touch it. We don't see it. We don't take a cut. Zero
              transaction fees. Not 3%. Not 0.1%. Zero.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The chat is the store</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Shopping doesn't need pages anymore. The entire experience—products, cart, checkout, payment—happens
              naturally in a conversation. This is powered by MCP UI (Model Context Protocol UI), which lets
              AI render interactive store interfaces directly in the chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We took a complete e-commerce storefront and broke it down into conversational components.
              Product cards, shopping cart, checkout form, payment interface—all embedded in AI chat. Each
              store's full checkout flow, rendered in real-time, without leaving the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every store runs their own platform—Openfront, Shopify, WooCommerce, whatever they want. They
              keep their customer data, process payments through their own accounts, manage orders in their
              own system. We just query their existing API and render the experience conversationally.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Your data goes to one store, period</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you checkout on Amazon, your data goes into their database. They use it to recommend
              products, target ads, and decide what to sell under Amazon Basics. Your data is Amazon's
              most valuable asset.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This directory works differently. When you buy something, your email, shipping address, and
              payment details go directly to that store's system. Not to us. Not to a shared database. Just
              to that one store. We literally can't track your behavior across stores because we don't store it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Each transaction is independent. Buy from three different stores? That's three separate checkouts
              with three separate stores. No cross-store profile. No behavior tracking. No data aggregation.
              The technical reason: we don't have a database. We query stores in real-time, render their
              checkout conversationally, then step aside.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">List once, appear everywhere</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We're standardizing the interface. Every store exposes the same API structure—products, cart,
              checkout, payment. Every directory uses the same protocol to query those stores. It's like
              RSS for commerce.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              What this means for merchants: set up your store once, and it automatically works with every
              directory that uses this standard. No per-marketplace integration. No special plugins for each
              directory. Someone launches a vintage furniture directory tomorrow? If your store exposes the
              standard interface, you're already compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Compare this to today: list on Amazon, you build for Amazon's Seller Central. List on eBay,
              you build for eBay's system. List on Etsy, you build for Etsy's dashboard. Each marketplace
              has its own proprietary integration, its own lock-in. You're building their business, not yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              With a standardized interface, new directories can appear without stores changing anything.
              The more directories that use this standard, the more valuable it becomes for stores. The more
              stores that expose it, the easier it is to launch new directories. Power distributes instead
              of concentrating.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">To make an apple pie from scratch</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              "If you wish to make an apple pie from scratch, you must first invent the universe." — Carl Sagan
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace works with any e-commerce platform—Shopify, WooCommerce, whatever. But for
              this model to truly work, stores need to own their infrastructure. If every store still runs
              on proprietary platforms, they're dependent. Rules can change. Fees can rise. Integrations
              can disappear.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              So before we built this directory, we first had to invent the universe. We built Openfront—open
              source e-commerce platforms for every vertical: retail, restaurants, salons, barbershops, hotels.
              Businesses fork the code, run it themselves, modify it however they want. True ownership.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Openfront isn't required to use this marketplace. But it's our answer to "what should businesses
              run if they want complete independence." Together, Openfront and this marketplace create fully
              decentralized commerce: businesses own their platforms, directories provide discovery without
              rent, and customers know their data stays with the stores they trust.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone can run their own directory</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is fully open source. Fork the code, add your own stores to a configuration file, deploy
              your own directory. No permission required. No fees. No platform approval.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a directory for sustainable brands in your region? Add those stores. Building
              one for your city's independent shops? Connect them. Creating a niche directory for vintage
              collectibles? Curate the stores that matter to your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces make it impossible to compete because of network effects. You can't
              compete with Amazon because they have millions of sellers and customers. The network is the moat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But when it's just a directory—when stores aren't locked in, when there's no central database,
              when anyone can fork the code—network effects work differently. Stores exist independently.
              Customers can find them through any directory. Multiple directories can list the same stores
              for different audiences. Power distributes instead of concentrating. Domain expertise becomes
              the moat, not infrastructure.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What we actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplaces claim they provide value through infrastructure—payment processing, fraud detection,
              customer service. But that's just overhead they built to justify their fees. The real value is
              curation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When customers come to a trusted directory, they're more likely to trust the stores listed there.
              Directories signal which stores are legitimate, which have been vetted, which are worth your time.
              That's the actual value.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The stores in this directory are in our configuration file—you can view it on GitHub. We've
              personally used these stores, checked their shipping, verified their customer service. That's
              what we provide: a signal that these stores are worth your time. If you find a store here and
              later buy directly from them, we don't get a cut. We're not rent-seeking. We're providing discovery.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Addressing the obvious questions</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"If you charge zero fees, how do you make money?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We don't, yet. Right now this is a demonstration that the model works. Our business is building
              Openfront—the platforms that businesses actually own. This directory proves that ownable platforms
              can connect to directories without rent-seeking middlemen.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Long-term, directory operators could charge stores a flat monthly fee for inclusion ($50-200/month,
              not 15% per transaction), or operate on tips from customers who value the curation. The point is:
              the revenue model doesn't require transaction fees because the infrastructure doesn't require overhead.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"What stops you from becoming the next Amazon?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The code is open source. If we started charging 15% or playing algorithmic favorites, anyone could
              fork and launch a competing directory in an afternoon. Stores aren't locked in. They don't lose
              reviews or rankings by connecting to a different directory. The power is structural, not just
              philosophical.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"Why would stores trust this?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because there's nothing to trust. We don't hold their money. We don't own their customers. We
              don't control their data. We're querying their existing API and rendering it conversationally.
              The worst case is we shut down and nothing happens to them. They keep operating exactly as before.
              That's not trust. That's architecture.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Path Forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The office chair story doesn't have to be yours. The $567,000 in fees doesn't have to be yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're a merchant:</strong> Deploy Openfront or run any platform that exposes the
              standard interface. Set up once, appear in every directory that uses this standard. No per-marketplace
              integrations. No lock-in. Your first customer costs $0 in platform fees. Your 10,000th customer
              costs $0. You keep your customer data, process payments on your terms, fulfill orders your way.
              As new curated directories appear for different niches and regions, you're automatically compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you want to build a directory:</strong> Fork this code. Add stores that matter to your
              community. Deploy it. Any store exposing the standard interface automatically works—no custom
              integrations required. You don't need permission, capital, or technical infrastructure. Your
              competitive advantage is knowing which stores to trust, not building infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're shopping:</strong> Know that when you buy from a store in this directory, your
              data goes directly to them—not to a marketplace database. No cross-store tracking. No behavior
              profiling. No data reselling. Just a direct connection between you and the business you're buying
              from, facilitated through a conversational interface.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is commerce where merchants own the infrastructure, customers control their data, and discovery
              happens through open protocols instead of closed algorithms. No landlords. No gatekeepers. No one
              can copy your success and crush you with it. Discovery doesn't have to cost anything. The question
              isn't "can this work?" It's "why are we still paying rent?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
