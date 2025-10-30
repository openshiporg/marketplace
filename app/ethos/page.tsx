"use client";

import { ArrowUpRight } from "lucide-react";

export default function EthosPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="pt-28 pb-8 md:pt-36 md:pb-16">
            <div className="max-w-2xl text-left">
              <p className="flex items-center text-sm text-muted-foreground mb-4 uppercase font-medium tracking-wide">
                An Openship initiative <ArrowUpRight className="size-4 ml-1"/>
              </p>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                the marketplace
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
              This is not just his story. It is the story of commerce today, where platforms hold the power
              and businesses fight to survive inside systems designed to extract more than they give.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Marketplace Feudalism</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Modern marketplaces create a kind of digital feudalism. Independent businesses struggle for
              visibility while the platforms they depend on face no real competition at all. Sellers cannot
              simply move. Shifting from Amazon to eBay or from one provider to another means starting over,
              losing reviews, retraining algorithms, and abandoning years of optimization.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Even Shopify, which lets you "own your store," still controls the rules, takes transaction fees,
              and can change terms whenever it wants. You may have more freedom than selling on Amazon, but
              you are still operating on someone else's platform, following someone else's rules.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The result is an ecosystem where rules change overnight, fees rise without warning, and even
              your best ideas can be copied by the very platform you rely on. Businesses look like owners
              but operate more like tenants, paying rent in the form of data, fees, and dependence.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Open Source, Forkable, Yours</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace is fully open source. Fork the repository, add stores to a simple configuration
              file, and deploy your own marketplace instance in minutes. No permission required. No platform
              fees. No vendor lock-in.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              What you are looking at right now is one instance. Anyone can create another. Want to build a
              marketplace for sustainable brands in your region? Fork the code and add those stores. Building
              a local marketplace for your city's independent shops? Connect them to your instance. Creating
              a niche marketplace for vintage collectibles? List the stores that matter to your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every marketplace instance operates independently, but all share the same underlying principle:
              merchants own their stores, customers control their data, and discovery happens through open
              protocols rather than closed algorithms. This is what decentralized commerce looks like.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">How It Works: No Central Database</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Each merchant runs their own Openfront instance. Openfront is an open source e-commerce platform,
              like Shopify, except you own the code and host it yourself. Merchants control their data, manage
              their own payments and fulfillment, and set their own rules.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Stores do not register with a marketplace or install anything. Marketplaces simply add the store's
              web address to a configuration file, and the AI handles the rest. Each store exposes a standardized
              interface that marketplaces can query directly. Products, inventory, and pricing remain under the
              merchant's complete control, updated in real time.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              There is no central database. There is no marketplace account. There are no transaction fees
              extracting value from every sale. If this marketplace instance disappeared tomorrow, every store
              would continue operating without interruption. In fact, anyone could fork the code and launch a
              new marketplace connecting to those same stores.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is commerce without landlords. Businesses own the infrastructure, set their own rules,
              and keep their customers. Marketplaces exist only to make independent stores discoverable,
              not to control them.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">AI as Discovery, Not Control</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Traditional marketplaces gain power by controlling discovery. They decide which products appear
              in search results, which stores get featured, and which businesses succeed or fail. Merchants
              pay for visibility through advertising, favorable placement, and algorithm optimization.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace uses AI differently. When a customer asks "I need organic coffee beans under $20,"
              the AI queries all connected stores in parallel, understands their catalogs, and surfaces the best
              matches regardless of which store can pay for visibility. There are no promoted listings, no paid
              placements, and no algorithm favoring one merchant over another.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The AI understands product catalogs, manages carts across multiple stores, handles variant
              selection, and guides customers through checkout, all while each store retains complete ownership.
              Discovery becomes a tool that serves both customers and merchants, not a weapon used to extract fees.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Because the marketplace code is open source, merchants can verify that no algorithmic favoritism
              exists. The AI serves customers and merchants equally. And because the marketplace supports any AI
              that can connect via the Model Context Protocol, you are not locked into a single provider. Use
              Claude, ChatGPT, local models, or whatever works best for your instance.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Your Data, Your Customers, Your Privacy</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              When a customer checks out through the marketplace, all their data goes directly to the merchant's
              store. The marketplace does not store customer information, track shopping behavior, or build user
              profiles. Each store interaction is independent and private.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Payments are processed by the merchant's own payment provider. Orders are fulfilled by the merchant.
              Customer relationships belong to the merchant. The marketplace simply facilitates discovery, then
              steps aside.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              This is a fundamental difference from Amazon or traditional marketplaces, where customer data is
              the platform's most valuable asset. Here, merchants own their customer relationships completely.
              No one can take them away, analyze them without permission, or use them to compete against you.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Open Infrastructure for Every Vertical</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This marketplace is one instance of a larger vision. At Openship, we are building open source
              software as a service platforms for every vertical, from hotels to grocery stores to barbershops.
              Each vertical gets its own Openfront implementation, purpose-built for that industry's specific needs.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Together, these platforms form the foundation of decentralized commerce. A restaurant can run
              its own Openfront for food delivery. A salon can manage bookings and retail products. A hardware
              store can sell online while maintaining local inventory. Each business owns its platform completely,
              and marketplaces simply connect them for discovery.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The more businesses that adopt Openfront, the stronger the network becomes. But unlike traditional
              network effects that concentrate power, this network distributes it. No single entity controls the
              infrastructure. No gatekeeper decides who participates. Anyone can deploy their own marketplace,
              connect to any Openfront store, and start building.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Personal Software for Your Business</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Through OpenSource.Builders, we track features across all Openfront platforms. This means you can
              take the appointment booking features from the salon Openfront and combine them with e-commerce
              features from the retail Openfront, creating exactly the platform your hybrid business needs.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Most businesses today shape themselves around rigid, one-size-fits-all software. They spend countless
              hours configuring dashboards and workarounds, trying to fit unique needs into generic molds. With AI
              and open source, that era is ending.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              You control not just your store, but the entire platform it runs on. Modify anything, extend everything,
              and integrate with any service you choose. The marketplace becomes truly personal: software that adapts
              to your business, not the other way around.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">Built for Independence</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              With Openfront and this marketplace model, your store is your system, your code, your data. If we
              disappear tomorrow, your business keeps running because the tools are open and under your control.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Ownership means freedom. Freedom to modify, freedom to expand, freedom to evolve without permission.
              It also means security, knowing that no one can change the rules on you, raise fees, or take your
              customers away. You build direct relationships with your customers. You process payments on your terms.
              You fulfill orders your way.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              Every Openfront includes a built-in AI assistant that understands your business completely. Because
              you own the platform, you have the choice to use our built-in assistant, Claude, ChatGPT, or any AI
              that can connect to MCP servers. Your data stays yours, your integrations stay yours, and your
              business stays yours.
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-semibold mb-4 font-instrument-serif">The Path Forward</h2>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              The office chair story does not have to be yours.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              Deploy Openfront and own your store completely. Connect to marketplaces that discover your products
              without controlling your business, or fork this marketplace code and create your own instance for
              your community.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed mb-4">
              This is commerce where merchants own the infrastructure, customers control their data, and discovery
              happens through open protocols instead of closed algorithms. No landlords. No gatekeepers. No one can
              copy your success and crush you with it.
            </p>
            <p className="text-fd-muted-foreground leading-relaxed">
              The more businesses that adopt this model, the stronger the network becomes. But unlike traditional
              marketplaces, the power distributes rather than concentrates. Every fork, every new instance, every
              independent store makes the ecosystem more resilient. This is what commerce looks like when the
              builders own the means of production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
