# Openfront Marketplace

> [!NOTE]
> **Demo Video**: [Watch the marketplace in action](#) _(coming soon)_

A conversational commerce marketplace where shopping happens entirely in AI chat. Products, cart, checkout, and payment—all rendered in the conversation via MCP UI. Zero transaction fees, zero data collection, complete store independence.

## What Makes This Different

### No Central Database
This marketplace doesn't store products, inventory, or customer data. Instead, it queries independent Openfront stores in real-time using AI to understand catalogs and match customer requests.

### Conversational Shopping
The entire shopping experience happens in the AI chat. Interactive product cards, shopping cart, checkout form, and payment interface—all rendered in the conversation via MCP UI. No page redirects. No separate checkout flow. Payment goes directly to each store's Stripe or PayPal account with zero marketplace fees.

### Open Source & Forkable
Anyone can fork this repository, add their own curated stores, and deploy their own marketplace instance. No permission required. No platform fees.

### AI-Powered Discovery
Uses Model Context Protocol (MCP) to enable any AI (Claude, ChatGPT, local models) to query stores, understand product catalogs, and provide intelligent product recommendations based on merit, not paid placement.

## How It Works

1. **Conversational Discovery**: You ask the AI for products, it queries stores in real-time and shows results in the chat
2. **In-Chat Shopping**: Product cards appear in the conversation—select size/color, add to cart, all without leaving the chat
3. **Embedded Checkout**: Enter shipping address, choose shipping method, complete payment with Stripe/PayPal—all in the chat via MCP UI
4. **Store Independence**: Each store's own API handles cart, checkout, and payment. Marketplace never touches the money or data
5. **Platform Adapters**: Works with any e-commerce platform (OpenFront, Shopify, etc.) via platform-specific adapters

## Quick Start

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/openship-org/openfront-marketplace.git
cd openfront-marketplace

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the marketplace.

### Adding Stores

Stores are managed in [`marketplace.config.json`](./marketplace.config.json) at the root of the project. Currently supports OpenFront stores, with abstraction in place to support other e-commerce platforms (Shopify, WooCommerce, BigCommerce) in the future:

```json
[
  {
    "baseUrl": "https://store.example.com",
    "platform": "openfront"
  },
  {
    "baseUrl": "https://another-store.example.com",
    "platform": "openfront"
  }
]
```

The platform adapter system (see [`app/api/mcp-transport/adapters/`](./app/api/mcp-transport/adapters/)) handles platform-specific API calls. For now, we have the Openfront adapter implemented. Adding support for other platforms involves creating a new adapter file in `app/api/mcp-transport/adapters/` that implements the `PlatformAdapter` interface.

## Bring Your Own Key

The marketplace supports three flexible AI configuration modes to suit different deployment scenarios. **All modes use [OpenRouter](https://openrouter.ai)** for AI access, which provides unified access to multiple AI models (Claude, GPT-4, Llama, etc.).

### 1. Global Mode (Shared OpenRouter Key)
The marketplace operator sets an OpenRouter API key in the environment variables (see [`.env.example`](./.env.example)), and all users share this key for AI interactions. This is the simplest setup for public marketplaces.

**Configuration:**
```env
# Set these in your deployment environment
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_MAX_TOKENS=4000
```

Get your OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys).

Users can start chatting immediately without any setup. The server-side implementation reads these environment variables ([`features/marketplace/actions/ai-chat.ts`](./features/marketplace/actions/ai-chat.ts)) and provides them to the AI completion endpoint ([`app/api/completion/route.ts`](./app/api/completion/route.ts)).

### 2. Local Mode (User's Own OpenRouter Key)
Users can bring their own [OpenRouter](https://openrouter.ai) API key, which is stored locally in their browser. This gives users full control over their AI costs and usage, with no shared limits.

**How it works:**
- User clicks the AI settings button in the chat interface
- Enters their OpenRouter API key, model, and token settings
- Credentials are stored in browser localStorage (see [`features/marketplace/hooks/use-ai-config.tsx`](./features/marketplace/hooks/use-ai-config.tsx))
- All AI requests use the user's personal key

This mode is ideal for power users or when you want users to manage their own AI costs. If Global Mode environment variables are not set, the marketplace defaults to Local Mode and prompts users to configure their own keys.

### 3. MCP Client Mode (External AI Client)
Since the marketplace is built entirely with [Model Context Protocol (MCP)](https://modelcontextprotocol.io), users can connect their own MCP-compatible AI clients (like [Claude Desktop](https://claude.ai/desktop)) directly to the marketplace's MCP endpoint.

**Setup:**
```json
// In your MCP client configuration
{
  "mcpServers": {
    "openfront-marketplace": {
      "url": "https://your-marketplace.com/api/mcp-transport/http"
    }
  }
}
```

**Important:** This mode requires an MCP client that supports [MCP UI](https://mcp-ui.org) for rendering interactive product cards, shopping cart, and checkout interfaces. The marketplace uses MCP UI extensively for the conversational commerce experience (see [`app/api/mcp-transport/tools/`](./app/api/mcp-transport/tools/)).

All marketplace operations—product search, cart management, checkout, payment—are implemented as MCP tools (see [`app/api/mcp-transport/tools/`](./app/api/mcp-transport/tools/)), making them accessible to any compatible AI client. This mode bypasses the built-in chat interface entirely and works directly with external AI clients.

## Features

### For Customers
- **Conversational Shopping**: Shop naturally by chatting with AI
- **All-in-Chat Experience**: Products, cart, checkout, payment—all in the conversation
- **Natural Language**: No filters or search boxes, just describe what you want
- **Privacy-First**: Payment and data go directly to the store, marketplace never sees it

### For Merchants
- **Complete Ownership**: Your store, your data, your customers
- **No Fees**: Zero transaction fees or listing charges
- **Independent Operations**: If the marketplace goes down, your store keeps running
- **Full Control**: Manage products, pricing, and inventory on your own platform

### For Marketplace Operators
- **Easy Setup**: Fork, configure stores, deploy
- **Curated Experience**: Choose which stores to feature
- **Flexible AI**: Use any AI provider via MCP
- **Open Source**: Modify and extend as needed

## Architecture

```
openfront-marketplace/
├── app/
│   ├── page.tsx                     # Main marketplace chat interface
│   ├── ethos/                       # About and ethos pages
│   └── api/
│       ├── completion/              # AI chat completion endpoint
│       └── mcp-transport/           # MCP server implementation
│           ├── [transport]/         # HTTP/SSE transport handlers
│           ├── adapters/            # Platform adapters (OpenFront, etc.)
│           ├── tools/               # MCP tools (products, cart, checkout)
│           └── types/               # Store config types
├── features/
│   └── marketplace/
│       ├── components/              # Chat UI, cart dropdown, etc.
│       ├── actions/                 # Server actions for AI config
│       ├── hooks/                   # React hooks for AI state
│       └── lib/                     # Cart & session storage utilities
├── components/                      # Shared UI components (shadcn/ui)
├── lib/                            # Utilities (cart-storage, session-storage)
└── marketplace.config.json         # Store configuration
```

## Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI Integration**: Model Context Protocol (MCP) for multi-model support
- **MCP UI**: Interactive UI components rendered in AI chat (product cards, cart, checkout, payment)
- **Platform Adapters**: Abstraction layer for different e-commerce platforms (OpenFront, Shopify, etc.)
- **Store Queries**: Real-time GraphQL/REST API queries to independent stores
- **Deployment**: Vercel, Railway, or any Node.js hosting

## Deployment

### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenship-org%2Fopenfront-marketplace)

### Deploy to Railway
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/openfront-marketplace)

### Environment Variables

See [`.env.example`](./.env.example) for a complete list of configuration options. Key variables:

```env
# OpenRouter Configuration (for Global Mode)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_MAX_TOKENS=4000
```

**For Local Mode** (user's own key) or **MCP Client Mode**, no environment variables are required.

## Use Cases

### Niche Marketplaces
Fork this repo to create specialized marketplaces:
- Sustainable brands in your region
- Local independent shops in your city
- Vintage collectibles from curated sellers
- Handmade goods from specific artisans

### Multi-Store Networks
Connect multiple Openfront stores you operate:
- Different brands under one discovery platform
- Regional stores with localized products
- Franchise networks with independent operators

### Community Platforms
Build discovery platforms for communities:
- Maker communities with distributed shops
- Co-op networks with independent members
- Artist collectives with separate storefronts

## Documentation

- **Marketplace Setup**: [docs.openship.org/marketplace/setup](https://docs.openship.org/marketplace/setup)
- **Adding Stores**: [docs.openship.org/marketplace/stores](https://docs.openship.org/marketplace/stores)
- **AI Configuration**: [docs.openship.org/marketplace/ai](https://docs.openship.org/marketplace/ai)
- **Ethos & Vision**: See [/ethos](https://marketplace.openfront.org/ethos) for the complete story

## The Openship Ecosystem

This marketplace is part of the broader Openship initiative:

- **[Openfront](https://openfront.org)**: Open source e-commerce platforms for every vertical that merchants can truly own
- **[Openship](https://openship.org)**: Multi-channel order orchestration and fulfillment automation
- **[Opensource.Builders](https://opensource.builders)**: Capability-focused directory mapping features to actual code

Together, these platforms enable fully decentralized commerce where businesses own their infrastructure and marketplaces exist purely for discovery.

## Contributing

We welcome contributions! Whether you're:
- Adding new features to the marketplace
- Improving AI-powered discovery
- Enhancing the store integration system
- Fixing bugs or improving documentation

Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [docs.openship.org/marketplace](https://docs.openship.org/marketplace)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/openship-org/openfront-marketplace/issues)
- **Community**: Join our community discussions
- **Ethos**: Read about our vision at [/ethos](/ethos)

---

**Openfront Marketplace** - Discovery Without Rent
Part of the Openship Initiative • Built with Next.js 15
