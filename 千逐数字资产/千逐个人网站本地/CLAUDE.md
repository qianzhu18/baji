# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal website project for 千逐 (Qianzhu) - a modern web application featuring both traditional UI sections and an interactive CLI-style terminal interface. The project combines Chinese classical aesthetics with modern technology, implementing a dual-interface approach where users can navigate through traditional web elements or use a command-line interface for exploration.

## Development Commands

### Core Commands
```bash
# Development server
npm run dev
# or
pnpm dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Custom test script (requires server running on port 3000)
./test.sh
```

### Package Management
- **Primary**: npm (default)
- **Alternative**: pnpm (supported)
- **Node version**: Compatible with Next.js 14.x

## Project Architecture

### Frontend Structure
```
qianzhu_website/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application with dual interface
│   ├── layout.tsx         # Root layout with metadata and fonts
│   ├── globals.css        # Global styles + jade color scheme
│   └── favicon.ico        # Site favicon
├── components/            # React components
│   ├── CLI.tsx            # Main CLI component with 14 commands
│   ├── ThemeToggle.tsx    # Light/dark theme switcher
│   └── Typewriter.tsx     # Typewriter effect component
├── fonts/                 # Local font files
│   ├── GeistVF.woff       # Geist Sans variable font
│   └── GeistMonoVF.woff   # Geist Mono variable font
├── next.config.mjs        # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

### Design System
- **Color Palette**: Jade-inspired colors with CSS custom properties
  - Paper White (#f5f5f1) - main background
  - Ink Green (#3a4f4b) - primary text
  - Jade Blue (#4a7c59) - links and accents
  - Seal Red (#c0504d) - highlights and interactions

- **Typography**: 
  - English: Geist Sans/Mono (local fonts in /fonts)
  - Chinese: Noto Serif SC, Microsoft YaHei, PingFang SC
  - Code: Geist Mono for CLI authenticity

## Key Features

### Dual Interface Architecture
The application implements a unique dual-interface approach:
- **Traditional UI**: Modern web sections with navigation, cards, and interactive elements
- **CLI Terminal**: Full-featured command-line interface with 14 commands
- **Seamless Integration**: Users can switch between interfaces using navigation or keyboard shortcuts

### CLI Commands System (14 commands)
- **Basic**: `help`, `clear`, `welcome`, `theme` (light/dark)
- **Personal**: `whoami`, `about`, `contact` 
- **Professional**: `skills`, `projects`
- **Cultural**: `poem`, `philosophy`, `knowledge`
- **Technical**: `ai`, `productivity`

### Interactive Elements
- **CLI Features**: Command history, auto-completion, blinking cursor, theme switching
- **Keyboard Navigation**: Arrow keys for history, Tab for completion, Ctrl/Cmd+K for fullscreen CLI
- **Modern UI**: Responsive design, smooth animations, glass morphism effects
- **Theme System**: Dynamic light/dark mode with CSS custom properties

## Technical Implementation

### Current State
- **Framework**: Next.js 14.2.16 with App Router
- **Styling**: Tailwind CSS v3.4.1 with custom jade theme
- **Language**: TypeScript with strict typing
- **Code Quality**: ESLint compliant, no warnings
- **Build Status**: Successfully compiles and builds
- **Deployment**: Ready for Vercel platform

### Key Components

#### CLI Component (`components/CLI.tsx`)
- **Architecture**: 500+ lines implementing full terminal functionality
- **Command System**: `useMemo` object mapping command names to handler functions
- **State Management**: 
  - `input`: Current command line input
  - `history`: Array of executed commands and outputs
  - `commandHistory`: Array of previous commands for navigation
  - `showCursor`: Blinking cursor animation state
- **Keyboard Events**: Arrow keys for history, Tab for auto-completion, Enter for execution
- **Performance**: Memoized commands, proper dependency arrays, DOM refs for focus

#### Main Application (`app/page.tsx`)
- **Layout State**: Complex state management for UI configuration
- **Section Management**: Multiple content sections (home, about, skills, projects, contact, cli)
- **Fullscreen CLI**: Modal-like fullscreen terminal experience
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Testing Framework
```bash
# Custom test script verifies:
- Server startup and page loading
- Page title and key element detection
- CLI component functionality
- Page size and performance metrics
- Chinese character rendering
```

### Styling Architecture
- **CSS Custom Properties**: Comprehensive theming system in `globals.css`
- **Terminal Styling**: Authentic CLI appearance with custom scrollbars
- **Animation System**: Fade-in effects, typewriter animations, smooth transitions
- **Responsive Design**: Mobile-optimized with breakpoint adjustments

## Development Guidelines

### Code Quality Standards
- **TypeScript**: Strict typing enabled, no implicit any
- **ESLint**: Next.js configuration with no warnings
- **Performance**: useMemo/useCallback optimization, proper cleanup
- **Accessibility**: Semantic HTML, keyboard navigation support

### Styling Conventions
- **Tailwind CSS**: Primary styling approach with utility classes
- **CSS Custom Properties**: Theming and dynamic values
- **Component Styles**: Co-located with components when needed
- **Responsive**: Mobile-first with progressive enhancement

### Performance Considerations
- **Font Loading**: Local fonts for performance and privacy
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component (when images added)
- **Bundle Size**: Minimal dependencies, focused functionality

## Deployment

### Vercel Configuration
- **Framework**: Auto-detected as Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Environment Variables
```bash
# Optional for production
NEXT_PUBLIC_SITE_URL=https://qianzhu.dev
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Project Context

### Design Philosophy
The project represents a unique blend of:
- **Chinese Classical Aesthetics**: "温润如玉" (gentle as jade) philosophy
- **Modern Web Development**: Next.js, TypeScript, Tailwind CSS
- **Interactive Storytelling**: Dual-interface approach for user engagement
- **Technical Expertise**: Showcase of full-stack development capabilities

### Target Audience
- **Tech Professionals**: Developers and engineers interested in unique UI/UX
- **AI Enthusiasts**: Those interested in cognitive science and AI exploration
- **Chinese Culture Appreciators**: Users who value cultural fusion in technology
- **Potential Collaborators**: Open source contributors and project partners

### Content Strategy
- **Layered Information**: Basic introduction → Technical details → Philosophical insights
- **Interactive Discovery**: Users explore through both traditional and CLI interfaces
- **Cultural Fusion**: Bilingual content with modern presentation
- **Living Documentation**: Evolving showcase of skills and projects