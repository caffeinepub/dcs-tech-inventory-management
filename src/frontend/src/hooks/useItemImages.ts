import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "./useActor";
import { useStorageClient } from "./useStorageClient";

/**
 * Hook for reading and uploading inventory item images via blob storage.
 * Images are stored in the Caffeine blob-storage service and the hash is
 * persisted on the InventoryItem record so they are shared across all users
 * and devices.
 *
 * @param itemId         - The inventory item's bigint ID
 * @param existingBlobId - The blobId/hash already stored on the item record (optional)
 */
export function useItemImage(itemId: bigint | string, existingBlobId?: string) {
  const { actor } = useActor();
  const storageClient = useStorageClient();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Resolve the image URL whenever the blobId or storage client changes
  useEffect(() => {
    if (!existingBlobId || !storageClient) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    storageClient
      .getDirectURL(existingBlobId)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [existingBlobId, storageClient]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!actor) {
        toast.error("Not authenticated");
        return;
      }
      if (!storageClient) {
        toast.error("Storage not ready");
        return;
      }

      setIsUploading(true);
      try {
        // Read file bytes
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Upload to blob storage
        const { hash } = await storageClient.putFile(bytes);

        // Save the hash on the inventory item record
        const id = typeof itemId === "bigint" ? itemId : BigInt(String(itemId));
        await actor.setInventoryItemImage(id, hash);

        // Invalidate inventory cache so the updated blobId is fetched
        queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });

        toast.success("Image uploaded successfully");
      } catch (err) {
        console.error("Image upload failed:", err);
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [actor, storageClient, itemId, queryClient],
  );

  return { imageUrl, uploadImage, isUploading };
}

// Backward-compat stubs — these are no longer used but prevent
// import errors if any other file still references the old API.
export function getItemImage(_itemId: bigint | string): string | null {
  return null;
}

export function setItemImage(
  _itemId: bigint | string,
  _dataUrl: string,
): void {}

export function removeItemImage(_itemId: bigint | string): void {}
