---
"@x402/extensions": minor
---

feat(extensions): add bazaar discovery refresh and validation capabilities

Adds forceRefresh() and validateMetadata() methods to the bazaar client extension:

- forceRefresh(): Triggers immediate metadata refresh for stale discovery resources
- validateMetadata(): Validates resource metadata freshness with optional live endpoint verification
- Comprehensive test coverage for new functionality
- Resolves issue #1659 where discovery metadata becomes stale after seller route updates

This enables detection and remediation of stale discovery metadata that can occur when sellers redeploy with updated routes or descriptions, ensuring the bazaar discovery index stays current with live service endpoints.