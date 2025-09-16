# WindowsBuilds React App Integration

## Overview

The WindowsBuilds addon now includes a complete React application for displaying Windows, Office, and Edge builds. The React app is integrated with XenForo's theme system and managed entirely within the addon structure.

## Directory Structure

```
src/addons/WindowsBuilds/
├── react-app/                 # React source code and build files
│   ├── src/                   # TypeScript React components
│   ├── package.json           # Dependencies and scripts
│   ├── build.sh              # Build and deployment script
│   └── dist/                 # Build output
├── Public/assets/            # Built React assets served by addon
├── Pub/Controller/
│   ├── Builds.php            # Main controller with React integration
│   └── ReactBuilds.php       # Alternative React route controller
└── _data/templates_react.xml # XenForo template for React wrapper
```

## Development Workflow

### Building the React App

1. Navigate to the React app directory:
   ```bash
   cd /web/public_html/src/addons/WindowsBuilds/react-app
   ```

2. Run the build script:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

3. The script will:
   - Install npm dependencies
   - Build the production bundle
   - Copy assets to `../Public/assets/`
   - Deploy to `/builds/` for backwards compatibility
   - Update asset paths

### Asset Management

React assets are now served from within the addon:
- **Source**: `src/addons/WindowsBuilds/Public/assets/`
- **URL Path**: `/builds/assets/react/[filename]`
- **Served by**: `Builds.php::actionAssets()` method

### XenForo Integration

The React app integrates with XenForo in two ways:

1. **Primary Route**: `/builds-react/` (when working)
   - Uses `ReactBuilds.php` controller
   - Template: `windowsbuilds_react_wrapper`

2. **Fallback Integration**: Modifying existing `/builds/` route
   - Updates `Builds.php::actionIndex()` to return React template
   - Same template: `windowsbuilds_react_wrapper`

## API Endpoints

The React app communicates with these endpoints:
- `/builds/api-test.php` - Main API for all build data
- Routes through XenForo for proper session/permission handling

## Template System

The React app uses the XenForo template `windowsbuilds_react_wrapper` which:
- Extends `PAGE_CONTAINER` for full forum theme integration
- Includes React assets (CSS, JS)
- Provides SEO meta tags and structured data
- Contains the `#windows-builds-root` div for React mounting

## Deployment

1. **Development**: Make changes in `react-app/src/`
2. **Build**: Run `./build.sh` in `react-app/` directory
3. **Test**: Access via `/builds-react/` or standalone at `/builds/react-app.html`
4. **Production**: Assets are served from addon, no external dependencies

## Caching

- React assets: Cached for 1 hour (`Cache-Control: public, max-age=3600`)
- Main page: No cache (configured in `/builds/.htaccess`)
- API responses: Cached per existing WindowsBuilds logic

## Benefits of Addon Integration

✅ **Self-contained**: All React code and assets within addon structure
✅ **Version control**: React app versioned with addon
✅ **Easy deployment**: Single build script handles everything  
✅ **XenForo integration**: Proper theme, permissions, and routing
✅ **Maintainable**: Clear separation between React app and XenForo integration