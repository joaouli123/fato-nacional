import configPromise from "@payload-config";
import { getPayload } from "payload";

export async function authenticatePayload(requestHeaders: Headers) {
  const payload = await getPayload({ config: configPromise });
  return payload.auth({ headers: requestHeaders });
}
