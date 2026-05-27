# Windows Builds Tracker

A modern React application for tracking Windows, Microsoft Edge, and Office 365 builds.

## Features

- **Multi-Platform Support**: Track Windows 11, Windows 10, Windows Server, Microsoft Edge, and Office 365 builds
- **Real-time Filtering**: Search and filter builds by date, architecture, build type, and more
- **Build Details**: View comprehensive information about each build including summaries and download links
- **Dark Mode Support**: Fully responsive design with light and dark theme support
- **Caching**: Intelligent caching system to minimize API calls

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **API Integration** with Windows Update APIs

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Configuration

The development proxy sends `/api/builds/*` requests to `http://localhost:8000`. Configure `VITE_API_BASE` if your backend runs somewhere else.

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_BASE=/api
```

## Project Structure

```
src/
├── components/       # React components
├── services/        # API services
├── types/          # TypeScript type definitions
├── App.tsx         # Main application component
├── index.css       # Global styles with Tailwind
└── main.tsx        # Application entry point
```

## Features in Detail

### Build Types

- **Canary**: Bleeding edge builds
- **Dev**: Development channel builds
- **Beta**: Beta testing builds
- **Insider**: Windows Insider builds
- **Release**: Stable release builds
- **Stable**: Production-ready builds

### Filtering Options

- Search by build number or title
- Filter by year and month
- Architecture selection (AMD64/ARM64)
- Exclude insider builds option
- Build type filtering

## License

MIT
