"use client";

import { ArrowUpRight } from "lucide-react";

export default function EthosV2Page() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="pt-28 pb-8 md:pt-36 md:pb-16">
            <div className="max-w-2xl text-left">
              <p className="flex items-center text-sm text-muted-foreground mb-4 uppercase font-medium tracking-wide">
                An openship initiative <ArrowUpRight className="size-4 ml-1" />
              </p>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                to make an apple pie from scratch
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="max-w-2xl space-y-8">
          <div>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              "If you wish to make an apple pie from scratch, you must first invent the universe." — Carl Sagan
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We wanted to build a decentralized marketplace. One where merchants own their stores, customers control
              their data, and discovery happens without marketplaces deciding who wins and rent-seeking behavior.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But to build that marketplace, we first had to invent the universe: the store software itself. 
              Open source platforms for every vertical—retail, restaurants, salons, hotels—that merchants could 
              own, modify, and run on their own terms.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The problem with platforms today</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Without you even knowing it, marketplaces are choosing which sellers succeed and which don't. 
              It's not based on merit. It's based on who pays for placement, who the algorithm favors, and 
              sometimes, who the platform decides to copy and compete against directly.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              You can't leave. Even if you technically can move from Amazon to eBay, it doesn't matter.
              If the bulk of your orders come from their marketplace, you're building their business, not yours.
              You lose your reviews, your ranking, your customer relationships. The platform owns the infrastructure,
              so they own you. You're just a cog in their machine.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Even when you "own your store" on platforms like Shopify, the software managing your business controls
              how you do business. Shopify once had an official Amazon sales channel—then removed it over a payment
              dispute. Thousands of merchants lost a sales channel overnight because the platform decided. What if
              tomorrow they decide you can't sell what you're selling? What if they want to compete with you and cut
              you off? Your business software shouldn't dictate your business decisions.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Inventing the universe: Openfront</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              So we built Openfront. Open source e-commerce and vertical SaaS platforms that businesses can actually own. 
              Not "use." Not "subscribe to." Own. Fork the code, run it yourself, modify it however you want.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              A restaurant gets software built for restaurants. A salon gets software built for salons. A retail 
              store gets software built for retail. Each vertical has its own Openfront, purpose-built for that 
              industry's specific needs.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              You control your payments. You control your fulfillment. You control your customer data. If we 
              disappear tomorrow, your business keeps running because you own the code.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is the universe. Ownable infrastructure for every type of business. Without it, a truly 
              decentralized marketplace can't exist.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Making the apple pie</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Now that the universe exists, we can make the apple pie.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace works with any e-commerce platform—Openfront, Shopify, WooCommerce, whatever.
              It doesn't do anything your platform doesn't already do. It just uses your platform's API directly.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When a customer finds a product, they check out on your storefront, using your platform, with your
              payment processor. We're not forcing them to use our checkout or our system. The marketplace is just
              discovery—it points customers to your store, then gets out of the way.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There's no account to create. No plugin to install. No fees to pay. Marketplaces simply add your
              store's URL to a configuration file, and the AI queries your catalog directly. Your inventory,
              pricing, and products stay on your server, updated in real time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There is no central database. No customer data gets captured. No transaction fees get extracted.
              The marketplace's only job is discovery—connecting customers to stores based on what they're
              actually looking for, not who paid for placement.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              If this marketplace disappeared tomorrow, every store would keep operating. Anyone could fork
              the code and launch a new marketplace connecting to the same stores in minutes.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Discovery based on merit, not money</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When a customer searches for something, the AI queries every connected store in parallel. It
              understands their catalogs, finds the best matches, and surfaces them—without paid promotion,
              without hidden boosts, without algorithmic favoritism.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Because the marketplace code is open source, you can verify this. No black-box algorithms.
              No secret deals. The same interface for every store.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Everything is exposed as MCP tools. Want to connect your own AI platform? You can. We're not
              locking you into our model or our platform. Use Claude, ChatGPT, local models, whatever works.
              Everything is composable and extendable. The protocol is open.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Why we built Openfront first</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We built Openfront because we needed merchants to have a real alternative. If every store runs 
              on proprietary platforms, decentralization is just a theory. Merchants still don't own anything.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              But Openfront isn't required to use this marketplace. You can run Shopify, WooCommerce, or build 
              your own platform. As long as your store exposes the right interface, the marketplace can connect to it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Openfront is our answer to "what should merchants run if they want true ownership." The marketplace 
              is our answer to "how do independent stores get discovered without giving up control."
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What marketplaces actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplaces do provide value. When a customer comes to a marketplace they trust, they're more likely
              to trust the stores listed there. Marketplaces curate—they signal which stores are legitimate, which
              have been vetted, which are worth your time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That's the only thing we provide. The stores in this marketplace are kept in a JSON configuration file.
              These are stores we've personally audited, used, and vetted. If you find a store here and later decide
              to go directly to their site to purchase, we don't get a cut. We're not rent-seeking just because we
              introduced you.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But if you do come to this marketplace, you can expect the stores to be properly curated. That's the
              value. Not control. Not fees. Just curation and trust.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Fork it, run it, own it</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace is fully open source. Fork the repository, add stores to the configuration file,
              and deploy your own instance. No permission required. No fees. No lock-in.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a marketplace for sustainable brands in your region? Fork it and add those stores.
              Building a local marketplace for your city's independent shops? Connect them. Creating a niche
              marketplace for vintage collectibles? List the stores that matter to your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every instance operates independently. But they all share the same principle: merchants own their
              stores, customers control their data, and discovery happens through open protocols—not closed algorithms.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone can build a marketplace</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              By decentralizing the marketplace, we're making it possible for anyone to launch one. Every marketplace
              instance relies on the platform the store already uses—not a proprietary system you have to build or maintain.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Domain expert in real estate? Launch a marketplace for property listings. Understand vintage watches?
              Curate a marketplace for collectors. Know sustainable fashion inside and out? Build a marketplace for
              ethical brands. You're not locked out because you can't afford to build infrastructure or compete with
              Amazon's network effects.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Unlike traditional marketplaces whose entire business model is locking sellers in, extracting fees, and
              controlling the platform, we want the opposite. We want anyone to be able to launch a marketplace. Connect
              to stores. Curate for your niche. Serve your community. The infrastructure is already there.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Using open source to disrupt marketplaces</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces need massive overhead. They build and maintain the entire platform—payments,
              fulfillment, customer service, fraud detection, everything. That overhead justifies the fees they charge.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We have almost no overhead. Stores use their existing platforms. They handle their own payments, their own
              fulfillment, their own customer relationships. We're just tapping into what already exists. The marketplace
              is discovery, not infrastructure.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That means we can operate on a completely different model. No transaction fees. No rent-seeking. We can
              charge a simple finder's fee when we connect a customer to a store, or offer a flat monthly subscription
              for access. The point is: we're not extracting value from every transaction. We're providing a service—curation
              and discovery—and charging for that, not for control.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is how open source disrupts marketplaces. By removing the infrastructure burden, we remove the justification
              for extraction. What's left is just the value marketplaces should have been providing all along: trust, curation,
              and discovery.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The path forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you're a merchant: deploy Openfront and own your store completely. Or keep running whatever
              platform you use—just make sure you can connect to marketplaces on your terms, not theirs.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you're building a marketplace: fork this code and create your own instance. Add the stores
              that matter to your community. Discovery should be open, not controlled by a single entity.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Decentralized commerce doesn't start at the marketplace. It starts at the store. First, we had
              to invent the universe. Now anyone can make the apple pie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
