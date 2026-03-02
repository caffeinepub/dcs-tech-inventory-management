# Specification

## Summary
**Goal:** Automatically promote the very first registered user to admin, bypassing the normal pending approval workflow for the bootstrap case.

**Planned changes:**
- In the backend `registerOrLogin()` function, check if any users exist in the system before creating a new user record
- If no users exist, create the new user with `role = #admin` and `status = #approved` instead of the default `role = #guest` and `status = #pending`
- If at least one user already exists, keep the existing behavior (role = #guest, status = #pending)

**User-visible outcome:** The first user to register on the platform is immediately granted admin access without requiring approval, allowing them to manage and approve subsequent users who still go through the normal pending workflow.
