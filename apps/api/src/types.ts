export type ToEngine =
  | { type: "ONRAMP"; userId: number; amount: number; txnId: string }
  | { type: "ORDER"; userId: number; marketId: number; side: string; orderType: string; price: number | null; qty: number; orderId: number };

export type FromEngine =
  | { type: "ONRAMP_DONE"; userId: number; newBalance: number }
  | { type: "ORDER_RESULT"; orderId: number; status: string; filledQty: number; fills: { price: number; qty: number; makerOrderId: number }[] }
  | { type: "ERROR"; ref: string; message: string };
