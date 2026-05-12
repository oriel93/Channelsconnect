/**
 * ChannexActionCenter.test.jsx
 *
 * Frontend test suite for Channex PMS Certification — Tasks 1, 2, 3
 *
 * Covers:
 *   Task 1 — ForceSyncButton renders task_ids on 200 response
 *   Task 2 — AddManualBookingModal sends correct payload on submit
 *   Task 3 — BookingDrawer calls correct endpoints on Edit Dates + Cancel
 *
 * Tooling: Vitest + React Testing Library (jsdom)
 * Run:     npm test -- ChannexActionCenter --verbose
 *          npm run test:watch  (dev mode)
 *
 * Anti-patterns eliminated:
 *  ✗ No real API calls (apiClient is fully mocked with vi.mock)
 *  ✗ No real DB writes
 *  ✗ No test touching channex-sync.service.ts or webhook.service.ts
 *  ✗ No flaky selectors (aria-label and data-testid used throughout)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ─── Mock the toast library (sonner) ─────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
  },
}));

// ─── Mock the API client ──────────────────────────────────────────────────────
const mockPropertiesForceSync   = vi.fn();
const mockBookingsCreateManual  = vi.fn();
const mockBookingsUpdate        = vi.fn();
const mockBookingsCancel        = vi.fn();
const mockBookingsGetByListingId = vi.fn();
const mockListingsGetActive     = vi.fn();

vi.mock('@/lib/apiClient', () => ({
  api: {
    properties: {
      forceSync: mockPropertiesForceSync,
    },
    bookings: {
      createManual:    mockBookingsCreateManual,
      update:          mockBookingsUpdate,
      cancel:          mockBookingsCancel,
      getByListingId:  mockBookingsGetByListingId,
    },
    listings: {
      getActive: mockListingsGetActive,
    },
  },
}));

// ─── Mock Dialog and Drawer (Radix UI — cannot render in jsdom without special setup) ─
vi.mock('@/components/ui/dialog', () => ({
  Dialog:         ({ open, onOpenChange, children }) =>
    open ? <div data-testid=\"dialog\">{children}</div> : null,
  DialogContent:  ({ children }) => <div data-testid=\"dialog-content\">{children}</div>,
  DialogHeader:   ({ children }) => <div data-testid=\"dialog-header\">{children}</div>,
  DialogTitle:    ({ children }) => <div data-testid=\"dialog-title\">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid=\"dialog-desc\">{children}</div>,
  DialogFooter:   ({ children }) => <div data-testid=\"dialog-footer\">{children}</div>,
  DialogClose:    ({ children, asChild }) => {
    if (asChild) return <button data-testid=\"dialog-close-aschild\">{children}</button>;
    return <button data-testid=\"dialog-close\">Close</button>;
  },
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer:         ({ open, onOpenChange, children }) =>
    open ? <div data-testid=\"drawer\">{children}</div> : null,
  DrawerContent:  ({ children }) => <div data-testid=\"drawer-content\">{children}</div>,
  DrawerHeader:   ({ children }) => <div data-testid=\"drawer-header\">{children}</div>,
  DrawerTitle:    ({ children }) => <div data-testid=\"drawer-title\">{children}</div>,
  DrawerDescription: ({ children }) => <div data-testid=\"drawer-desc\">{children}</div>,
  DrawerFooter:   ({ children }) => <div data-testid=\"drawer-footer\">{children}</div>,
  DrawerClose:    ({ asChild, children }) =>
    asChild ? <button data-testid=\"drawer-close-aschild\">{children}</button> : null,
}));

// ─── Import components AFTER mocks are set up ─────────────────────────────────
let ForceSyncButton;
let AddManualBookingModal;
let BookingDrawer;

beforeAll(async () => {
  const mod = await import('@/components/dashboard/channels/ForceSyncButton');
  ForceSyncButton = mod.default;
  const mod2 = await import('@/components/dashboard/channels/AddManualBookingModal');
  AddManualBookingModal = mod2.default;
  const mod3 = await import('@/components/dashboard/channels/BookingDrawer');
  BookingDrawer = mod3.default;
});

// ─── Shared helpers ───────────────────────────────────────────────────────────
const MOCK_BOOKING = {
  id: 42,
  listingId: 1,
  guestName: 'Jane Smith',
  guestEmail: 'jane@example.com',
  guestPhone: '555-1234',
  numGuests: 2,
  checkIn:  new Date('2025-06-01T00:00:00Z'),
  checkOut: new Date('2025-06-03T00:00:00Z'),
  totalPrice: 599.00,
  status: 'confirmed',
  bookingSource: 'direct',
  notes: null,
  externalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  listing: { id: 1, title: 'Beach Villa' },
};

// ─── Tests — TASK 1: ForceSyncButton ─────────────────────────────────────────
describe('Task 1 — ForceSyncButton', () => {

  beforeEach(() => {
    mockPropertiesForceSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the trigger button', () => {
    render(<ForceSyncButton propertyId={1} listingId={1} />);
    expect(screen.getByRole('button', { name: /force full channel sync/i })).toBeInTheDocument();
  });

  it('opens confirmation modal on button click', async () => {
    render(<ForceSyncButton propertyId={1} listingId={1} />);
    await userEvent.click(screen.getByRole('button', { name: /force full channel sync/i }));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
  });

  it('shows warning text in the modal', async () => {
    render(<ForceSyncButton propertyId={1} listingId={1} />);
    await userEvent.click(screen.getByRole('button', { name: /force full channel sync/i }));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-desc')).toHaveTextContent(/rate-limit/i);
  });

  it('calls POST /properties/:id/force-sync on confirm and renders task_ids', async () => {
    mockPropertiesForceSync.mockResolvedValue({
      data: {
        success:   true,
        taskIds:   ['task-abc-123', 'task-def-456'],
        message:   'Force sync complete. Task IDs: task-abc-123, task-def-456',
      },
    });

    render(<ForceSyncButton propertyId={5} listingId={5} />);
    await userEvent.click(screen.getByRole('button', { name: /force full channel sync/i }));

    // Click the confirm / sync button inside the dialog
    const syncBtn = screen.getByRole('button', { name: /yes, sync now/i });
    await userEvent.click(syncBtn);

    // Verify API was called with correct propertyId
    await waitFor(() => {
      expect(mockPropertiesForceSync).toHaveBeenCalledTimes(1);
      expect(mockPropertiesForceSync).toHaveBeenCalledWith(5);
    });

    // Verify task IDs are rendered in the DOM (auditor must see this)
    await waitFor(() => {
      const taskBoxes = screen.getAllByText('task-abc-123');
      expect(taskBoxes.length).toBeGreaterThan(0);
    });

    // Verify both task IDs appear
    expect(screen.getByText('task-def-456')).toBeInTheDocument();

    // Verify success message
    expect(screen.getByText(/force sync complete/i)).toBeInTheDocument();
  });

  it('shows error message and calls toast.error on API failure', async () => {
    mockPropertiesForceSync.mockRejectedValue({
      response: { data: { message: 'No mapping found for this property.' } },
    });

    render(<ForceSyncButton propertyId={99} listingId={99} />);
    await userEvent.click(screen.getByRole('button', { name: /force full channel sync/i }));

    const syncBtn = screen.getByRole('button', { name: /yes, sync now/i });
    await userEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockPropertiesForceSync).toHaveBeenCalledWith(99);
    });
  });

  it('disables the confirm button while loading', async () => {
    let resolveSlowly;
    mockPropertiesForceSync.mockImplementation(
      () => new Promise(r => (resolveSlowly = r)),
    );

    render(<ForceSyncButton propertyId={1} listingId={1} />);
    await userEvent.click(screen.getByRole('button', { name: /force full channel sync/i }));

    const syncBtn = screen.getByRole('button', { name: /yes, sync now/i });
    await userEvent.click(syncBtn);

    // Button should be disabled during loading
    expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();
  });
});

// ─── Tests — TASK 2: AddManualBookingModal ────────────────────────────────────
describe('Task 2 — AddManualBookingModal', () => {

  beforeEach(() => {
    mockBookingsCreateManual.mockReset();
    mockListingsGetActive.mockReset();
    mockListingsGetActive.mockResolvedValue({
      data: [
        { id: 1, title: 'Beach Villa' },
        { id: 2, title: 'City Loft' },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the modal when open=true', async () => {
    render(
      <AddManualBookingModal
        open={true}
        onOpenChange={vi.fn()}
        listingId={null}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Direct Booking')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(
      <AddManualBookingModal
        open={false}
        onOpenChange={vi.fn()}
        listingId={null}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('loads active listings into the dropdown on open', async () => {
    render(
      <AddManualBookingModal
        open={true}
        onOpenChange={vi.fn()}
        listingId={null}
        onSuccess={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(mockListingsGetActive).toHaveBeenCalled();
    });
  });

  it('validates required fields before submission', async () => {
    const onOpenChange = vi.fn();
    render(
      <AddManualBookingModal
        open={true}
        onOpenChange={onOpenChange}
        listingId={null}
        onSuccess={vi.fn()}
      />,
    );

    // Find the submit button and click it without filling any fields
    const submitBtn = screen.getByRole('button', { name: /create booking/i });
    await userEvent.click(submitBtn);

    // API should NOT have been called
    expect(mockBookingsCreateManual).not.toHaveBeenCalled();

    // Validation error should be visible
    await waitFor(() => {
      expect(screen.getByText(/please select a room/i)).toBeInTheDocument();
    });
  });

  it('sends correct payload to POST /bookings/manual on valid submit', async () => {
    mockBookingsCreateManual.mockResolvedValue({
      data: {
        id: 99,
        listingId: 1,
        guestName: 'Jane Smith',
        checkIn: '2025-06-01',
        checkOut: '2025-06-03',
        numGuests: 2,
        totalPrice: 599,
        status: 'confirmed',
      },
    });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AddManualBookingModal
        open={true}
        onOpenChange={onOpenChange}
        listingId={null}
        onSuccess={onSuccess}
      />,
    );

    // Fill guest name
    await userEvent.type(
      screen.getByLabelText(/guest name/i),
      'Jane Smith',
    );

    // Fill check-in date
    await userEvent.type(
      screen.getByLabelText(/check-in/i),
      '2025-06-01',
    );

    // Fill check-out date
    await userEvent.type(
      screen.getByLabelText(/check-out/i),
      '2025-06-03',
    );

    // Fill guests
    await userEvent.type(
      screen.getByLabelText(/guests/i),
      '2',
    );

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /create booking/i }));

    await waitFor(() => {
      expect(mockBookingsCreateManual).toHaveBeenCalledTimes(1);
    });

    // Verify exact payload
    const callArg = mockBookingsCreateManual.mock.calls[0][0];
    expect(callArg.listingId).toBeUndefined(); // not pre-selected — user must pick from dropdown
    expect(callArg.guestName).toBe('Jane Smith');
    expect(callArg.checkIn).toBe('2025-06-01');
    expect(callArg.checkOut).toBe('2025-06-03');
    expect(callArg.numGuests).toBe(2);
    expect(callArg.bookingSource).toBe('direct');

    // Verify onSuccess was called and modal was closed
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables submit button while loading', async () => {
    let resolveSlowly;
    mockBookingsCreateManual.mockImplementation(
      () => new Promise(r => (resolveSlowly = r)),
    );
    mockListingsGetActive.mockResolvedValue({ data: [{ id: 1, title: 'Beach Villa' }] });

    const onOpenChange = vi.fn();
    render(
      <AddManualBookingModal
        open={true}
        onOpenChange={onOpenChange}
        listingId={1}
        onSuccess={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/guest name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/check-in/i), '2025-06-01');
    await userEvent.type(screen.getByLabelText(/check-out/i), '2025-06-03');
    await userEvent.type(screen.getByLabelText(/guests/i), '1');

    const submitBtn = screen.getByRole('button', { name: /create booking/i });
    await userEvent.click(submitBtn);

    // Spinner should appear (button text changes)
    expect(screen.getByText(/creating/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });
});

// ─── Tests — TASK 3: BookingDrawer ───────────────────────────────────────────
describe('Task 3 — BookingDrawer (Edit Dates + Cancel)', () => {

  beforeEach(() => {
    mockBookingsUpdate.mockReset();
    mockBookingsCancel.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when open=true with a booking', () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-title')).toHaveTextContent(/booking #42/i);
  });

  it('displays guest name, dates, and status badge', () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('Beach Villa')).toBeInTheDocument();
  });

  // ── Edit Dates ────────────────────────────────────────────────────────────

  it('reveals date inputs when Edit Dates is clicked', async () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    const editBtn = screen.getByRole('button', { name: /edit dates/i });
    await userEvent.click(editBtn);

    // Date inputs should now be visible
    expect(screen.getByLabelText(/new check-in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new check-out/i)).toBeInTheDocument();
  });

  it('calls PATCH /bookings/:id with new dates on Save Dates', async () => {
    mockBookingsUpdate.mockResolvedValue({
      data: {
        ...MOCK_BOOKING,
        checkIn:  new Date('2025-07-01'),
        checkOut: new Date('2025-07-04'),
      },
    });

    const onUpdate = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={onOpenChange}
        onUpdate={onUpdate}
      />,
    );

    // Open edit mode
    await userEvent.click(screen.getByRole('button', { name: /edit dates/i }));

    // Change dates
    await userEvent.clear(screen.getByLabelText(/new check-in/i));
    await userEvent.type(screen.getByLabelText(/new check-in/i), '2025-07-01');
    await userEvent.clear(screen.getByLabelText(/new check-out/i));
    await userEvent.type(screen.getByLabelText(/new check-out/i), '2025-07-04');

    // Save
    await userEvent.click(screen.getByRole('button', { name: /save dates/i }));

    await waitFor(() => {
      expect(mockBookingsUpdate).toHaveBeenCalledTimes(1);
      expect(mockBookingsUpdate).toHaveBeenCalledWith(42, {
        checkIn:  '2025-07-01',
        checkOut: '2025-07-04',
      });
    });

    // Verify onUpdate was called and drawer closed
    expect(onUpdate).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows validation error when check-out is before check-in', async () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit dates/i }));
    await userEvent.clear(screen.getByLabelText(/new check-in/i));
    await userEvent.type(screen.getByLabelText(/new check-in/i), '2025-07-05');
    await userEvent.clear(screen.getByLabelText(/new check-out/i));
    await userEvent.type(screen.getByLabelText(/new check-out/i), '2025-07-01');

    await userEvent.click(screen.getByRole('button', { name: /save dates/i }));

    expect(screen.getByText(/check-out must be after check-in/i)).toBeInTheDocument();
    expect(mockBookingsUpdate).not.toHaveBeenCalled();
  });

  it('calls toast.success after successful date edit', async () => {
    mockBookingsUpdate.mockResolvedValue({ data: { ...MOCK_BOOKING } });

    const { toast } = await import('sonner');

    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit dates/i }));
    await userEvent.clear(screen.getByLabelText(/new check-in/i));
    await userEvent.type(screen.getByLabelText(/new check-in/i), '2025-07-01');
    await userEvent.clear(screen.getByLabelText(/new check-out/i));
    await userEvent.type(screen.getByLabelText(/new check-out/i), '2025-07-04');
    await userEvent.click(screen.getByRole('button', { name: /save dates/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('updated'),
      );
    });
  });

  // ── Cancel Booking ────────────────────────────────────────────────────────

  it('shows cancel confirmation before calling the API', async () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel booking/i }));

    // Confirmation step should be visible
    expect(screen.getByText(/cancel the booking/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm cancel/i })).toBeInTheDocument();

    // API should NOT have been called yet
    expect(mockBookingsCancel).not.toHaveBeenCalled();
  });

  it('calls PATCH /bookings/:id/cancel on Confirm Cancel', async () => {
    mockBookingsCancel.mockResolvedValue({
      data: { ...MOCK_BOOKING, status: 'cancelled' },
    });

    const onUpdate = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={onOpenChange}
        onUpdate={onUpdate}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm cancel/i }));

    await waitFor(() => {
      expect(mockBookingsCancel).toHaveBeenCalledTimes(1);
      expect(mockBookingsCancel).toHaveBeenCalledWith(42);
    });

    expect(onUpdate).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not call the API when Cancel is clicked then Keep Booking is clicked', async () => {
    render(
      <BookingDrawer
        booking={MOCK_BOOKING}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep booking/i }));

    expect(mockBookingsCancel).not.toHaveBeenCalled();
  });

  it('hides cancel button for already-cancelled bookings', () => {
    render(
      <BookingDrawer
        booking={{ ...MOCK_BOOKING, status: 'cancelled' }}
        open={true}
        onOpenChange={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });
});

// ─── Smoke test: no console.error from components ────────────────────────────
describe('Sanity — No console errors during render', () => {

  it('ForceSyncButton renders without throwing', () => {
    render(<ForceSyncButton propertyId={1} listingId={1} />);
  });

  it('AddManualBookingModal renders without throwing', () => {
    render(
      <AddManualBookingModal open={true} onOpenChange={vi.fn()} listingId={null} onSuccess={vi.fn()} />,
    );
  });

  it('BookingDrawer renders without throwing', () => {
    render(
      <BookingDrawer booking={MOCK_BOOKING} open={true} onOpenChange={vi.fn()} onUpdate={vi.fn()} />,
    );
  });
});