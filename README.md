# FlipVerse

A modern, casino platform built on Solana blockchain featuring multiple games, wallet integration, and comprehensive admin management.

##Feature

### 🎮 Gaming Platform

-   **6 Casino Games**: Slots, Crash, Mines, Dice, Plinko, and Coinflip
-   **Solana Integration**: Native SOL betting with PDA (Program Derived Address) wallets
-   **Real-time Gaming**: Live game results and animations
-   **Provably Fair**: Transparent and verifiable game outcomes

### 💰 Wallet & Rewards

-   **Multi-Wallet Support**: Phantom, Glow, Nightly wallet integration
-   **PDA Wallet System**: Secure on-chain wallet management
-   **Rewards System**: Daily/weekly chests and bonus rewards
-   **Referral Program**: Comprehensive referral tracking and commissions

### 🛠️ Admin Dashboard

-   **User Management**: Complete user administration with status controls
-   **Transaction Monitoring**: Real-time transaction tracking and analytics
-   **Chest Management**: Reward distribution and chest administration
-   **Bot Management**: Automated user simulation and activity generation
-   **Referral Analytics**: Detailed referral performance metrics

### 🎨 Modern UI/UX

-   **Glass Morphism Design**: Beautiful modern interface with gradient effects
-   **Responsive Layout**: Mobile-first design approach
-   **Dark Theme**: Sleek dark interface with neon accents
-   **Loading States**: Comprehensive skeleton loading components
-   **Toast Notifications**: Centralized notification system

## 🛠️ Tech Stack

-   **Framework**: Next.js 15.4.4 with App Router
-   **Frontend**: React 19.1.0, TypeScript 5
-   **Styling**: Tailwind CSS 4 with custom glass morphism components
-   **Blockchain**: Solana Web3.js, Anchor Framework
-   **Animations**: Lottie React, Matter.js (for Plinko physics)
-   **UI Components**: Lucide React icons, Embla Carousel
-   **Real-time**: Socket.io client integration
-   **Data Visualization**: D3.js for charts and analytics

## 📦 Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd flipverse
    ```

2. **Install dependencies**

    ```bash
    npm install
    # or
    pnpm install
    # or
    yarn install
    ```

3. **Set up environment variables**

    ```bash
    cp .env.example .env.local
    ```

    Configure your Solana RPC endpoints and other environment variables.

4. **Run the development server**

    ```bash
    npm run dev
    # or
    pnpm dev
    # or
    yarn dev
    ```

5. **Open your browser**
   Navigate to []()

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (admin)/           # Admin dashboard routes
│   │   └── admin/
│   │       ├── users/     # User management
│   │       ├── transactions/ # Transaction monitoring
│   │       ├── chests/    # Chest management
│   │       ├── bots/      # Bot management
│   │       └── referrals/ # Referral analytics
│   ├── (main)/            # Main application routes
│   │   ├── coinflip/      # Coinflip game
│   │   ├── crash/         # Crash game
│   │   ├── dice/          # Dice game
│   │   ├── mines/         # Mines game
│   │   ├── plinko/        # Plinko game
│   │   ├── slots/         # Slots game
│   │   ├── rewards/       # Rewards system
│   │   └── referrals/     # User referral dashboard
│   └── r/                 # Referral tracking routes
├── components/
│   ├── admin/             # Admin-specific components
│   ├── coinflip/          # Coinflip game components
│   ├── common/            # Shared UI components
│   ├── crash/             # Crash game components
│   ├── dice/              # Dice game components
│   ├── mines/             # Mines game components
│   ├── plinko/            # Plinko game components
│   ├── slots/             # Slots game components
│   └── wallet-connect/    # Wallet integration components
├── contexts/
│   ├── AdminContext.tsx   # Admin state management
│   └── WalletContext.tsx  # Wallet state management
├── data/
│   └── plinko-multipliers.json # Game configuration
└── utils/                 # Utility functions and services
```

## 🎮 Available Games

### 🪙 Coinflip

Classic heads or tails betting with 2x multiplier.

### 📈 Crash

Multiplier game where players cash out before the crash.

### 💣 Mines

Grid-based game where players avoid hidden mines.

### 🎲 Dice

Roll dice with customizable win conditions and multipliers.

### 🏀 Plinko

Physics-based ball drop game with multiple multiplier slots.

### 🎰 Slots

Traditional slot machine with various winning combinations.

## 🔧 Development

### Available Scripts

-   `pnpm run dev` - Start development server
-   `pnpm run build` - Build for production
-   `pnpm run start` - Start production server
-   `pnpm run lint` - Run ESLint

### Key Features for Developers

-   **Component-based Architecture**: Modular, reusable components
-   **TypeScript Support**: Full type safety throughout the application
-   **Responsive Design**: Mobile-first approach with Tailwind CSS
-   **State Management**: Context-based state management for wallet and admin
-   **Error Handling**: Comprehensive error boundaries and toast notifications
-   **Loading States**: Skeleton components for better UX

## 🚀 Deployment

The application is optimized for deployment on Vercel:

1. **Build the application**

    ```bash
    pnpm run build
    ```

2. **Deploy to Vercel**
    ```bash
    vercel --prod
    ```

For other platforms, ensure you have the proper environment variables configured for Solana RPC endpoints.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For support and questions, please contact the development team.

---
