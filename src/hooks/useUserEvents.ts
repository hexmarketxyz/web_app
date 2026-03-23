'use client';

// This module previously polled user-specific queries on an interval.
// Polling has been removed — data is now refreshed on-demand via
// invalidateQueries in usePlaceOrder and useCancelOrder hooks.
//
// Kept as a no-op export so existing call sites don't break.
export function useUserEvents() {}
