'use client';

import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { useApiCreds } from '@/components/providers/ApiCredentialsProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  OrdersApi,
  buildOrderMessage,
  buildL2Headers,
  generateNonce,
} from '@hexmarket/sdk';
import type { PlaceOrderParams, Side, OrderType, TimeInForce } from '@hexmarket/sdk';
import * as bs58 from 'bs58';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface PlaceOrderInput {
  outcomeId: string;
  side: Side;
  priceCents: number; // price in cents (may be fractional for sub-cent increments)
  quantity: number; // integer shares
  orderType?: OrderType;   // default 'limit'
  timeInForce?: TimeInForce; // default 'gtc'
}

const ordersApi = new OrdersApi(API_URL);

export function usePlaceOrder() {
  const { publicKeyBase58, signMessage } = useUnifiedWallet();
  const { credentials } = useApiCreds();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      if (!publicKeyBase58 || !signMessage || !credentials) {
        throw new Error('Wallet not connected or API credentials not ready');
      }

      const nonce = generateNonce();
      const price = input.priceCents / 100; // cents → decimal (0.01-0.99)

      const unsignedParams = {
        outcomeId: input.outcomeId,
        side: input.side as Side,
        orderType: input.orderType ?? 'limit',
        timeInForce: input.timeInForce ?? 'gtc',
        price,
        quantity: input.quantity,
        nonce,
      };

      // Sign order with wallet (required for on-chain settlement)
      const messageBytes = buildOrderMessage(unsignedParams);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Build L2 auth headers (body not included in HMAC — server uses path-only verification)
      const l2Headers = await buildL2Headers(
        credentials, publicKeyBase58, 'POST', '/api/v1/orders',
      );
      ordersApi.setL2Headers(l2Headers);

      const params: PlaceOrderParams = {
        ...unsignedParams,
        signature,
      };

      return ordersApi.place(params);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['openOrders', input.outcomeId] });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
    },
  });
}
