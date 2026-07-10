import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open build</button>
      <Modal isOpen={open} onClose={close} title="Windows 11 Build 26200">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    </div>
  );
}

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Open build' }));
  return screen.findByRole('dialog');
};

describe('Modal accessibility', () => {
  beforeEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('exposes a labelled modal dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dialog = await openModal(user);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Windows 11 Build 26200');
  });

  it('renders into document.body so it escapes any transformed ancestor', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const dialog = await openModal(user);

    // `.wf-frost` sets backdrop-filter, which makes an ancestor a containing
    // block for `position: fixed`. A portal sidesteps that entirely.
    expect(dialog.closest('.wf-modal-layer')?.parentElement).toBe(document.body);
  });

  it('gives the close button an accessible name', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openModal(user);

    // Previously an icon-only button with no text and no aria-label.
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('moves focus into the dialog and restores it to the trigger on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open build' });

    const dialog = await openModal(user);
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('traps Tab within the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openModal(user);

    const close = screen.getByRole('button', { name: 'Close dialog' });
    const last = screen.getByRole('button', { name: 'Last action' });

    last.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('closes on Escape and on a backdrop click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await openModal(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    await openModal(user);
    await user.click(document.querySelector('.wf-modal-layer > div')!);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });
});

describe('Modal scroll handling', () => {
  it('locks the real scrolling element, not just <body>', async () => {
    // On the XenForo page `document.scrollingElement` is <html>. Locking only
    // <body> passes in jsdom and lets the page scroll behind the dialog in a
    // real browser, so assert both.
    const user = userEvent.setup();
    render(<Harness />);

    await openModal(user);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores the previous overflow values on close', async () => {
    const user = userEvent.setup();
    document.documentElement.style.overflow = 'visible';
    document.body.style.overflow = 'auto';
    render(<Harness />);

    await openModal(user);
    await user.keyboard('{Escape}');

    await waitFor(() => expect(document.body.style.overflow).toBe('auto'));
    expect(document.documentElement.style.overflow).toBe('visible');
  });

  it('never scrolls the page to the top when opening', async () => {
    // The old implementation called `window.scrollTo({ top: 0 })` on open,
    // yanking the reader away from wherever they were on the forum page.
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Harness />);

    await openModal(user);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
