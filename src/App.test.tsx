import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { queryClient } from './App';
import { apiService } from './services/api';
import type { EdgeBuild, OfficeBuild, WindowsBuild } from './types';

vi.mock('./services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/api')>();
  return {
    ...actual,
    apiService: {
      fetchWindowsBuilds: vi.fn(),
      fetchEdgeBuilds: vi.fn(),
      fetchOfficeBuilds: vi.fn(),
      fetchBuildSummary: vi.fn().mockResolvedValue('A summary.'),
    },
  };
});

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const windowsBuilds: WindowsBuild[] = [
  { uuid: 'w-beta', title: 'Win11 Beta Build', arch: 'amd64', build: '26120.1', build_type: 'beta', created: recent(1) },
  { uuid: 'w-release', title: 'Win11 Release Build', arch: 'amd64', build: '26100.1', build_type: 'release', created: recent(2) },
  { uuid: 'w-canary', title: 'Win11 Canary Build', arch: 'amd64', build: '28000.1', build_type: 'canary', created: recent(3) },
];

// 4 of these are `release`, one is `beta` — mirroring the live distribution
// (113 release / 4 beta) that made the leak so visible on the Office tab.
const officeBuilds: OfficeBuild[] = [
  { id: '', title: 'M365 Current 20228', build: '20228.20050', version: '2607', channel: 'Current Channel', build_type: 'release', releaseDate: recent(1) },
  { id: '', title: 'M365 Current 20227', build: '20227.20010', version: '2606', channel: 'Current Channel', build_type: 'release', releaseDate: recent(2) },
  { id: '', title: 'M365 Monthly 20220', build: '20220.20001', version: '2605', channel: 'Monthly Enterprise', build_type: 'release', releaseDate: recent(3) },
  { id: '', title: 'M365 Preview 20230', build: '20230.20000', version: '2607', channel: 'Current Channel (Preview)', build_type: 'beta', releaseDate: recent(4) },
];

const edgeBuilds: EdgeBuild[] = [
  { Product: 'Stable', Version: '152.0.1.0', Platform: 'Windows', Architecture: 'x64', PublishedTime: recent(1), ReleaseId: 1, build_type: 'release', Artifacts: [{ ArtifactName: 'msi', Location: 'https://edge.example/a.msi' }] },
  { Product: 'Canary', Version: '153.0.1.0', Platform: 'Windows', Architecture: 'x64', PublishedTime: recent(2), ReleaseId: 2, build_type: 'canary', Artifacts: [] },
  { Product: 'Beta', Version: '152.0.0.9', Platform: 'MacOS', Architecture: 'arm64', PublishedTime: recent(3), ReleaseId: 3, build_type: 'beta', Artifacts: [] },
];

const buildCount = async (expected: number) =>
  waitFor(() => expect(screen.getByText(`${expected} builds found`)).toBeInTheDocument());

beforeEach(() => {
  queryClient.clear();
  window.history.replaceState({}, '', '/builds/windows11');
  vi.mocked(apiService.fetchWindowsBuilds).mockResolvedValue(windowsBuilds);
  vi.mocked(apiService.fetchOfficeBuilds).mockResolvedValue(officeBuilds);
  vi.mocked(apiService.fetchEdgeBuilds).mockResolvedValue(edgeBuilds);
});

afterEach(() => queryClient.clear());

describe('channel filter scoping across tabs', () => {
  it('applies the Windows channel chip to Windows builds', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    await user.click(screen.getByRole('button', { name: /Beta channel build/i }));
    await buildCount(1);
    // `AnimatePresence mode="wait"` swaps the skeleton out before mounting the
    // list, so the cards land a tick after the count badge updates.
    expect(await screen.findByText('Win11 Beta Build')).toBeInTheDocument();
  });

  it('does not let a Windows channel chip hide Office builds', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    // Pick a channel on Windows...
    await user.click(screen.getByRole('button', { name: /Beta channel build/i }));
    await buildCount(1);

    // ...then switch to Office, where the chip bar is not even rendered.
    await user.click(screen.getByRole('button', { name: /Office 365/ }));

    // Before the fix this showed 1 of 4: `build_type !== 'beta'` was applied to
    // Office records too, with no visible control to clear it.
    await buildCount(4);
    expect(screen.queryByRole('button', { name: /Beta channel build/i })).not.toBeInTheDocument();
  });

  it('does not let a Windows channel chip hide Edge builds', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    await user.click(screen.getByRole('button', { name: /Canary channel build/i }));
    await buildCount(1);

    await user.click(screen.getByRole('button', { name: /Microsoft Edge/ }));
    // Default platform filter is Windows, so 2 of the 3 Edge builds qualify —
    // and the canary chip must not narrow that to 1.
    await buildCount(2);
  });

  it('keeps the chip selected when returning to a Windows tab', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    await user.click(screen.getByRole('button', { name: /Beta channel build/i }));
    await user.click(screen.getByRole('button', { name: /Office 365/ }));
    await buildCount(4);

    await user.click(screen.getByRole('button', { name: /Windows 11/ }));
    await buildCount(1);
    expect(screen.getByRole('button', { name: /Beta channel build/i })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('date range coherence', () => {
  it('disables the year select while a rolling window is active', async () => {
    render(<App />);
    await buildCount(3);

    const year = screen.getByLabelText('Filter by year');
    expect(year).toBeDisabled();
    expect(year).toHaveValue('All');
  });

  it('re-enables the year select for a calendar month, and never sends both', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    await user.selectOptions(screen.getByLabelText('Filter by date range'), 'July');
    const year = screen.getByLabelText('Filter by year');
    expect(year).toBeEnabled();

    await user.selectOptions(year, '2026');
    await waitFor(() => {
      const call = vi.mocked(apiService.fetchWindowsBuilds).mock.calls.at(-1);
      expect(call?.[0].date).toEqual({ mode: 'calendar', month: 'July', year: '2026' });
    });

    // Back to rolling: the year is dropped, not silently combined.
    await user.selectOptions(screen.getByLabelText('Filter by date range'), 'Last 30 Days');
    await waitFor(() => {
      const call = vi.mocked(apiService.fetchWindowsBuilds).mock.calls.at(-1);
      expect(call?.[0].date).toEqual({ mode: 'rolling', days: 30 });
    });
  });
});

describe('network traffic', () => {
  it('does not refetch when a client-only filter changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    const before = vi.mocked(apiService.fetchWindowsBuilds).mock.calls.length;

    await user.selectOptions(screen.getByLabelText('Sort builds'), 'date-asc');
    await user.type(screen.getByLabelText('Search builds'), 'Beta');
    await user.click(screen.getByRole('button', { name: /Beta channel build/i }));

    await waitFor(() => expect(screen.getByText('1 builds found')).toBeInTheDocument());
    // Sort order, search text and the channel chip are all resolved locally.
    expect(vi.mocked(apiService.fetchWindowsBuilds).mock.calls.length).toBe(before);
  });

  it('does refetch when a server-side parameter changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    const before = vi.mocked(apiService.fetchWindowsBuilds).mock.calls.length;
    await user.selectOptions(screen.getByLabelText('Filter by architecture'), 'arm64');

    await waitFor(() =>
      expect(vi.mocked(apiService.fetchWindowsBuilds).mock.calls.length).toBeGreaterThan(before));
  });
});

describe('error handling', () => {
  it('reports a backend error instead of showing an empty state', async () => {
    vi.mocked(apiService.fetchWindowsBuilds).mockRejectedValue(new Error('Failed to fetch data'));
    render(<App />);

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(within(alert).getByText('Failed to fetch data')).toBeInTheDocument();
    expect(screen.queryByText('No builds found')).not.toBeInTheDocument();
  });
});

describe('tab navigation', () => {
  it('ignores a click on the already-active tab instead of pushing history', async () => {
    const user = userEvent.setup();
    const pushState = vi.spyOn(window.history, 'pushState');
    render(<App />);
    await buildCount(3);

    await user.click(screen.getByRole('button', { name: /Windows 11/ }));
    expect(pushState).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Office 365/ }));
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('closes an open build modal when the tab changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    const detailButtons = await screen.findAllByRole('button', { name: /View details for/i });
    await user.click(detailButtons[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // The tab bar sits behind an inert overlay, so drive the change the way a
    // browser back-navigation would.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Office 365/ }));
    await buildCount(4);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('office downloads', () => {
  it('offers one Download Center link and no per-build download buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await buildCount(3);

    await user.click(screen.getByRole('button', { name: /Office 365/ }));
    await buildCount(4);

    expect(screen.getByRole('link', { name: /Microsoft 365 Download Center/i }))
      .toHaveAttribute('href', 'https://www.microsoft.com/en-us/download/office');
    expect(screen.queryByRole('button', { name: /^Download/ })).not.toBeInTheDocument();
  });
});
