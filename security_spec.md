# ADS93 Firestore Security Specification

## 1. Data Invariants
- `links`: Must have valid slug `^[a-zA-Z0-9_-]+$`, valid non-empty `destinationUrl`, non-negative `totalClicks` and `uniqueClicks`.
- `images`: Must have valid slug `^[a-zA-Z0-9_-]+$`, non-empty `imageUrl`, non-negative `viewsCount`.
- `click_logs`: Must contain valid `linkSlug`, ISO `timestamp`, `source`, `device`, and `isUnique` boolean.

## 2. Dirty Dozen Threat Payloads
1. Injecting oversized slug (>128 chars) into `links`.
2. Setting negative click counters (e.g. `totalClicks: -999`).
3. Modifying immutable field `createdAt` during link update.
4. Injecting script tag `<script>` or oversized strings into `destinationUrl`.
5. Forging click logs with fake non-boolean `isUnique`.
6. Creating links with missing `destinationUrl`.
7. Creating banner images with non-conforming slug pattern (`banner!@#$`).
8. Spoofing oversized IP address strings (>100 chars).
9. Attempting unauthorized batch wipe of `click_logs`.
10. Attempting to inject extra unexpected fields outside schema into `links`.
11. Injecting 2MB payload into `notes`.
12. Updating `viewsCount` with arbitrary string instead of integer.

## 3. Access Model
- Public Read: Short links and banner image URLs must be readable for fast redirection and embedding.
- Read/Write: Dashboard operators can manage links and banners, and click events can be recorded upon redirect.
