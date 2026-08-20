"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { OpenfrontLogoIcon } from "@/components/OpenfrontLogoIcon";
import { VibeGhostWorkspaceGradient } from "@/components/VibeGhostWorkspaceGradient";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { MarketplaceDiscoveryRequest } from "@/lib/marketplace-discovery";

interface PromptSuggestionsProps {
  onSuggestionClick: (request: MarketplaceDiscoveryRequest) => void;
}

type MarketplaceOption = {
  id: string;
  name: string;
  prompt: string;
  discovery?: Omit<MarketplaceDiscoveryRequest, 'prompt'>;
  category: string;
  productLabel: string;
  color: string;
  shortDescription: string;
  overview: string;
  href: string;
  available?: boolean;
};

const OPTIONS: MarketplaceOption[] = [
  {
    id: "ecommerce",
    name: "Find me a T-shirt",
    prompt: "Show me T-shirts I can buy",
    discovery: {
      toolName: "discoverProducts",
      input: { query: "t-shirt" },
    },
    category: "E-commerce marketplace",
    productLabel: "E-commerce",
    color: "#6366f1",
    shortDescription: "Multi-region catalog, storefront, checkout, orders, inventory, shipping, returns, and B2B commerce.",
    overview: "Openfront E-commerce combines a customer storefront with an operator dashboard for regional catalogs, pricing, checkout, order management, returns, customer accounts, inventory, shipping, and B2B commerce.",
    href: "https://os.org/products/openfront-ecommerce",
    available: true,
  },
  {
    id: "restaurant",
    name: "Order from a restaurant",
    prompt: "Show me restaurant menus I can order from",
    discovery: {
      toolName: "discoverRestaurantMenus",
      input: {},
    },
    category: "Restaurant marketplace",
    productLabel: "Restaurant",
    color: "#f59e0b",
    shortDescription: "Menus, ordering, POS, kitchen, service-floor, inventory, staff, and restaurant reporting.",
    overview: "Openfront Restaurant connects guest ordering with operator workflows for menu management, point of sale, table service, kitchen production, pickup and delivery, purchasing, staff scheduling, and restaurant reporting.",
    href: "https://os.org/products/openfront-restaurant",
    available: true,
  },
  {
    id: "grocery",
    name: "Find the nearest grocery store",
    prompt: "Find the nearest grocery store",
    category: "Grocery marketplace",
    productLabel: "Grocery",
    color: "#22c55e",
    shortDescription: "Grocery catalog, fresh inventory, substitutions, pickup, delivery, purchasing, lists, loyalty, and subscriptions.",
    overview: "Openfront Grocery gives shoppers product, department, cart, checkout, list, subscription, pickup, and delivery flows while operators manage merchandising, suppliers, lots, stock, orders, substitutions, routes, and receiving.",
    href: "https://os.org/products/openfront-grocery",
  },
  {
    id: "hotel",
    name: "Book a hotel in New York",
    prompt: "Book a hotel in New York",
    category: "Hotel marketplace",
    productLabel: "Hotel",
    color: "#ec4899",
    shortDescription: "Hotel room-night inventory, rates, reservations, guest access, front desk, folios, housekeeping, and channels.",
    overview: "Openfront Hotel is a hotel property-management and direct-booking application for room types, nightly inventory, rate plans, reservations, guest records, folios, front-desk work, housekeeping, maintenance, and channel reservations.",
    href: "https://os.org/products/openfront-hotel",
  },
  {
    id: "rental",
    name: "Find a vacation rental",
    prompt: "Find a vacation rental",
    category: "Rental marketplace",
    productLabel: "Rental",
    color: "#d946ef",
    shortDescription: "Professional short-term accommodation listings, quotes, reservations, guest trips, host operations, channels, and payouts.",
    overview: "Openfront Rental supports professional short-term accommodation managers with properties, units, listings, availability, stay quotes, reservations, agreements, guest trips, shared calendars, messaging, owner assignments, channels, payouts, and reviews.",
    href: "https://os.org/products/openfront-rental",
  },
  {
    id: "real-estate",
    name: "Find a home for sale",
    prompt: "Find a home for sale",
    category: "Real estate marketplace",
    productLabel: "Real Estate",
    color: "#14b8a6",
    shortDescription: "Brokerage listings, leads, saved searches, showings, offers, deals, disclosures, milestones, and commissions.",
    overview: "Openfront Real Estate pairs a public property-listing storefront with brokerage workspaces for listings and media, saved searches, lead routing, showings, offers, deal stages, documents, inspections, tasks, market comparisons, and commission records.",
    href: "https://os.org/products/openfront-real-estate",
  },
  {
    id: "coffee-shop",
    name: "Order from a coffee shop",
    prompt: "Order from a coffee shop near me",
    category: "Coffee shop marketplace",
    productLabel: "Coffee Shop",
    color: "#92400e",
    shortDescription: "Menu and pickup ordering, POS, kitchen display, recipes, inventory, loyalty, catering, and shifts.",
    overview: "Openfront Coffee Shop combines customer menu and checkout flows with cafe order queues, POS, kitchen display, menu configuration, inventory movements, waste, loyalty accounts, subscriptions, catering, and register shifts.",
    href: "https://os.org/products/openfront-coffee-shop",
  },
  {
    id: "barbershop",
    name: "Book a barbershop appointment",
    prompt: "Book a barbershop appointment",
    category: "Barbershop marketplace",
    productLabel: "Barbershop",
    color: "#2563eb",
    shortDescription: "Services, barber schedules, appointments, walk-in queue, POS, customers, inventory, and commissions.",
    overview: "Openfront Barbershop covers public service and barber discovery, appointment booking, walk-in queue management, barber schedules, chair operations, customer history, memberships, packages, checkout, product sales, commissions, and shop reporting.",
    href: "https://os.org/products/openfront-barbershop",
  },
  {
    id: "dealership",
    name: "Find a vehicle",
    prompt: "Find a vehicle at a local dealership",
    category: "Dealership marketplace",
    productLabel: "Dealership",
    color: "#ef4444",
    shortDescription: "Vehicle inventory, leads, deal desk, test drives, trade-ins, finance intake, service, and delivery.",
    overview: "Openfront Dealership gives shoppers inventory, comparison, trade-in, test-drive, contact, and service-request flows while teams manage vehicles, CRM activity, deals, approvals, lender submissions, deliveries, service orders, and parts.",
    href: "https://os.org/products/openfront-dealership",
  },
  {
    id: "hospital",
    name: "Find a healthcare appointment",
    prompt: "Find a healthcare appointment",
    category: "Hospital marketplace",
    productLabel: "Hospital",
    color: "#06b6d4",
    shortDescription: "Appointments, registration, intake, patients, providers, inpatient and clinical workflows, claims, and communications.",
    overview: "Openfront Hospital organizes patient registration, appointment requests, provider schedules, intake forms, communication, consent records, care queues, claims, operational reporting, and bounded care records for healthcare organizations.",
    href: "https://os.org/products/openfront-hospital",
  },
  {
    id: "gym",
    name: "Book a gym class",
    prompt: "Book a gym class",
    category: "Gym marketplace",
    productLabel: "Gym",
    color: "#8b5cf6",
    shortDescription: "Memberships, classes, trainer scheduling, booking and waitlists, check-in, billing, and member accounts.",
    overview: "Openfront Gym connects membership signup with class discovery, schedules, bookings, waitlists, instructor and roster work, member accounts, facility information, kiosk check-in, workout records, and operational reporting.",
    href: "https://os.org/products/openfront-gym",
  },
  {
    id: "salon",
    name: "Book a salon appointment",
    prompt: "Book a salon appointment",
    category: "Salon marketplace",
    productLabel: "Salon",
    color: "#a855f7",
    shortDescription: "Services, stylists, appointments, schedules, resources, checkout, memberships, inventory, and commissions.",
    overview: "Openfront Salon combines public services, stylist discovery, booking, account, appointment, gift-card, gallery, and review flows with schedules, resources, client history, checkout, inventory, memberships, packages, engagement, commissions, and reporting.",
    href: "https://os.org/products/openfront-salon",
  },
  {
    id: "construction",
    name: "Find a construction team",
    prompt: "Find a construction team",
    category: "Construction marketplace",
    productLabel: "Construction",
    color: "#f97316",
    shortDescription: "Projects, preconstruction, contracts, cost control, field work, safety, documents, and progress billing.",
    overview: "Openfront Construction models company and project tenancy across preconstruction, estimating, budgets, commitments, change management, RFIs, submittals, drawings, schedules, daily logs, field resources, inspections, incidents, progress billing, and audit records.",
    href: "https://os.org/products/openfront-construction",
  },
  {
    id: "convenience",
    name: "Find a convenience store",
    prompt: "Find a convenience store near me",
    category: "Convenience marketplace",
    productLabel: "Convenience",
    color: "#0f9f9a",
    shortDescription: "Convenience-store POS, cash, inventory, purchasing, loyalty, restricted sales, prepared food, and fuel records.",
    overview: "Openfront Convenience connects register sessions and sales with store-day reconciliation, products and price books, promotions, inventory lots, counts, purchase orders, receiving, returns, loyalty ledgers, prepared-food batches, optional fuel records, and operational exceptions.",
    href: "https://os.org/products/openfront-convenience",
  },
  {
    id: "airline",
    name: "Book a flight",
    prompt: "Book a flight",
    category: "Airline marketplace",
    productLabel: "Airline",
    color: "#3b82f6",
    shortDescription: "Airline retailing, offers, bookings, fulfillment, passenger service, baggage, and disruption operations.",
    overview: "Openfront Airline covers commercial and passenger-service workflows from routes, schedules, cabins, inventory and fares through offers, bookings, passengers, tickets, seats, bags, check-in, exchanges, refunds, disruptions, and reaccommodation.",
    href: "https://os.org/products/openfront-airline",
  },
  {
    id: "law-firm",
    name: "Find a law firm",
    prompt: "Find a law firm",
    category: "Legal services marketplace",
    productLabel: "Law Firm",
    color: "#7c3aed",
    shortDescription: "Firm intake, conflicts, matters, ethical walls, documents, billing, trust records, portal access, and governance.",
    overview: "Openfront Law Firm organizes firm and office membership, client intake, conflict review, matters and teams, courts and deadlines, documents and signatures, communications, time and expenses, invoicing, trust ledgers, client sharing, retention, provider connections, and controlled agent actions.",
    href: "https://os.org/products/openfront-law-firm",
  },
  {
    id: "pharmacy",
    name: "Find a pharmacy",
    prompt: "Find a pharmacy near me",
    category: "Pharmacy marketplace",
    productLabel: "Pharmacy",
    color: "#0d9488",
    shortDescription: "Pharmacist-controlled prescription, dispensing, recall, lot, cold-chain, patient, OTC, order, and fulfillment workflows.",
    overview: "Openfront Pharmacy separates public carts for eligible products from prescription intake and review, requires recorded human approval for consequential prescription and inventory actions, and tracks orders, lots, recalls, temperature excursions, refills, transfers, fulfillment, and audit events.",
    href: "https://os.org/products/openfront-pharmacy",
  },
];

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  const [selected, setSelected] = useState<MarketplaceOption | null>(null);

  const choose = (option: MarketplaceOption) => {
    if (option.available && option.discovery) {
      onSuggestionClick({ prompt: option.prompt, ...option.discovery });
      return;
    }
    setSelected(option);
  };

  return (
    <>
      <div className="relative w-full max-w-110 overflow-hidden rounded-card bg-surface shadow-card" data-testid="suggested-actions">
        <div
          className="scroll-fade-y max-h-[240px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Marketplace categories"
        >
          {OPTIONS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option)}
              className="flex h-12 w-full items-center gap-2.5 border-b border-line px-2.5 text-left transition-[background-color,transform] duration-100 last:border-0 hover:bg-inset focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal active:scale-[0.995]"
              style={{ animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${Math.min(index, 6) * 45}ms both` }}
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                <span className="relative flex size-5.5 items-center justify-center rounded-full shadow-[var(--shadow-gradient-icon)]">
                  <VibeGhostWorkspaceGradient
                    seed={option.id === "ecommerce" ? "openfront" : `openfront-${option.id}`}
                    accentColor={option.color}
                    className="absolute inset-0 size-full"
                  />
                  <ArrowUpRight
                    className="relative z-10 size-3 text-[var(--color-gradient-icon-ink)] drop-shadow-[var(--shadow-gradient-arrow)]"
                    strokeWidth={2.5}
                  />
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="block truncate text-[13px] font-medium leading-[1.15] text-ink">{option.name}</span>
                <span className="block truncate text-[11.5px] leading-[1.15] text-ink-3">{option.category}</span>
              </span>
              {option.available ? (
                <ArrowUpRight className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
              ) : (
                <span className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">SOON</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-[430px] gap-0 p-0">
          {selected ? (
            <>
              <div className="border-b border-line bg-inset px-5 py-5 pr-12">
                <div className="flex items-center gap-3">
                  <OpenfrontLogoIcon className="size-10 shrink-0" color={selected.color} suffix={`-${selected.id}-dialog`} />
                  <div className="min-w-0 [font-family:var(--font-brand)]">
                    <div className="text-[15px] font-semibold leading-none tracking-[-0.025em] text-ink">
                      open<span className="font-normal">front</span>
                    </div>
                    <DialogTitle className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                      <span className="sr-only">Openfront </span>{selected.productLabel}
                    </DialogTitle>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5">
                <DialogDescription className="text-[14px] font-medium leading-[1.5] text-ink">
                  {selected.shortDescription}
                </DialogDescription>
                <p className="mt-3 text-[12.5px] leading-[1.6] text-ink-3">
                  {selected.overview}
                </p>
              </div>

              <div className="flex justify-end border-t border-line bg-inset px-3 py-2.5">
                <a
                  href={selected.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-control bg-ink px-3 text-[12px] font-medium text-surface shadow-btn transition-opacity hover:opacity-90"
                >
                  Learn more
                </a>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
