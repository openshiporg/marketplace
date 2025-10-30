"use client";

import { ArrowUpRight } from "lucide-react";
import { CombinedLogo } from "@/components/CombinedLogo";

export default function EthosV6Page() {
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
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The $3,500 they never told you about</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              A friend of mine sells handmade leather bags. She makes $250 per bag after materials
              and labor. Last month she sold 140 bags through Amazon for $35,000 in revenue.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Amazon took $5,250 in referral fees (15%). She spent $2,800 on sponsored product ads
              just to stay visible. FBA fees added another $1,400. Total platform cost: $9,450—27%
              of her revenue. She cleared $25,550 after Amazon's cut, before paying herself, her
              supplier, or her rent.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              "But I need the traffic," she says. And she's right. Amazon has the customers. Moving
              to her own store means starting over. No reviews. No rankings. No discoverability. This
              is the rent you pay for discovery. Year one: $113,400 in fees. Year five: $567,000.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What if marketplaces were just directories?</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We call this a marketplace, but it's really more like a directory. A curated list
              of independent stores that you can shop from—right here, in the conversation. Ask
              for a product, it appears. Pick options, add to cart, enter shipping, complete payment.
              All in the chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              And because it's just a directory—because we're not processing payments, managing
              inventory, or storing customer data—there's nothing to charge for.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Zero fees because there's nothing to charge for</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge 10-30% because they built massive infrastructure.
              This directory has none of that. When you checkout, payment goes directly to the
              store's Stripe or PayPal account. We don't touch it. We don't see it. We don't
              take a cut.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every store already has their own cart, checkout, and payment processor. AI just
              makes it conversational. For the leather bag seller? Her first customer costs $0
              in platform fees. Her 1,000th customer costs $0. No rent. No advertising tax. No
              15% extracted just for being discovered.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Your data stays with the store you buy from</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you checkout on Amazon, your data goes into their database. They use it to
              recommend products, target ads, and decide what to sell under Amazon Basics.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This directory works differently. When you buy, your data goes directly to that
              store—not to us, not to a shared database. We literally can't track your behavior
              across stores because we don't store it. Each transaction is independent. The
              technical reason: we don't have a database. We query stores in real-time, render
              their checkout conversationally, then step aside.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">List once, appear everywhere</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Here's what makes this different: we're standardizing the interface. Every store
              exposes the same API structure—products, cart, checkout, payment. Every directory
              uses the same protocol to query those stores. It's like RSS for commerce.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              What this means for merchants: set up your store once, and it automatically works
              with every directory that uses this standard. No per-marketplace integration. No
              jumping through hoops. Someone launches a vintage furniture directory tomorrow?
              If your store exposes the standard interface, you're already compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Compare this to today: list on Amazon, you build for Amazon's Seller Central. List
              on eBay, you build for eBay's system. Each marketplace has its own proprietary
              integration, its own lock-in. You're building their business, not yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              With a standardized interface, new directories can appear without stores changing
              anything. The more directories that use this interface, the more valuable it becomes
              for stores. The more stores that expose it, the easier it is to launch new directories.
              Power distributes instead of concentrating.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">To make an apple pie from scratch</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              "If you wish to make an apple pie from scratch, you must first invent the universe."
              — Carl Sagan
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace works with any e-commerce platform—Shopify, WooCommerce, whatever.
              But for this model to truly work, stores need to own their infrastructure. If every
              store runs on proprietary platforms, they're still dependent. Rules can change. Fees
              can rise. Integrations can disappear.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              So before we built this directory, we first had to invent the universe. We built
              Openfront—open source e-commerce platforms for every vertical: retail, restaurants,
              salons, barbershops, hotels. Businesses fork the code, run it themselves, modify it
              however they want. True ownership.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Openfront isn't required. But it's our answer to "what should businesses run if they
              want complete independence." Together, Openfront and this directory create fully
              decentralized commerce: businesses own their platforms, directories provide discovery
              without rent, and customers know their data stays with the stores they trust.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Addressing the obvious questions</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"If you charge zero fees, how do you make money?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We don't, yet. Right now this is a demonstration that the model works. Our business
              is building Openfront—the platforms that businesses actually own. This directory
              proves that ownable platforms can connect to directories without rent-seeking middlemen.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Long-term, directory operators could charge stores a flat monthly fee for inclusion
              ($50-200/month, not 15% per transaction), or operate on tips from customers who value
              the curation. The point is: the revenue model doesn't require transaction fees because
              the infrastructure doesn't require overhead.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"What stops you from becoming the next Amazon?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The code is open source. If we started charging 15% or playing algorithmic favorites,
              anyone could fork and launch a competing directory in an afternoon. Stores aren't locked
              in. They don't lose reviews or rankings by connecting to a different directory. The power
              is structural, not just philosophical.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"Why would stores trust this?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because there's nothing to trust. We don't hold their money. We don't own their customers.
              We don't control their data. We're querying their existing API and rendering it conversationally.
              The worst case is we shut down and... nothing happens to them. That's not trust. That's architecture.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What we actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The value isn't infrastructure. It's curation. The stores in this directory are in
              our configuration file—you can view it on GitHub. We've personally used these stores,
              checked their shipping, verified their customer service. That's what we provide: a
              signal that these stores are worth your time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              If you find a store here and later buy directly from them, we don't get a cut. We're
              not rent-seeking. We're providing discovery. The best curated directories win attention.
              Trust has to be earned, not extracted.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The path forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're a merchant:</strong> Run a platform that exposes the standard interface.
              Set up once, appear in every directory that uses this standard. No per-marketplace
              integrations. No lock-in. Your first customer costs $0 in platform fees. Your 10,000th
              customer costs $0. As new curated directories appear for different niches and regions,
              you're automatically compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you want to build a directory:</strong> Fork this code. Add stores that
              matter to your community. Deploy it. Any store exposing the standard interface
              automatically works—no custom integrations required. Your competitive advantage is
              knowing which stores to trust, not building infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're shopping:</strong> Your data goes directly to the store you buy
              from—not to a marketplace database. No cross-store tracking. No behavior profiling.
              No data reselling. Just a direct connection between you and the business, facilitated
              through conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Discovery doesn't have to cost anything. When AI can make directories interactive,
              when checkout happens in conversation, when payments go directly to stores—directories
              become pure curation. The question isn't "can this work?" It's "why are we still
              paying rent?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
