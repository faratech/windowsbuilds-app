# WindowsBuilds React App

This is a React-based application for tracking Windows, Office, and Edge builds with advanced filtering and search capabilities.

## Architecture

The app is built with:
- React 18 with TypeScript
- Vite for build tooling
- React Query for data fetching
- SCSS for styling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Development mode:
```bash
npm run dev
```
The app will be available at http://localhost:3000

3. Build for production:
```bash
npm run build
# or use the build script
./build.sh
```

## Integration with XenForo

The app integrates with XenForo through:

1. **API Endpoints**: The PHP backend serves data through `/builds/api/*` endpoints
2. **Widget Integration**: The existing LatestBuilds widget provides data
3. **Template Loading**: The app can be loaded via XenForo templates

## File Structure

```
react-app/
├── src/
│   ├── components/       # React components
│   ├── services/         # API service layer
│   ├── types/           # TypeScript type definitions
│   ├── styles/          # SCSS stylesheets
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── dist/                # Built files (generated)
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## API Endpoints

The app consumes these API endpoints:

- `GET /builds/api/fetch` - Fetch builds for a specific tab
- `GET /builds/api/summary` - Get AI-generated summary for a build
- `GET /builds/api/channels/{type}` - Get available channels
- `GET /builds/api/applications` - Get Office applications list

## Deployment

1. Build the app: `npm run build`
2. Files are automatically copied to `/web/public_html/builds/`
3. Access the app at `https://windowsforum.com/builds/`

## Development Tips

- Use `npm run dev` for hot-reload development
- The API proxy in Vite config forwards `/api` requests to the PHP backend
- Components are modular and can be reused
- Styles use SCSS with CSS variables for theming