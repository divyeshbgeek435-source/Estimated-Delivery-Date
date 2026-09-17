import { isRouteErrorResponse } from "react-router";

const RECOVERABLE_MESSAGE =
  /failed to fetch|networkerror|load failed|cannot read properties of null \(reading 'use(context|state|ref|memo|callback|effect|layout)'\)|invalid hook call|unable to decode turbo-stream/i;

/** Network / HMR crashes that a reload usually clears. Auth and 4xx responses stay as-is. */
export function isRecoverableClientError(error) {
  if (!error || isRouteErrorResponse(error) || error instanceof Response) return false;
  const message = String(error?.message || error || "");
  return RECOVERABLE_MESSAGE.test(message);
}
