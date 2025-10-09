# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NotionNext** blog system - a Next.js-powered static blog platform that uses Notion as a CMS. The project transforms Notion pages into a fully-featured blog with multiple themes and deployment options.

**Current State**: The repository previously contained a quiz system backend (`backend/`) and study app (`study-app/`), but these have been removed. The current focus is solely on the NotionNext blog system.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server
- `npm run build` - Build production version 
- `npm run start` - Start production server
- `npm run export` - Export static site (with cross-env EXPORT=true)
- `npm run build-all-in-dev` - Build with production environment variables in dev
- `npm run bundle-report` - Analyze bundle with webpack-bundle-analyzer
- `npm run post-build` - Generate sitemap after build

### Linting and Type Checking
- `npx eslint .` - Run ESLint (configured with Next.js, Prettier, TypeScript rules)
- `npx tsc --noEmit` - Run TypeScript type checking

## Architecture

### Core Architecture
- **Framework**: Next.js 14.2.4 with SSR/SSG capabilities
- **CMS**: Notion API as content management system
- **Styling**: Tailwind CSS + theme-specific styles
- **Rendering**: react-notion-x for Notion block rendering
- **Deployment**: Primarily Vercel, supports Docker and static export

### Key Directories Structure

```
NotionNext/
├── blog.config.js          # Main configuration file
├── next.config.js          # Next.js configuration with theme scanning
├── pages/                  # Next.js pages with dynamic routing
├── lib/                    # Core utilities and data fetching
│   ├── notion/            # Notion API integration
│   ├── cache/             # Cache management (memory, Redis, local file)
│   └── lang/              # Multi-language support
├── themes/                # Multiple theme implementations
│   ├── qianqian/         # Current default theme (千浅主题)
│   ├── proxio/           # Original proxio theme
│   ├── hexo/             # Hexo-style theme
│   ├── next/             # Next-style theme
│   └── [20+ other themes]
├── components/           # Shared global components
├── conf/                 # Modular configuration files
└── styles/              # Global styles and utilities
```

### Multi-Theme System

The project uses a **dynamic theme loading system**:

- **Theme Selection Priority**: `FORCE_THEME` > URL `?theme=` parameter > Notion config > `blog.config.js`
- **Default Theme**: `qianqian` (千浅主题 - 古雅今用，科技有温度, based on proxio)
- **Theme Structure**: Each theme has `index.js`, `config.js`, `style.js`, and `components/` directory
- **Dynamic Loading**: Themes are loaded dynamically using Next.js dynamic imports
- **Theme Components**: Resolved via webpack alias `@theme-components`

### Qianqian Theme Features

The current `qianqian` theme is a sophisticated landing page-style theme:
- **Design Philosophy**: "古雅今用，科技有温度" (Ancient-modern fusion with warm technology)
- **Hero Section**: Welcome overlay with customizable title and CTAs
- **Content Blocks**: Blog posts, features, career timeline, testimonials, FAQ
- **Interactive Elements**: Smooth scrolling, animated components, dark mode support
- **Customization**: Extensive configuration options in `themes/qianqian/config.js`

### Configuration Architecture

**Modular Config System** (in `/conf/` directory):
- `comment.config.js` - Comment system integration (Giscus, Gitalk, Twikoo, etc.)
- `analytics.config.js` - Analytics and tracking
- `image.config.js` - Image handling and optimization
- `animation.config.js` - Visual effects and animations
- `widget.config.js` - Floating widgets (chat, pets, music player)
- `plugin.config.js` - Third-party plugins (Algolia search, etc.)
- `notion.config.js` - Notion API configuration
- `layout-map.config.js` - Custom routing and layout mappings

### Data Flow

1. **Content Source**: Notion page ID(s) configured in `NOTION_PAGE_ID`
2. **Data Fetching**: `/lib/notion/` handles API calls and data transformation
3. **Caching**: Multi-layer caching (memory, Redis, file-based) with configurable TTL
4. **Rendering**: react-notion-x renders Notion blocks
5. **Theme**: Dynamic theme components handle presentation
6. **Output**: Static generation or server-side rendering

### Multi-Language Support

- Supports multiple Notion page IDs with language prefixes (e.g., `zh:pageId,en:pageId`)
- Language detection and routing handled in `lib/lang/`
- Next.js i18n configuration generated dynamically
- Current default: `zh-CN`

### Key Integration Points

- **Notion API**: Custom wrapper in `lib/notion/CustomNotionApi.ts`
- **Cache Management**: `lib/cache/cache_manager.js` with multiple backends
- **Image Optimization**: Next.js Image component with custom domains
- **SEO**: Dynamic sitemap, RSS feeds, and meta tag generation
- **Comments**: Multiple providers (Giscus, Gitalk, Twikoo, etc.)

### Environment Variables

Key configurations can be overridden via environment variables:
- `NOTION_PAGE_ID` - Notion page/database ID (supports multiple languages)
- `NEXT_PUBLIC_THEME` - Default theme
- `NEXT_PUBLIC_FORCE_THEME` - Force specific theme (highest priority)
- `NEXT_PUBLIC_LANG` - Default language
- `NEXT_PUBLIC_REVALIDATE_SECOND` - Cache invalidation interval

## Development Notes

### Theme Development
- Each theme must implement `LayoutBase` and routing-specific layouts
- Theme components are resolved via `@theme-components` alias
- Use `getLayoutByTheme()` for dynamic theme component loading
- Theme switching happens at runtime with DOM cleanup

### Configuration Changes
- Main config in `blog.config.js` imports from `/conf/` directory
- Theme configs in `themes/{theme}/config.js`
- Webpack alias setup in `next.config.js` for theme resolution

### Performance Considerations
- `NEXT_REVALIDATE_SECOND` controls cache invalidation (default: 5 seconds)
- Image optimization configured for common domains
- Bundle analysis available via `npm run bundle-report`
- Multi-language support adds complexity to routing and caching

### Deployment Modes
- **Vercel**: Default SSR/SSG deployment
- **Static Export**: `npm run export` for static hosting
- **Standalone**: Docker-compatible build
- **Self-hosted**: Node.js server mode

## Important Notes

- **Notion API Rate Limits**: Be mindful of API call frequency
- **Cache Strategy**: Multi-layer caching helps reduce API calls
- **Theme Compatibility**: Not all themes support all features
- **Image Domains**: Ensure all external image domains are configured in `next.config.js`
- **Environment Configuration**: Use environment variables for deployment-specific settings