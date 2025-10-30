"use client";

import { ArrowUpRight } from "lucide-react";
import { CombinedLogo } from "@/components/CombinedLogo";

export default function EthosV5Page() {
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
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              "But I need the traffic," she says. And she's right. Amazon has the customers. The
              search volume. The trust. Moving to her own store means starting over. No reviews.
              No rankings. No discoverability.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is the rent you pay for discovery. And it compounds every single month. Year
              one: $113,400 in fees. Year five: $567,000. That's not payment for infrastructure.
              That's payment for being found.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What if marketplaces were just directories?</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We call this a marketplace, but it's really more like a directory. A curated list
              of independent stores that you can actually shop from—right here, in the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Ask for a product, it appears from stores in the directory. Pick your options,
              add to cart, enter shipping, complete payment. The entire shopping experience happens
              in the chat. You don't browse a directory and then leave to visit stores separately.
              The directory itself is interactive.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              And because it's just a directory—because we're not processing payments, managing
              inventory, or storing customer data—there's nothing to charge for.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Zero fees because there's nothing to charge for</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge 10-30% per transaction because they built massive
              infrastructure. Payment processing, cart systems, checkout flows, customer databases,
              fraud detection, customer service. All that overhead requires revenue.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This directory has none of that. When you complete checkout, payment goes directly
              to the store's own Stripe or PayPal account. We don't touch it. We don't see it.
              We don't take a cut. There is literally nothing to charge for.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Every store already has their own cart, their own checkout, their own payment processor.
              AI just makes it possible to interact with all of that conversationally. The directory
              lists the stores. The conversation connects you. The store handles everything else.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              For the leather bag seller? Her first customer from this directory costs $0 in platform
              fees. Her 1,000th customer costs $0. She keeps 100% of her revenue, minus her actual
              costs—payment processing (~3%), shipping, materials. No rent. No advertising tax. No
              15% extracted just for being discovered.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Your data goes to one store, period</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you checkout on Amazon, your purchase history, browsing behavior, and shopping
              patterns get added to their massive customer database. They use it to recommend products,
              target ads, and decide what to sell under Amazon Basics. Your data is Amazon's most
              valuable asset.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This directory works differently. When you buy something, your email, shipping address,
              and payment details go directly to that store's system. Not to us. Not to a shared
              database. Just to that one store.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We literally can't track your shopping behavior across stores because we don't store it.
              Each transaction is independent. Buy from three different stores? That's three separate
              checkouts with three separate stores. No cross-store profile. No behavior tracking. No
              data aggregation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The technical reason: we don't have a database. We query stores in real-time, render
              their checkout conversationally, then step aside. There's nowhere for your data to
              accumulate because we're not built to accumulate it.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Stores stay completely independent</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Each store runs their own platform—Openfront, Shopify, WooCommerce, whatever they
              want. They keep their customer data, process payments through their own accounts,
              manage orders in their own system. We just query their existing setup and render
              the experience conversationally.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There's no account to create. No plugin to install. No integration to maintain.
              We simply point to each store's existing system and make it accessible through
              AI chat. If this directory disappeared tomorrow, every store keeps operating
              exactly as before.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Compare this to Amazon: if they shut down tomorrow, millions of businesses lose
              their primary revenue source. Reviews vanish. Customer relationships disappear.
              Years of optimization are gone. Here? Nothing changes. The stores exist independently.
              The directory just helps people find them.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Domain expertise becomes the moat</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is fully open source. Fork the code, add your own stores, deploy your own directory.
              No permission required. No fees. No platform approval. The entire codebase is on GitHub,
              and stores are just a JSON configuration file you can edit.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Know vintage watches inside and out but don't have $10M to build marketplace infrastructure?
              You don't need it. Fork this code, add the 20 watch dealers you personally trust, deploy
              in an afternoon. Your expertise is the value. The infrastructure is free.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Expert in sustainable fashion? Build a directory for ethical brands in your region. Deep
              in the woodworking community? Curate the best small-batch furniture makers. Obsessed with
              specialty coffee? List the roasters you actually trust. The technical barrier is gone.
              What matters now is taste, trust, and domain knowledge.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Traditional marketplaces make this impossible because network effects create winner-take-all
              dynamics. You can't compete with Amazon because they have millions of sellers and customers.
              But when it's just a directory—when stores aren't locked in, when there's no central database,
              when anyone can fork the code—power distributes instead of concentrates. Multiple directories
              can list the same stores for different audiences. The moat becomes curation, not control.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">List once, appear everywhere</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Here's what makes this different from every marketplace before it: we're standardizing
              the interface. Every store exposes the same API structure—products, cart, checkout, payment.
              Every directory uses the same protocol to query those stores. It's like RSS for commerce.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              What this means for merchants: you set up your store once, and it automatically works with
              every directory that uses this standard. No per-marketplace integration. No special plugins
              for each directory. No jumping through hoops. Someone launches a vintage furniture directory
              tomorrow? If your store exposes the standard interface, you're already compatible.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Compare this to today: list on Amazon, you build for Amazon's Seller Central. List on eBay,
              you build for eBay's system. List on Etsy, you build for Etsy's dashboard. Each marketplace
              has its own proprietary integration, its own rules, its own lock-in. You're building their
              business, not yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              With a standardized interface, new directories can appear without stores changing anything.
              A coffee enthusiast launches a directory for specialty roasters? Your coffee shop is already
              compatible—they just add your URL to their configuration. A sustainable fashion curator wants
              to list ethical brands? If you expose the standard API, you're in. No gatekeepers. No approval
              process. No per-directory fees.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is why the open source model matters. The standard has to be open for everyone to adopt.
              If we controlled it, we'd just become another gatekeeper. But because the code is forkable,
              the protocol is open, and the adapters are public, standardization happens through adoption,
              not control. The more directories that use this interface, the more valuable it becomes for
              stores. The more stores that expose it, the easier it is to launch new directories. The network
              effect works in reverse—it distributes power instead of concentrating it.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Why stores need to own their platforms</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This standardization only works if stores own their infrastructure. If every store still runs
              on proprietary platforms like Shopify or Amazon, they're dependent on those platforms to expose
              the right interface. Rules can change. Fees can rise. Integrations can disappear.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That's why we built Openfront first—before building this directory. Open source e-commerce
              platforms for every vertical: retail, restaurants, salons, barbershops, hotels. Businesses
              fork the code, run it themselves, modify it however they want. True ownership.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This directory doesn't require Openfront. It works with any e-commerce platform that exposes
              an API. We have adapters for different platforms, and anyone can write new ones. But Openfront
              is our answer to "what should businesses run if they want complete independence."
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Together, they create fully decentralized commerce: businesses own their platforms, directories
              provide discovery without extracting rent, and customers shop knowing their data stays with
              the stores they trust. No gatekeepers. No platform fees. Just directories and stores.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Addressing the obvious questions</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"If you charge zero fees, how do you make money?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We don't, yet. Right now this is a demonstration that the model works. Our business is
              building Openfront—the platforms that businesses actually own. This directory proves that
              ownable platforms can connect to directories without rent-seeking middlemen.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Long-term, directory operators could charge stores a flat monthly fee for inclusion
              ($50-200/month, not 15% per transaction), or operate on tips/donations from customers
              who value the curation. The point is: the revenue model doesn't require transaction fees
              because the infrastructure doesn't require overhead.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"What stops you from becoming the next Amazon?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The code is open source. If we started charging 15% transaction fees or playing algorithmic
              favorites, anyone could fork the code and launch a competing directory in an afternoon.
              Stores aren't locked in. They don't lose reviews or rankings by connecting to a different
              directory. The power is structural, not just philosophical.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>"Why would stores trust this?"</strong>
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because there's nothing to trust. We don't hold their money. We don't own their customers.
              We don't control their data. We're literally just querying their existing API and rendering
              it conversationally. The worst case scenario is that we shut down and... nothing happens to them.
              They keep operating exactly as before. That's not trust. That's architecture.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What we actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The value isn't infrastructure. It's curation and trust.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The stores in this directory are in our configuration file—you can view it on GitHub.
              We've personally used these stores. Checked their shipping. Verified their customer
              service. Confirmed they're legitimate. That's what we provide: a signal that these
              stores are worth your time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you find a store here and later buy directly from their website, we don't get a cut.
              We're not rent-seeking. We're providing discovery. If our curation is good, people use
              this directory. If it's bad, they fork the code and make their own. That's the incentive
              structure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              And because anyone can fork the code and curate their own directory, curation becomes
              competitive. The best curated directories win attention. The worst ones get ignored or
              replaced. Trust has to be earned, not extracted.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The path forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're a merchant:</strong> Run your own platform (Openfront or any other) that
              exposes the standard interface. Set up once, appear in every directory that uses this standard.
              No per-marketplace integrations. No jumping through hoops. No lock-in. Your first customer
              costs you $0 in platform fees. Your 10,000th customer costs you $0. You keep your customer
              data, process payments on your terms, fulfill orders your way. As new curated directories
              appear for different niches and regions, you're automatically compatible. This is what commerce
              looks like when the interface is standardized and the code is open.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you want to build a directory:</strong> Fork this code. Add stores that matter
              to your community. Deploy it. You don't need permission, capital, or technical infrastructure.
              Any store that exposes the standard interface automatically works with your directory—no
              custom integrations required. You need domain expertise and taste. The code is free. The
              platform adapters exist. Just decide which stores to list and what value you provide through
              curation. Your competitive advantage is knowing which stores to trust, not building infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              <strong>If you're shopping:</strong> Know that when you buy from a store in this directory,
              your data goes directly to them—not to a marketplace database. No cross-store tracking.
              No behavior profiling. No data reselling. Just a direct connection between you and the
              business you're buying from, facilitated through a conversational interface. You're not
              the product. You're the customer.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Discovery doesn't have to cost anything. When AI can make directories interactive, when
              checkout happens in the conversation, when payments go directly to stores—directories become
              pure curation. The question isn't "can this work?" It's "why are we still paying rent?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
