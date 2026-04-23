# Full House — App Overview & Architecture

## Project Vision
**Full House** is a premium, collegiate-themed social platform exclusive to the Rutgers University community. It is designed to bridge the gap between digital interaction and real-world connection, focusing on four primary pillars:
1.  **The Table (Live Queue)**: Instant, randomized group chats (3–6 people) for quick social spurts.
2.  **Suits (Categories)**: Discovery by category (Freshman, Cooking, Socials, etc.) to find like-minded peers.
3.  **Meetups**: User-generated, short-lived social sessions occurring "on the floor" (campus).
4.  **Events**: Larger, verified campus events managed by admins and event managers.

---

## Infrastructure & Tech Stack

### 1. Frontend: Expo / React Native
- **Framework**: [Expo](https://expo.dev/) with [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing).
- **Platform**: Cross-platform (iOS, Android, Web), though primarily optimized for mobile layouts.
- **Icons**: `lucide-react-native` (brand/interface) and `@expo/vector-icons` (specific status indicators).
- **Styling**: Standard React Native `StyleSheet` using a centralized theme.

### 2. Backend: Supabase
- **Database**: PostgreSQL with Row-Level Security (RLS) and real-time triggers.
- **Authentication**: Email/Password limited to `@rutgers.edu` and `@scarletmail.rutgers.edu`.
- **Storage**: Buckets for user avatars (`avatars`) and event posters (`posters`).
- **Realtime**: Used for the Live Queue system and group messaging.

### 3. State Management & Hooks
- `useAuth`: Centralized authentication and profile state. Handles user roles (`admin`, `event_manager`, `user`).
- `useQueue`: Manages the "Live Queue" state, finding matches, and navigating to "The Table."
- `useTheme`: Provides dynamic access to the scarlet/ivory color palette.

---

## Design System (`lib/helpers.ts`)

The app follows a "Premium Collegiate" aesthetic characterized by:
- **Primary Color**: Scarlet Red (`#af101a`).
- **Surface**: Ivory / Off-white (`#fcf9f8`).
- **Typography**: 
    - `AbhayaLibre_800ExtraBold`: Used for high-end branding (Header logo).
    - `Newsreader_700Bold`: Used for display headlines and card titles.
    - `PlusJakartaSans`: Used for body text and interface labels.

### Key CSS Patterns
- **High Contrast**: Cards should generally be pure white (`#ffffff`) on an ivory background (`C.surfaceContainerHigh`).
- **Bento Grid**: Used on the Discover page for categories ("Suits").
- **Shadows**: Strong, lifted shadows on cards to create depth against the flat ivory surfaces.

---

## Developer/Agent Checklist

- **Admin Controls**: Admins can remove any meetup or event. Creators can end their own sessions.
- **Theme Consistency**: Always import `C` and `F` from `@/lib/helpers` for styling. Avoid ad-hoc colors.
- **Routing**: Tab screens are located in `app/(tabs)/`. Auth flow is in `app/(auth)/`. Setup/Onboarding is in `app/(setup)/`.
- **Data Fetching**: Always enforce `onboarding_completed` filters when searching for or matching users.

---

## Future Roadmap
- **Verified Groups**: Integration with existing Rutgers clubs.
- **Map View**: Geospatial visualization of active meetups.
- **Points/Rewards**: Gamification of campus social interaction.
