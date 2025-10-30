"use client";

import { ArrowUpRight } from "lucide-react";

export default function EthosV3Page() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="pt-28 pb-8 md:pt-36 md:pb-16">
            <div className="max-w-2xl text-left">
              <a
                href="https://openship.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-muted-foreground mb-4 uppercase font-medium tracking-wide hover:text-foreground transition-colors"
              >
                An Openship initiative <ArrowUpRight className="size-4 ml-1"/>
              </a>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                discovery without rent
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="max-w-2xl space-y-8">
          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The chat is the store</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge for discovery. You pay to appear in search results,
              pay transaction fees when customers find you, and pay with your data when they shop.
              Amazon, eBay, and even newer platforms built their entire business model on extracting
              value from connecting buyers and sellers.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But what if shopping didn't need pages? What if the entire experience—products,
              cart, checkout, payment—happened naturally in a conversation? What if the marketplace
              was just discovery, with zero infrastructure, zero data collection, and zero fees?
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Shopping as conversation</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              You say "I need a blue t-shirt, medium, under $30." AI searches across independent
              stores and shows you products <em>right there in the chat</em>. Interactive product
              cards appear in the conversation—you select size and color, add to cart, enter your
              shipping address, choose shipping method, and complete payment with Stripe or PayPal.
              All without leaving the chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              No product listing pages. No separate cart page. No checkout redirect. The entire
              shopping experience fits inside the AI conversation. This is powered by <strong>MCP UI</strong> (Model
              Context Protocol UI)—a system that lets AI render interactive store interfaces
              directly in the chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              We took a complete e-commerce storefront and broke it down into "bite-sized UI components"
              that can be served conversationally. Product cards, shopping cart, checkout form, payment
              interface—all embedded in the AI chat. Each store's full checkout flow, rendered
              in real-time, without leaving the conversation.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">No middleman infrastructure</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace doesn't store products. It doesn't process payments. It doesn't
              hold inventory. It doesn't own customer data. Every time you search, AI queries
              independent stores in real-time, and renders their products conversationally.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you complete checkout, payment goes directly to the store's own Stripe or PayPal
              account. The marketplace never touches the money, never sees your payment info, never
              takes a cut. <strong>Zero transaction fees.</strong> Not 3%. Not even 0.1%. Zero.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Traditional marketplaces built massive infrastructure because they had to—payment
              processing, cart databases, checkout flows, customer data warehouses. We don't need
              any of that because every store already has their own e-commerce platform. We just
              query their API and render their checkout in the chat. Pure discovery. No infrastructure.
              No fees.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Stores stay independent</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Each store runs their own platform (Openfront, Shopify, WooCommerce, whatever they want).
              They keep their customer data, process payments through their own accounts, manage orders
              in their own system. The marketplace is just a real-time discovery layer—it queries
              their API and embeds their checkout in the AI chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There's no account to create. No plugin to install. Marketplaces simply add a store's
              API endpoint to a configuration file, and AI handles the rest. If this marketplace
              disappeared tomorrow, every store keeps operating. In fact, anyone could fork the
              code and launch a new marketplace connecting to those same stores in minutes.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is fundamentally different from Amazon or traditional platforms. There's no
              central database to own, no customer data to leverage, no lock-in to maintain.
              Discovery becomes a commodity—something anyone can provide, something that doesn't
              require building an empire.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Discovery based on merit</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When you search for "organic coffee under $20," AI queries every connected store
              simultaneously. It understands their catalogs, matches your request, and surfaces
              the best products. Not the ones that paid for ads. Not the ones favored by a hidden
              algorithm. The ones that actually match what you want.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Because this marketplace is open source, you can verify this. No black-box algorithms.
              No secret deals. Every store gets the same treatment. The code is public, the logic
              is transparent, and the AI can be audited.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              And because everything runs on the Model Context Protocol, you're not locked into
              our AI provider. Use Claude, ChatGPT, local models, whatever works. The protocol is
              open, the tools are standard, and the marketplace adapts to any AI that speaks MCP.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Platform adapters: works with any e-commerce system</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The marketplace uses a <strong>platform adapter pattern</strong> to query different
              e-commerce systems. Each adapter translates that platform's API (GraphQL or REST)
              into a common format that works with AI and MCP UI. Currently supports Openfront,
              with Shopify, BigCommerce, and WooCommerce coming soon.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Stores don't need to change anything. They expose their existing API, the marketplace
              adapter queries it, and their products appear in conversational format. Cart operations,
              checkout, payment—all powered by the store's own backend, just rendered in the chat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This means the marketplace grows with every e-commerce platform that exists. As long
              as a platform has an API, someone can write an adapter. The more platforms supported,
              the more stores can participate—without anyone's permission.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone can run a marketplace</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace is fully open source. Fork the repository, add stores to the
              configuration file, deploy your own instance. No permission required. No fees.
              No platform approval.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a marketplace for sustainable brands in your region? Add those stores.
              Building a local marketplace for your city's independent shops? Connect them. Creating
              a niche marketplace for vintage collectibles? Curate the stores that matter to your
              community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces make it impossible to compete because of network effects.
              Amazon has millions of sellers, so customers go there, so more sellers join, strengthening
              the network. You can't compete with that.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But when the marketplace is just discovery—when stores aren't locked in, when there's
              no central database, when anyone can fork the code—network effects work differently.
              The stores exist independently. Customers can find them through any marketplace. Multiple
              marketplaces can curate the same stores for different audiences. The power distributes
              instead of concentrating.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Why Openfront matters</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              For this model to work, stores need to own their infrastructure. If every store runs
              on Shopify or Amazon, they don't really own anything. The platform can change rules,
              raise fees, or cut them off.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That's why we built Openfront first. Open source e-commerce platforms for every
              vertical—retail, restaurants, salons, barbershops, hotels—that businesses can
              truly own. Fork the code, run it yourself, modify it however you want. If we
              disappear, your business keeps running.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The marketplace doesn't require Openfront. It works with any e-commerce platform
              that exposes an API. But Openfront is our answer to "what should businesses run
              if they want complete independence." Together, Openfront and this marketplace
              create a fully decentralized commerce network.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Curation is the only value</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplaces claim they provide value through infrastructure—payment processing,
              fraud detection, customer service. But that's just overhead they built to justify
              their fees. The real value marketplaces provide is curation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When customers come to a trusted marketplace, they're more likely to trust the
              stores listed there. Marketplaces signal which stores are legitimate, which have
              been vetted, which are worth your time. That's valuable.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This marketplace provides exactly that. The stores here are in a configuration
              file we've personally audited. We've used these stores, vetted them, and trust
              them. That's our value. Not control. Not fees. Just curation and trust. If you
              find a store here and buy directly from them later, we don't get a cut. We're
              not rent-seeking. We're just helping you discover stores worth your time.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The path forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you're a merchant: deploy Openfront (or keep using your current platform). Connect
              to marketplaces that discover your products without controlling your business. You keep
              your customer data, process payments on your terms, and fulfill orders your way.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you want to build a marketplace: fork this code and create your own instance. Add
              stores that matter to your community. Curate for your niche. Serve your audience. The
              infrastructure is already there—you just need to decide which stores to connect.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you're a customer: shop knowing that your data goes directly to the store, not to
              a marketplace middleman. No tracking across stores. No profile building. No data sold
              to advertisers. Just a direct connection between you and the business you're buying from,
              all in a conversational interface.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Discovery doesn't have to cost anything. When AI can query stores conversationally,
              when checkout can be embedded in the chat, when payments go directly to each store's
              processor—the marketplace becomes pure discovery. The question becomes: why are we
              still paying rent?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
