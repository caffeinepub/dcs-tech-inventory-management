# Specification

## Summary
**Goal:** Add a CSV bulk import feature to the Admin Panel that allows admins to upload a CSV file to create or update inventory items in bulk.

**Planned changes:**
- Add a `bulkImportInventory` backend function that accepts an array of inventory records, creating new items or updating existing ones by `partNumber`, and returns a summary of created, updated, and skipped counts with reasons
- Add a CSV Import section to the AdminPanel page (visible to admin users only) with a file input accepting `.csv` files and an Import button
- Parse and validate the CSV client-side (required headers: `partNumber`, `partName`, `description`, `quantity`, `stockThreshold`, `category`, `location`); skip invalid rows without stopping the import
- Show a loading indicator during import and display a results summary (created, updated, skipped counts with per-row skip reasons) after completion
- Show an error message if the uploaded file is not a valid CSV or has incorrect headers

**User-visible outcome:** Admins can upload a CSV file on the Admin Panel to bulk-create or bulk-update inventory items, then see a detailed summary of what was imported, updated, or skipped.
