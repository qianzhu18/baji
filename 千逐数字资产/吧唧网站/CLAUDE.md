# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js web application for generating and previewing custom badge/button designs (吧唧生成与佩戴预览). The app allows users to upload photos, automatically center them using face detection, apply circular templates, and generate wearing previews on different items (shirts, backpacks, hats). The target audience is Chinese university students, particularly from Changsha University of Science and Technology.

**Core Concept**: MVP focused on a simple workflow: Upload → Auto-center → Template generation → Wear preview → WeChat conversion (no online payment).

## Development Commands

### Essential Commands
```bash
# Development server (uses Turbopack)
npm run dev

# Build for production (uses Turbopack)
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Development Environment
- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: Custom component library in `components/ui/`
- **Port**: 3000 (default)

## Architecture & Key Components

### Core Application Structure
```
web/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main single-page application
│   ├── layout.tsx         # Root layout with fonts and metadata
│   └── api/               # API routes
│       ├── generate/      # Badge generation endpoint
│       ├── quota/         # Usage quota management
│       └── lead/          # Lead capture (WeChat conversion)
├── components/
│   └── ui/               # Custom UI component library
└── public/
    └── mock/             # Mock preview images for development
```

### Key Technologies & Design System

#### Visual Design (Cyber-Neon x ACG Pop)
- **Primary Color**: `#3BA7FF` (天依霓虹蓝 - Tianyi Neon Blue)
- **Background**: `#0A0F21` (午夜深空 - Midnight Deep Space)
- **Theme**: Glassmorphism with neon glow effects
- **Typography**: Geist font (modern sans-serif)

#### CSS Architecture
- **Custom Properties**: Defined in `globals.css` for theme colors
- **Tailwind v4**: Using inline `@theme` configuration
- **Component Classes**: Custom utility classes like `.glass`, `.neon-btn`, `.skeleton`
- **Animations**: Keyframe animations for loading states and interactions

### UI Component System
All components in `components/ui/` follow consistent patterns:
- **Button**: Three variants (`primary`, `ghost`, `outline`) with neon effects
- **Dialog**: Modal overlay with backdrop blur
- **Form Controls**: Custom styled inputs, radio groups, sliders, switches
- **Layout**: Glass-effect containers with consistent spacing

### Core Features Implementation

#### 1. Upload & Face Detection
- **Current**: Manual upload with basic image preview and manual positioning
- **Planned**: Browser-based face detection using Human/MediaPipe for auto-centering
- **Interaction**: Drag-to-position and scale controls

#### 2. Template System
- **Sizes**: 58mm and 75mm circular badges
- **Backgrounds**: Solid color or gradient options
- **Overlay**: Circular crop guide with centering indicators

#### 3. Generation Workflow
- **API Endpoint**: `/api/generate` - Currently returns mock URLs
- **Quota System**: Cookie-based daily limit (5 uses/day) with 60s cooldown
- **Fallback Strategy**: Graceful degradation when external services fail

#### 4. Wear Preview
- **Three Views**: Shirt, backpack, hat (mock images in `/public/mock/`)
- **Interaction**: Tab switching with preview enlargement
- **Watermarking**: Brand watermark on all preview images

#### 5. Conversion Flow
- **WeChat Integration**: QR code modal for WeChat contact
- **Lead Capture**: Optional form for user details (nickname, quantity, notes)
- **University Targeting**: Special messaging for Changsha University students

### API Architecture

#### Current Implementation (MVP)
- **Session Management**: Cookie-based (`usedCount`, `nextAllowedAt`)
- **Rate Limiting**: Hard-coded quotas (5/day, 60s cooldown)
- **Mock Responses**: Static image URLs for development

#### Planned Integration
- **Volcengine API**: For background removal and image processing
- **Supabase**: Database persistence and file storage
- **Admin Panel**: Protected route for lead management and CSV export

### State Management
- **Client State**: React hooks (`useState`, `useEffect`) for UI state
- **Server State**: Next.js API routes with cookie sessions
- **No External State**: No Redux or other state management libraries

### File Handling
- **Upload**: Direct file input with client-side preview
- **Processing**: Currently client-side only, planned server-side processing
- **Storage**: Temporary URLs, planned Supabase Storage integration

## Environment Configuration

### Required Environment Variables
```bash
# Volcengine Integration
VOLCENGINE_API_KEY=
VOLCENGINE_ENDPOINT=

# Supabase Integration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=

# Application Configuration
ADMIN_PASSWORD=
NEXT_PUBLIC_WX_QR_URL=https://youke1.picui.cn/s1/2025/09/08/68bea85ed0b44.jpg
```

### Configuration Notes
- All variables defined in `.env.example`
- WeChat QR URL is public-facing for conversion
- Admin password for protected management routes

## Business Logic & Constraints

### Quota & Rate Limiting
- **Daily Limit**: 5 generations per session
- **Cooldown**: 60 seconds between generations
- **Session Tracking**: Cookie-based, no user authentication
- **Graceful Handling**: Clear error messages and countdown displays

### User Experience Guidelines
- **Single Page**: Complete workflow in one screen
- **Mobile First**: Responsive design for mobile devices
- **Chinese UI**: All interface text in Simplified Chinese
- **No AI Mentioning**: Avoid highlighting AI capabilities (user preference)

### Error Handling Strategy
- **Network Failures**: Graceful degradation to mock data
- **Service Timeouts**: Fallback to basic template generation
- **Validation**: Client-side validation with clear error messages
- **Loading States**: Skeleton loaders and progress indicators

## Development Notes

### Code Style
- **TypeScript**: Strict mode enabled
- **Component Structure**: Functional components with hooks
- **File Organization**: Co-located components and utilities
- **Imports**: Path aliases configured (`@/*` points to root)

### Testing & Quality
- **ESLint**: Configured with Next.js rules
- **Type Checking**: Strict TypeScript compilation
- **No Tests**: Not yet implemented in MVP phase

### Performance Considerations
- **Turbopack**: Enabled for faster development builds
- **Image Optimization**: Next.js Image component for optimized loading
- **Lazy Loading**: Components load as needed
- **Bundle Size**: Minimal dependencies for faster loading

## Future Development Path

### Phase 1 (Current MVP)
- Complete the basic workflow with mock services
- Implement face detection auto-centering
- Style refinement and polish

### Phase 2 (Integration)
- Volcengine API integration for background removal
- Supabase database and storage integration
- Admin panel for lead management

### Phase 3 (Enhancement)
- Batch processing for group orders
- Advanced template editor
- Payment integration and order management

## Key Files to Understand

1. **`app/page.tsx`** - Main application component and state management
2. **`app/globals.css`** - Complete design system and component styling
3. **`app/api/generate/route.ts`** - Core generation API and quota logic
4. **`components/ui/`** - Reusable component library
5. **`Prd.md`** - Comprehensive product requirements and technical specifications
6. **`审美方案.md`** - Detailed visual design guidelines and theme specifications