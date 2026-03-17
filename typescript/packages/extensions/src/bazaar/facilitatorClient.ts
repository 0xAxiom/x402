/**
 * Client extensions for querying Bazaar discovery resources
 */

import { HTTPFacilitatorClient } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import { WithExtensions } from "../types";

/**
 * Parameters for listing discovery resources.
 * All parameters are optional and used for filtering/pagination.
 */
export interface ListDiscoveryResourcesParams {
  /**
   * Filter by protocol type (e.g., "http", "mcp").
   */
  type?: string;

  /**
   * The number of discovered x402 resources to return per page.
   */
  limit?: number;

  /**
   * The offset of the first discovered x402 resource to return.
   */
  offset?: number;
}

/**
 * A discovered x402 resource from the bazaar.
 */
export interface DiscoveryResource {
  /** The URL or identifier of the discovered resource */
  resource: string;
  /** The protocol type of the resource (e.g., "http") */
  type: string;
  /** The x402 protocol version supported by this resource */
  x402Version: number;
  /** Array of accepted payment methods for this resource */
  accepts: PaymentRequirements[];
  /** ISO 8601 timestamp of when the resource was last updated */
  lastUpdated: string;
  /** Additional metadata about the resource */
  metadata?: Record<string, unknown>;
}

/**
 * Response from listing discovery resources.
 */
export interface DiscoveryResourcesResponse {
  /** The x402 protocol version of this response */
  x402Version: number;
  /** The list of discovered resources */
  items: DiscoveryResource[];
  /** Pagination information for the response */
  pagination: {
    /** Maximum number of results returned */
    limit: number;
    /** Number of results skipped */
    offset: number;
    /** Total count of resources matching the query */
    total: number;
  };
}

/**
 * Parameters for forcing a resource refresh.
 */
export interface ForceRefreshParams {
  /** The resource URL to refresh */
  resource: string;
  /** Whether to verify the resource responds correctly after refresh */
  verifyAfterRefresh?: boolean;
  /** Maximum time to wait for refresh completion in seconds */
  timeoutSeconds?: number;
}

/**
 * Response from forcing a resource refresh.
 */
export interface RefreshResponse {
  /** Whether the refresh was successful */
  success: boolean;
  /** The updated resource information */
  resource?: DiscoveryResource;
  /** Error message if refresh failed */
  error?: string;
  /** ISO 8601 timestamp of when the refresh was requested */
  refreshedAt: string;
}

/**
 * Parameters for validating resource metadata freshness.
 */
export interface ValidateMetadataParams {
  /** The resource URL to validate */
  resource: string;
  /** Expected minimum last updated time (ISO 8601) */
  expectedMinLastUpdated?: string;
  /** Whether to include live endpoint verification */
  includeLiveCheck?: boolean;
}

/**
 * Response from validating resource metadata.
 */
export interface MetadataValidationResponse {
  /** Whether the metadata is considered fresh/valid */
  isValid: boolean;
  /** Current metadata from discovery */
  currentMetadata?: DiscoveryResource;
  /** Live endpoint verification result if requested */
  liveEndpointStatus?: {
    /** Whether the endpoint responded correctly */
    responding: boolean;
    /** HTTP status code from live check */
    statusCode?: number;
    /** Whether the endpoint advertises x402 requirements */
    hasX402Requirements?: boolean;
  };
  /** Issues found with the metadata */
  issues?: string[];
  /** ISO 8601 timestamp of when validation was performed */
  validatedAt: string;
}

/**
 * Bazaar client extension interface providing discovery query functionality.
 */
export interface BazaarClientExtension {
  discovery: {
    /**
     * List x402 discovery resources from the bazaar.
     *
     * @param params - Optional filtering and pagination parameters
     * @returns A promise resolving to the discovery resources response
     */
    listResources(params?: ListDiscoveryResourcesParams): Promise<DiscoveryResourcesResponse>;

    /**
     * Force refresh a specific resource's metadata in the discovery index.
     * This triggers the discovery system to re-fetch and re-index the resource.
     *
     * @param params - Parameters for the refresh operation
     * @returns A promise resolving to the refresh response
     */
    forceRefresh(params: ForceRefreshParams): Promise<RefreshResponse>;

    /**
     * Validate if a resource's metadata is fresh and accurate.
     * Optionally includes live endpoint verification to detect routing changes.
     *
     * @param params - Parameters for metadata validation
     * @returns A promise resolving to the validation response
     */
    validateMetadata(params: ValidateMetadataParams): Promise<MetadataValidationResponse>;
  };
}

/**
 * Extends a facilitator client with Bazaar discovery query functionality.
 * Preserves and merges with any existing extensions from prior chaining.
 *
 * @param client - The facilitator client to extend
 * @returns The client extended with bazaar discovery capabilities
 *
 * @example
 * ```ts
 * // Basic usage
 * const client = withBazaar(new HTTPFacilitatorClient());
 * const resources = await client.extensions.discovery.listResources({ type: "http" });
 *
 * // Chaining with other extensions
 * const client = withBazaar(withOtherExtension(new HTTPFacilitatorClient()));
 * await client.extensions.other.someMethod();
 * await client.extensions.discovery.listResources();
 * ```
 */
export function withBazaar<T extends HTTPFacilitatorClient>(
  client: T,
): WithExtensions<T, BazaarClientExtension> {
  // Preserve any existing extensions from prior chaining
  const existingExtensions =
    (client as T & { extensions?: Record<string, unknown> }).extensions ?? {};

  const extended = client as WithExtensions<T, BazaarClientExtension>;

  extended.extensions = {
    ...existingExtensions,
    discovery: {
      async listResources(
        params?: ListDiscoveryResourcesParams,
      ): Promise<DiscoveryResourcesResponse> {
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const authHeaders = await client.createAuthHeaders("discovery");
        headers = { ...headers, ...authHeaders.headers };

        const queryParams = new URLSearchParams();
        if (params?.type !== undefined) {
          queryParams.set("type", params.type);
        }
        if (params?.limit !== undefined) {
          queryParams.set("limit", params.limit.toString());
        }
        if (params?.offset !== undefined) {
          queryParams.set("offset", params.offset.toString());
        }

        const queryString = queryParams.toString();
        const endpoint = `${client.url}/discovery/resources${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(endpoint, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(
            `Facilitator listDiscoveryResources failed (${response.status}): ${errorText}`,
          );
        }

        return (await response.json()) as DiscoveryResourcesResponse;
      },

      async forceRefresh(params: ForceRefreshParams): Promise<RefreshResponse> {
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const authHeaders = await client.createAuthHeaders("discovery");
        headers = { ...headers, ...authHeaders.headers };

        const endpoint = `${client.url}/discovery/refresh`;
        const body = {
          resource: params.resource,
          verifyAfterRefresh: params.verifyAfterRefresh ?? false,
          timeoutSeconds: params.timeoutSeconds ?? 30,
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Facilitator forceRefresh failed (${response.status}): ${errorText}`);
        }

        return (await response.json()) as RefreshResponse;
      },

      async validateMetadata(params: ValidateMetadataParams): Promise<MetadataValidationResponse> {
        const refreshedAt = new Date().toISOString();
        const issues: string[] = [];

        try {
          // First, get the current metadata from discovery
          const discoveryResult = await extended.extensions.discovery.listResources({
            limit: 100,
          });

          const currentResource = discoveryResult.items.find(
            item => item.resource === params.resource,
          );

          if (!currentResource) {
            return {
              isValid: false,
              issues: [`Resource ${params.resource} not found in discovery index`],
              validatedAt: refreshedAt,
            };
          }

          // Check if lastUpdated is recent enough
          if (params.expectedMinLastUpdated) {
            const expectedMin = new Date(params.expectedMinLastUpdated);
            const lastUpdated = new Date(currentResource.lastUpdated);

            if (lastUpdated < expectedMin) {
              issues.push(
                `Resource last updated ${currentResource.lastUpdated} is older than expected minimum ${params.expectedMinLastUpdated}`,
              );
            }
          }

          // Check if lastUpdated is suspiciously old (more than 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const lastUpdated = new Date(currentResource.lastUpdated);
          if (lastUpdated < oneDayAgo) {
            issues.push(
              `Resource last updated ${currentResource.lastUpdated} is more than 24 hours old, may be stale`,
            );
          }

          let liveEndpointStatus;

          // Optionally verify the live endpoint
          if (params.includeLiveCheck) {
            try {
              const liveResponse = await fetch(params.resource, {
                method: "HEAD", // Use HEAD to avoid triggering payment
                headers: {
                  "User-Agent": "x402-discovery-validator/1.0",
                },
              });

              const hasX402Requirements =
                liveResponse.status === 402 ||
                liveResponse.headers.has("www-authenticate") ||
                liveResponse.headers.has("x-payment-required");

              liveEndpointStatus = {
                responding: liveResponse.ok || liveResponse.status === 402,
                statusCode: liveResponse.status,
                hasX402Requirements,
              };

              if (!liveEndpointStatus.responding) {
                issues.push(`Live endpoint check failed with status ${liveResponse.status}`);
              }

              if (!hasX402Requirements && liveResponse.ok) {
                issues.push(
                  "Live endpoint appears to be free (no x402 payment requirements detected)",
                );
              }
            } catch (error) {
              issues.push(
                `Live endpoint check failed: ${error instanceof Error ? error.message : String(error)}`,
              );
              liveEndpointStatus = {
                responding: false,
                hasX402Requirements: false,
              };
            }
          }

          const isValid = issues.length === 0;

          return {
            isValid,
            currentMetadata: currentResource,
            liveEndpointStatus,
            issues: issues.length > 0 ? issues : undefined,
            validatedAt: refreshedAt,
          };
        } catch (error) {
          return {
            isValid: false,
            issues: [
              `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
            validatedAt: refreshedAt,
          };
        }
      },
    },
  } as WithExtensions<T, BazaarClientExtension>["extensions"];

  return extended;
}
