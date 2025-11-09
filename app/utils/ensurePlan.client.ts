// app/utils/ensurePlan.client.ts
// DO NOT import server code here. Only helpers that the client might need.

export function assertClientOnly() {
  // This exists solely to prevent accidental server imports on the client.
  return true;
}

