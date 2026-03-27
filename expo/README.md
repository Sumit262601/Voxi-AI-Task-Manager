# Voxi - AI Task Manager

Your intelligent task management companion powered by AI. Create, organize, and track tasks effortlessly with voice commands, smart scheduling, and detailed productivity analytics.

## Features

### AI-Powered Task Management
- **AI Assistant** — Chat with an AI agent to create and manage tasks using natural language
- **Voice Input** — Use your microphone to dictate tasks hands-free
- **Smart Suggestions** — Get contextual task suggestions like meetings, gym reminders, study sessions, and more

### Task Organization
- **Scheduled & Checklist Tasks** — Support for time-bound scheduled tasks and simple checklists
- **Priority Levels** — Assign priority to tasks with color-coded indicators
- **Custom Icons & Colors** — Personalize tasks with emojis and a rich color palette
- **Task Alerts** — Set custom alert times to get notified before tasks are due

### Calendar & Scheduling
- **Week Calendar View** — Navigate tasks by day with an interactive weekly calendar strip
- **Monthly Calendar** — Full calendar view to see all tasks at a glance
- **Calendar Sync** — Sync tasks with Apple Calendar or Google Calendar on your device
- **Weekly Plan View** — Plan your entire week with a dedicated weekly overview

### Statistics & Analytics
- **Completion Rates** — Track daily, weekly, monthly, and yearly task completion percentages
- **Time Tracking** — See total time spent on tasks with duration breakdowns
- **Streaks** — Monitor your productivity streaks and stay motivated
- **Visual Charts** — Progress rings, bar charts, and trend indicators for your productivity data

### Notifications
- **Push Notifications** — Get reminders for upcoming tasks
- **Notification Center** — In-app notification bell with unread badge and draggable notification panel
- **Notification History** — View all past notifications with task creation and completion events

### Authentication & Security
- **Email & Password** — Sign up and log in with email credentials
- **Apple Sign In** — Native Apple authentication for quick access
- **Guest Mode** — Try the app without creating an account
- **Biometric Lock** — Secure the app with Face ID or Touch ID
- **Onboarding Flow** — Guided introduction for new users

### Premium Subscription
- **In-App Purchases** — Weekly, monthly, and yearly subscription plans via RevenueCat
- **Premium AI Access** — Unlock the full AI assistant with a subscription
- **Advanced Statistics** — Access daily, monthly, and yearly analytics breakdowns
- **Paywall** — Beautiful subscription screen with plan comparison

### Profile & Settings
- **Editable Profile** — Update your name, phone, address, and profile photo
- **Calendar Sync Toggle** — Enable or disable device calendar integration
- **Biometric Toggle** — Turn Face ID / Touch ID lock on or off
- **Rate Us & Feedback** — Built-in modals to rate the app or send feedback
- **Subscription Management** — View and manage your current plan

## Tech Stack

- **React Native** — Cross-platform mobile framework
- **Expo SDK 54** — Managed workflow with Expo Router file-based routing
- **TypeScript** — Full type safety across the codebase
- **Supabase** — PostgreSQL database and authentication backend
- **RevenueCat** — In-app purchase and subscription management
- **Rork AI Toolkit** — AI agent and voice-to-text capabilities
- **React Query** — Server state management
- **Lucide React Native** — Icon library

## Project Structure

```
├── app/
│   ├── (auth)/               # Auth screens
│   │   ├── login.tsx         # Email/password login
│   │   ├── signup.tsx        # Account registration
│   │   └── onboarding.tsx    # First-launch onboarding
│   ├── (tabs)/               # Main tab navigation
│   │   ├── index.tsx         # Home — task list & week calendar
│   │   ├── calendar.tsx      # Monthly calendar view
│   │   ├── ai.tsx            # AI assistant chat
│   │   ├── statistics.tsx    # Productivity analytics
│   │   └── profile.tsx       # Settings & profile
│   ├── chat-agent.tsx        # Full-screen AI chat agent
│   ├── edit-profile.tsx      # Profile editing screen
│   ├── paywall.tsx           # Subscription paywall
│   └── _layout.tsx           # Root layout
├── components/
│   ├── home/                 # Home screen components
│   │   ├── AddTaskModal.tsx  # Create new task modal
│   │   ├── EditTaskModal.tsx # Edit existing task modal
│   │   ├── TaskCard.tsx      # Individual task card
│   │   ├── WeekCalendar.tsx  # Weekly date strip
│   │   ├── WeeklyPlanView.tsx# Weekly plan overview
│   │   ├── ProgressCard.tsx  # Daily progress indicator
│   │   ├── HomeHeader.tsx    # Home screen header
│   │   ├── CalendarModal.tsx # Date picker modal
│   │   ├── EmptyState.tsx    # Empty task list state
│   │   └── FAB.tsx           # Floating action button
│   ├── profile/              # Profile/settings modals
│   │   ├── NotificationsModal.tsx
│   │   ├── RateUsModal.tsx
│   │   ├── FeedbackModal.tsx
│   │   └── CalendarSyncModal.tsx
│   ├── auth/                 # Auth UI components
│   ├── BiometricLockScreen.tsx
│   └── ConfettiSprinkles.tsx # Task completion celebration
├── contexts/
│   ├── auth.tsx              # Authentication state & Supabase auth
│   ├── tasks.tsx             # Task CRUD operations & Supabase sync
│   └── purchases.tsx         # RevenueCat subscription state
├── utils/
│   ├── supabase.ts           # Supabase client configuration
│   ├── notifications.ts      # Push notification scheduling
│   ├── calendarSync.ts       # Device calendar integration
│   ├── biometricAuth.ts      # Face ID / Touch ID utilities
│   ├── dateUtils.ts          # Date formatting helpers
│   └── taskDate.ts           # Task date & duration parsing
├── constants/
│   └── colors.ts             # App color palette
└── app.json                  # Expo configuration
```

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run start

# Start web preview
bun run start-web
```

## Platforms

- iOS (primary)
- Android
- Web (via React Native Web)
