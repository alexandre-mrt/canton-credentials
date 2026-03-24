import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CredentialClient,
	getDemoCredentials,
	getDemoIssuers,
	safeParseClaims,
} from "@/lib/credential-client";
import type { VerifiableCredential } from "@/types/credentials";

// ---------- safeParseClaims ----------

describe("safeParseClaims", () => {
	it("parses valid JSON string into an object", () => {
		const result = safeParseClaims('{"name":"Alice","age":30}');
		expect(result).toEqual({ name: "Alice", age: 30 });
	});

	it("returns { _raw } wrapper for invalid JSON", () => {
		const result = safeParseClaims("not json");
		expect(result).toEqual({ _raw: "not json" });
	});

	it("handles empty JSON object", () => {
		expect(safeParseClaims("{}")).toEqual({});
	});

	it("handles nested JSON", () => {
		const nested = '{"a":{"b":1}}';
		expect(safeParseClaims(nested)).toEqual({ a: { b: 1 } });
	});
});

// ---------- getDemoCredentials ----------

describe("getDemoCredentials", () => {
	const credentials = getDemoCredentials();

	it("returns exactly 4 credentials", () => {
		expect(credentials).toHaveLength(4);
	});

	it("contains both valid and revoked credentials", () => {
		const revoked = credentials.filter((c) => c.revoked);
		const active = credentials.filter((c) => !c.revoked);
		expect(revoked.length).toBeGreaterThan(0);
		expect(active.length).toBeGreaterThan(0);
	});

	it("every credential has non-empty claims", () => {
		for (const cred of credentials) {
			expect(Object.keys(cred.claims).length).toBeGreaterThan(0);
		}
	});

	it("revoked credential has a revocation reason", () => {
		const revoked = credentials.find((c) => c.revoked);
		expect(revoked).toBeDefined();
		expect(revoked!.revocationReason).toBeTruthy();
	});

	it("all credentials have required fields", () => {
		for (const cred of credentials) {
			expect(cred.contractId).toBeTruthy();
			expect(cred.issuer).toBeTruthy();
			expect(cred.subject).toBeTruthy();
			expect(cred.credentialType).toBeTruthy();
			expect(cred.issuedAt).toBeTruthy();
			expect(cred.expiresAt).toBeTruthy();
		}
	});

	it("includes multiple credential types", () => {
		const types = new Set(credentials.map((c) => c.credentialType));
		expect(types.size).toBeGreaterThanOrEqual(2);
	});
});

// ---------- getDemoIssuers ----------

describe("getDemoIssuers", () => {
	const issuers = getDemoIssuers();

	it("returns exactly 3 issuers", () => {
		expect(issuers).toHaveLength(3);
	});

	it("all issuers are active", () => {
		for (const issuer of issuers) {
			expect(issuer.active).toBe(true);
		}
	});

	it("all issuers have required fields", () => {
		for (const issuer of issuers) {
			expect(issuer.contractId).toBeTruthy();
			expect(issuer.issuer).toBeTruthy();
			expect(issuer.name).toBeTruthy();
			expect(issuer.jurisdiction).toBeTruthy();
			expect(issuer.issuerType).toBeTruthy();
		}
	});

	it("issuers cover different types", () => {
		const types = new Set(issuers.map((i) => i.issuerType));
		expect(types.size).toBe(3);
	});
});

// ---------- CredentialClient ----------

describe("CredentialClient", () => {
	const mockConfig = {
		baseUrl: "https://canton.example.com",
		token: "test-token",
		party: "test-party",
	};

	let client: CredentialClient;

	beforeEach(() => {
		client = new CredentialClient(mockConfig);
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function mockFetchResponse(data: unknown, ok = true, status = 200) {
		const response = {
			ok,
			status,
			json: () => Promise.resolve(data),
		};
		vi.mocked(fetch).mockResolvedValueOnce(response as Response);
	}

	describe("getCredentials", () => {
		const apiPayload = {
			result: [
				{
					contractId: "cid-1",
					payload: {
						issuer: "Issuer-A",
						subject: "alice",
						credentialType: "KYC",
						claims: '{"name":"Alice"}',
						issuedAt: "2026-01-01T00:00:00Z",
						expiresAt: "2027-01-01T00:00:00Z",
						revoked: false,
						revocationReason: "",
					},
				},
			],
		};

		it("returns mapped credentials", async () => {
			mockFetchResponse(apiPayload);

			const creds = await client.getCredentials();

			expect(creds).toHaveLength(1);
			expect(creds[0].contractId).toBe("cid-1");
			expect(creds[0].claims).toEqual({ name: "Alice" });
			expect(creds[0].credentialType).toBe("KYC");
		});

		it("passes subject filter when provided", async () => {
			mockFetchResponse(apiPayload);

			await client.getCredentials("alice");

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.query).toEqual({ subject: "alice" });
		});

		it("sends empty query when no subject filter", async () => {
			mockFetchResponse(apiPayload);

			await client.getCredentials();

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.query).toEqual({});
		});

		it("uses correct auth header", async () => {
			mockFetchResponse(apiPayload);

			await client.getCredentials();

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const headers = fetchCall[1]!.headers as Record<string, string>;
			expect(headers.Authorization).toBe("Bearer test-token");
		});

		it("handles invalid JSON in claims gracefully", async () => {
			mockFetchResponse({
				result: [
					{
						contractId: "cid-2",
						payload: {
							issuer: "X",
							subject: "bob",
							credentialType: "KYC",
							claims: "broken json {",
							issuedAt: "2026-01-01T00:00:00Z",
							expiresAt: "2027-01-01T00:00:00Z",
							revoked: false,
							revocationReason: "",
						},
					},
				],
			});

			const creds = await client.getCredentials();
			expect(creds[0].claims).toEqual({ _raw: "broken json {" });
		});
	});

	describe("verifyCredential", () => {
		it("returns exercise result", async () => {
			mockFetchResponse({ exerciseResult: "verified-ok" });

			const result = await client.verifyCredential("cid-1");

			expect(result).toBe("verified-ok");
		});

		it("sends correct choice and argument", async () => {
			mockFetchResponse({ exerciseResult: "ok" });

			await client.verifyCredential("cid-1");

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.choice).toBe("VerifyCredential");
			expect(body.argument.verifier).toBe("test-party");
			expect(body.contractId).toBe("cid-1");
		});
	});

	describe("registerIssuer", () => {
		it("returns contract ID", async () => {
			mockFetchResponse({ contractId: "issuer-cid-1" });

			const result = await client.registerIssuer({
				name: "Test Issuer",
				jurisdiction: "CH",
				issuerType: "KYC",
			});

			expect(result).toBe("issuer-cid-1");
		});
	});

	describe("revokeCredential", () => {
		it("sends revoke request with reason", async () => {
			mockFetchResponse({});

			await client.revokeCredential("cid-1", "Expired documents");

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.choice).toBe("RevokeCredential");
			expect(body.argument.reason).toBe("Expired documents");
		});
	});

	describe("issueCredential", () => {
		it("returns exercise result", async () => {
			mockFetchResponse({ exerciseResult: "cred-cid-1" });

			const result = await client.issueCredential("issuer-cid-1", {
				subject: "alice",
				credentialType: "KYC",
				claims: { name: "Alice", country: "CH" },
				expiresAt: "2027-01-01T00:00:00Z",
			});

			expect(result).toBe("cred-cid-1");
		});

		it("sends correct template, choice, and serialized claims", async () => {
			mockFetchResponse({ exerciseResult: "cred-cid-1" });

			await client.issueCredential("issuer-cid-1", {
				subject: "alice",
				credentialType: "KYC",
				claims: { name: "Alice" },
				expiresAt: "2027-01-01T00:00:00Z",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.templateId).toBe("Credentials:CredentialIssuer");
			expect(body.contractId).toBe("issuer-cid-1");
			expect(body.choice).toBe("IssueCredential");
			expect(body.argument.subject).toBe("alice");
			expect(body.argument.credentialType).toBe("KYC");
			expect(body.argument.claims).toBe('{"name":"Alice"}');
			expect(body.argument.expiresAt).toBe("2027-01-01T00:00:00Z");
		});
	});

	describe("createComplianceGate", () => {
		it("returns contract ID", async () => {
			mockFetchResponse({ contractId: "gate-cid-1" });

			const result = await client.createComplianceGate({
				gateName: "DeFi Access",
				requiredCredentialTypes: ["KYC", "AML_CLEARED"],
				description: "Requires KYC and AML clearance",
			});

			expect(result).toBe("gate-cid-1");
		});

		it("sends correct payload with operator from config", async () => {
			mockFetchResponse({ contractId: "gate-cid-1" });

			await client.createComplianceGate({
				gateName: "DeFi Access",
				requiredCredentialTypes: ["KYC"],
				description: "Test gate",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.templateId).toBe("Credentials:ComplianceGate");
			expect(body.payload.operator).toBe("test-party");
			expect(body.payload.gateName).toBe("DeFi Access");
			expect(body.payload.requiredCredentialTypes).toEqual(["KYC"]);
		});
	});

	describe("checkCompliance", () => {
		it("returns true when compliant", async () => {
			mockFetchResponse({ exerciseResult: true });

			const result = await client.checkCompliance(
				"gate-cid-1",
				"alice",
				["cred-1", "cred-2"],
			);

			expect(result).toBe(true);
		});

		it("returns false when not compliant", async () => {
			mockFetchResponse({ exerciseResult: false });

			const result = await client.checkCompliance(
				"gate-cid-1",
				"bob",
				["cred-1"],
			);

			expect(result).toBe(false);
		});

		it("sends correct choice and arguments", async () => {
			mockFetchResponse({ exerciseResult: true });

			await client.checkCompliance("gate-cid-1", "alice", ["c1", "c2"]);

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.templateId).toBe("Credentials:ComplianceGate");
			expect(body.contractId).toBe("gate-cid-1");
			expect(body.choice).toBe("CheckCompliance");
			expect(body.argument.subject).toBe("alice");
			expect(body.argument.credentialCids).toEqual(["c1", "c2"]);
		});
	});

	describe("requestPresentation", () => {
		it("returns contract ID", async () => {
			mockFetchResponse({ contractId: "pres-cid-1" });

			const result = await client.requestPresentation({
				subject: "alice",
				requiredCredentials: ["KYC", "AML_CLEARED"],
				purpose: "DeFi onboarding",
				expiresAt: "2026-04-01T00:00:00Z",
			});

			expect(result).toBe("pres-cid-1");
		});

		it("sends correct payload with verifier from config", async () => {
			mockFetchResponse({ contractId: "pres-cid-1" });

			await client.requestPresentation({
				subject: "bob",
				requiredCredentials: ["KYC"],
				purpose: "Identity check",
				expiresAt: "2026-04-01T00:00:00Z",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.templateId).toBe("Credentials:PresentationRequest");
			expect(body.payload.verifier).toBe("test-party");
			expect(body.payload.subject).toBe("bob");
			expect(body.payload.requiredCredentials).toEqual(["KYC"]);
			expect(body.payload.purpose).toBe("Identity check");
			expect(body.payload.expiresAt).toBe("2026-04-01T00:00:00Z");
		});
	});

	describe("registerIssuer (payload)", () => {
		it("sends correct template and payload", async () => {
			mockFetchResponse({ contractId: "issuer-cid-1" });

			await client.registerIssuer({
				name: "Test Issuer",
				jurisdiction: "CH",
				issuerType: "KYC",
			});

			const fetchCall = vi.mocked(fetch).mock.calls[0];
			const body = JSON.parse(fetchCall[1]!.body as string);
			expect(body.templateId).toBe("Credentials:CredentialIssuer");
			expect(body.payload.issuer).toBe("test-party");
			expect(body.payload.name).toBe("Test Issuer");
			expect(body.payload.jurisdiction).toBe("CH");
			expect(body.payload.issuerType).toBe("KYC");
			expect(body.payload.active).toBe(true);
		});
	});

	describe("error handling", () => {
		it("throws on non-OK response", async () => {
			mockFetchResponse(null, false, 401);

			await expect(client.getCredentials()).rejects.toThrow(
				"API error: 401",
			);
		});

		it("throws on 500 server error", async () => {
			mockFetchResponse(null, false, 500);

			await expect(client.verifyCredential("cid-1")).rejects.toThrow(
				"API error: 500",
			);
		});
	});
});
