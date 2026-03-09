import { HttpAgent } from "@icp-sdk/core/agent";
import { useEffect, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

/**
 * Returns a StorageClient instance wired to the authenticated user's identity.
 * The client is re-created whenever the identity changes.
 */
export function useStorageClient(): StorageClient | null {
  const { identity } = useInternetIdentity();
  const [storageClient, setStorageClient] = useState<StorageClient | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const config = await loadConfig();

        const agentOptions = identity ? { identity } : {};
        const agent = new HttpAgent({
          ...agentOptions,
          ...(config.backend_host ? { host: config.backend_host } : {}),
        });

        // Fetch root key in local/dev environments
        if (
          config.backend_host?.includes("localhost") ||
          config.backend_host?.includes("127.0.0.1")
        ) {
          await agent.fetchRootKey().catch(console.error);
        }

        const client = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent,
        );

        if (!cancelled) {
          setStorageClient(client);
        }
      } catch (err) {
        console.error("Failed to initialize StorageClient:", err);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  return storageClient;
}
