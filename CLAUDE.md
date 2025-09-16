# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based Windows Builds Tracker application integrated with XenForo as an addon. The app displays Windows 11, Windows 10, Windows Server, Microsoft Edge, and Office 365 builds with real-time filtering and AI-powered summaries.

## Architecture

### Dual-System Integration

**React App** (`/web/windowsbuilds_app/`):
- Standalone React/TypeScript application built with Vite
- Deployed to `/web/public_html/js/WindowsBuilds/`
- Mounted to `#windows-builds-root` div in XenForo template

**XenForo Addon** (`/web/public_html/src/addons/WindowsBuilds/`):
- Controller: `Pub/Controller/Builds.php` - Serves the page and provides asset paths
- Template: `_data/templates.xml` - Renders React mount point with full-width CSS overrides
- Routes: `_data/routes.xml` - Maps `/builds/` URL to controller

### Key Integration Points

1. **Asset Management**: React build outputs hashed CSS/JS files that must be referenced in the XenForo controller
2. **Theme Detection**: React app auto-detects XenForo's theme via `data-color-scheme` and `data-variation` attributes on `<html>`
3. **Mount Strategy**: App tries `#windows-builds-root` first, falls back to `#root` for standalone testing

## Build Commands

```bash
# Development
npm run dev                    # Start dev server on port 3000

# Production Build
npm run build                  # Build only (creates dist/)
npm run build:full             # Build + auto-update XenForo controller
npm run update:controller      # Update controller with current asset paths

# Other Commands
npm run lint                   # Run ESLint
npm run preview               # Preview production build
```

## Deployment Process

The `build:full` command executes:
1. TypeScript compilation and Vite build
2. Copies assets to `/web/public_html/js/WindowsBuilds/`
3. Updates controller with new hashed filenames via `update-controller.sh`
4. Creates backup of controller before updating

## Critical Scripts

**`update-controller.sh`**: Automatically updates the XenForo controller with new asset filenames after build. Uses `ls -t` to find newest files and `sed` to update paths.

**`build-and-update.sh`**: Orchestrates full build and deployment process, called by `npm run build:full`.

## XenForo Integration Specifics

### Asset Path Configuration
The controller (`Builds.php`) hardcodes asset paths that must match the built files:
```php
$assets = [
    'css' => '/js/WindowsBuilds/index-[hash].css',
    'js' => '/js/WindowsBuilds/index-[hash].js'
];
```

### Full-Width Layout
The template includes CSS overrides to break out of XenForo's container constraints:
- Removes `max-width` from all parent containers
- Hides the side navigation (`p-sideNav`)
- Sets all padding to 0

### Theme Synchronization
The `ThemeContext` monitors XenForo's theme attributes and updates accordingly:
- Checks `data-color-scheme` (dark/light)
- Checks `data-variation` (alternate/default)
- Uses MutationObserver to detect runtime changes

## API Configuration

The app expects an API backend at `http://localhost:8001` (configured in `vite.config.ts` proxy). The API provides:
- `/builds/windows` - Windows builds data
- `/builds/edge` - Edge builds data
- `/builds/office` - Office builds data
- `/builds/summary` - AI-generated build summaries

## Component Architecture

**Main Components**:
- `App.tsx` - Main application with tab navigation and filtering
- `components/BuildCard.tsx` - Individual build display card
- `components/BuildDetailsModal.tsx` - Detailed build information modal
- `components/layout/Header.tsx` - App header (simplified for XenForo integration)

**Service Layer**:
- `services/api.ts` - API client using axios with React Query
- `contexts/ThemeContext.tsx` - Theme management with XenForo detection

## State Management

- **React Query**: For API data fetching and caching
- **Local State**: Filter states managed in App.tsx
- **Theme State**: Managed via ThemeContext with localStorage persistence

## Build Output Structure

After build, assets are deployed to:
```
/web/public_html/js/WindowsBuilds/
├── index-[hash].css
├── index-[hash].js
└── vendor-[hash].js
```

## XenForo Cache Management

After template or route changes:
```bash
cd /web/public_html && php cmd.php xf:rebuild-master-data
```

## Common Issues and Solutions

1. **Asset paths mismatch**: Run `npm run update:controller` after any build
2. **Template not updating**: Rebuild XenForo master data
3. **Theme not syncing**: Ensure XenForo's HTML has proper data attributes
4. **Width constraints**: Check template CSS overrides are properly applied