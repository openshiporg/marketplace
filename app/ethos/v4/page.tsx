"use client";

import { ArrowUpRight } from "lucide-react";
import { CombinedLogo } from "@/components/CombinedLogo";

export default function EthosV4Page() {
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
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">A directory you can shop from</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              We call this a marketplace, but it's really more like a directory. A curated list
              of independent stores. The difference? You don't just browse and then leave to
              visit each store separately. You can interact with everything directly—right here,
              in the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Ask for a product, it appears from stores in the directory. Pick your options,
              add to cart, enter shipping, complete payment—all without leaving the chat.
              The entire shopping experience happens in the conversation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              It's a directory that became interactive. Discovery that became transactional.
              And because of that, it works differently than traditional marketplaces.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Zero fees because there's nothing to charge for</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces charge 10-30% per transaction because they built massive
              infrastructure. Payment processing, cart systems, checkout flows, customer databases.
              All that overhead requires revenue to maintain.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This directory doesn't have any of that. When you complete checkout, payment goes
              directly to the store's own account. We don't process it. We don't see it. We
              don't take a cut. There's nothing to charge for because we didn't build
              infrastructure—we just made it possible to interact with stores that already exist.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every store already has their own cart, their own checkout, their own payment
              processing. AI just makes it possible to experience all of that conversationally,
              embedded in the chat. The directory lists them. The conversation connects you.
              The store handles everything else.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Stores stay completely independent</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Each store runs their own platform—Openfront, Shopify, WooCommerce, whatever
              they want. They keep their customer data, process payments through their own
              accounts, manage orders in their own system. This directory just queries their
              existing system and renders the experience conversationally.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There's no account to create. No plugin to install. We simply connect to each
              store's existing setup and make it accessible through AI chat. If this directory
              disappeared tomorrow, every store keeps operating exactly as before. Nothing changes
              for them.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              That's fundamentally different from Amazon or traditional marketplaces. There's
              no central database to own, no customer data to leverage, no lock-in to maintain.
              The directory is just curation—a list of stores we trust, made interactive through AI.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Anyone can run their own directory</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is fully open source. Fork the code, add your own stores, deploy your own
              directory. No permission required. No fees. No platform approval.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Want to build a directory for sustainable brands in your region? Add those stores.
              Building one for your city's independent shops? Connect them. Creating a niche
              directory for vintage collectibles? Curate the stores that matter to your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces make it impossible to compete because of network effects.
              You can't compete with Amazon because they have millions of sellers and customers.
              The network is the moat.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              But when it's just a directory—when stores aren't locked in, when there's no
              central database, when anyone can fork the code—network effects work differently.
              Stores exist independently. Customers can find them through any directory. Multiple
              directories can list the same stores for different audiences. Power distributes
              instead of concentrating.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Why Openfront matters</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              For this to work, stores need to own their infrastructure. If every store runs
              on Shopify or Amazon, they don't really own anything. The platform can change
              rules, raise fees, or cut them off.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              That's why we built Openfront first. Open source platforms for every vertical—retail,
              restaurants, salons, barbershops, hotels—that businesses can truly own. Fork the
              code, run it yourself, modify it however you want. If we disappear, your business
              keeps running.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This directory doesn't require Openfront. It works with any platform. But Openfront
              is our answer to "what should businesses run if they want complete independence."
              Together, Openfront and this directory create a fully decentralized commerce network.
              No gatekeepers. No rent. Just businesses and customers.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">What we actually provide</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Marketplaces claim they provide value through infrastructure—payment processing,
              fraud detection, customer service. But that's just overhead they built to justify
              their fees. The real value is curation.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When customers come to a trusted directory, they're more likely to trust the
              stores listed there. Directories signal which stores are legitimate, which have
              been vetted, which are worth your time. That's the actual value.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This directory provides exactly that. The stores here are in our configuration,
              ones we've vetted and trust. That's our value. Not control. Not fees. Just
              curation and trust. If you find a store here and buy directly from them later,
              we don't get a cut. We're not rent-seeking. We're just helping you discover
              stores worth your time.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The path forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you're a merchant: run your own platform. Connect to directories that discover
              your products without controlling your business. You keep your customer data,
              process payments on your terms, fulfill orders your way.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              If you want to build a directory: fork this code. Add stores that matter to your
              community. Curate for your niche. Serve your audience. The infrastructure is
              already here—you just decide which stores to connect.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Discovery doesn't have to cost anything. When AI can make directories interactive,
              when checkout can happen in the conversation, when payments go directly to each
              store—directories become pure curation. The question becomes: why are we still
              paying rent?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
