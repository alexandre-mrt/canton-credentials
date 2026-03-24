import type {
	ComplianceCheckResult,
	ComplianceGate,
	CredentialIssuer,
	CredentialType,
	CredentialVerification,
	PresentationRequest,
	VerifiableCredential,
} from "@/types/credentials";

interface ApiConfig {
	baseUrl: string;
	token: string;
	party: string;
}

export class CredentialClient {
	private config: ApiConfig;

	constructor(config: ApiConfig) {
		this.config = config;
	}

	private async request<T>(endpoint: string, body: unknown): Promise<T> {
		const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.token}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		return response.json();
	}

	// Issuer operations

	async registerIssuer(params: {
		name: string;
		jurisdiction: string;
		issuerType: CredentialType;
	}): Promise<string> {
		const result = await this.request<{ contractId: string }>("/v2/create", {
			templateId: "Credentials:CredentialIssuer",
			payload: {
				issuer: this.config.party,
				name: params.name,
				jurisdiction: params.jurisdiction,
				issuerType: params.issuerType,
				active: true,
			},
		});
		return result.contractId;
	}

	async issueCredential(
		issuerContractId: string,
		params: {
			subject: string;
			credentialType: CredentialType;
			claims: Record<string, unknown>;
			expiresAt: string;
		},
	): Promise<string> {
		const result = await this.request<{ exerciseResult: string }>(
			"/v2/exercise",
			{
				templateId: "Credentials:CredentialIssuer",
				contractId: issuerContractId,
				choice: "IssueCredential",
				argument: {
					subject: params.subject,
					credentialType: params.credentialType,
					claims: JSON.stringify(params.claims),
					expiresAt: params.expiresAt,
				},
			},
		);
		return result.exerciseResult;
	}

	// Credential operations

	async getCredentials(
		subject?: string,
	): Promise<VerifiableCredential[]> {
		const result = await this.request<{
			result: { contractId: string; payload: Record<string, unknown> }[];
		}>("/v2/query", {
			templateId: "Credentials:VerifiableCredential",
			query: subject ? { subject } : {},
		});

		return result.result.map((r) => ({
			contractId: r.contractId,
			issuer: r.payload.issuer as string,
			subject: r.payload.subject as string,
			credentialType: r.payload.credentialType as CredentialType,
			claims: JSON.parse(r.payload.claims as string),
			issuedAt: r.payload.issuedAt as string,
			expiresAt: r.payload.expiresAt as string,
			revoked: r.payload.revoked as boolean,
			revocationReason: r.payload.revocationReason as string,
		}));
	}

	async verifyCredential(
		credentialContractId: string,
	): Promise<string> {
		const result = await this.request<{ exerciseResult: string }>(
			"/v2/exercise",
			{
				templateId: "Credentials:VerifiableCredential",
				contractId: credentialContractId,
				choice: "VerifyCredential",
				argument: { verifier: this.config.party },
			},
		);
		return result.exerciseResult;
	}

	async revokeCredential(
		credentialContractId: string,
		reason: string,
	): Promise<void> {
		await this.request("/v2/exercise", {
			templateId: "Credentials:VerifiableCredential",
			contractId: credentialContractId,
			choice: "RevokeCredential",
			argument: { reason },
		});
	}

	// Compliance operations

	async createComplianceGate(params: {
		gateName: string;
		requiredCredentialTypes: CredentialType[];
		description: string;
	}): Promise<string> {
		const result = await this.request<{ contractId: string }>("/v2/create", {
			templateId: "Credentials:ComplianceGate",
			payload: {
				operator: this.config.party,
				...params,
			},
		});
		return result.contractId;
	}

	async checkCompliance(
		gateContractId: string,
		subject: string,
		credentialCids: string[],
	): Promise<boolean> {
		const result = await this.request<{ exerciseResult: boolean }>(
			"/v2/exercise",
			{
				templateId: "Credentials:ComplianceGate",
				contractId: gateContractId,
				choice: "CheckCompliance",
				argument: { subject, credentialCids },
			},
		);
		return result.exerciseResult;
	}

	// Presentation request operations

	async requestPresentation(params: {
		subject: string;
		requiredCredentials: CredentialType[];
		purpose: string;
		expiresAt: string;
	}): Promise<string> {
		const result = await this.request<{ contractId: string }>("/v2/create", {
			templateId: "Credentials:PresentationRequest",
			payload: {
				verifier: this.config.party,
				...params,
			},
		});
		return result.contractId;
	}
}

// Demo data
export function getDemoCredentials(): VerifiableCredential[] {
	return [
		{
			contractId: "demo-cred-1",
			issuer: "SwissKYC-AG",
			subject: "alice",
			credentialType: "KYC",
			claims: {
				name: "Alice Johnson",
				country: "CH",
				level: "enhanced",
				documentType: "passport",
			},
			issuedAt: "2026-01-15T10:00:00Z",
			expiresAt: "2027-01-15T10:00:00Z",
			revoked: false,
			revocationReason: "",
		},
		{
			contractId: "demo-cred-2",
			issuer: "SwissKYC-AG",
			subject: "alice",
			credentialType: "AML_CLEARED",
			claims: {
				status: "cleared",
				riskLevel: "low",
				lastScreening: "2026-03-01",
			},
			issuedAt: "2026-03-01T10:00:00Z",
			expiresAt: "2026-09-01T10:00:00Z",
			revoked: false,
			revocationReason: "",
		},
		{
			contractId: "demo-cred-3",
			issuer: "SEC-Accreditation",
			subject: "alice",
			credentialType: "ACCREDITED_INVESTOR",
			claims: {
				netWorth: ">1M USD",
				annualIncome: ">200K USD",
				verificationDate: "2026-02-15",
			},
			issuedAt: "2026-02-15T10:00:00Z",
			expiresAt: "2027-02-15T10:00:00Z",
			revoked: false,
			revocationReason: "",
		},
		{
			contractId: "demo-cred-4",
			issuer: "SwissKYC-AG",
			subject: "bob",
			credentialType: "KYC",
			claims: {
				name: "Bob Smith",
				country: "DE",
				level: "standard",
				documentType: "id_card",
			},
			issuedAt: "2026-02-01T10:00:00Z",
			expiresAt: "2027-02-01T10:00:00Z",
			revoked: true,
			revocationReason: "Failed periodic review",
		},
	];
}

export function getDemoIssuers(): CredentialIssuer[] {
	return [
		{
			contractId: "demo-issuer-1",
			issuer: "SwissKYC-AG",
			name: "SwissKYC AG",
			jurisdiction: "Switzerland",
			issuerType: "KYC",
			active: true,
		},
		{
			contractId: "demo-issuer-2",
			issuer: "SEC-Accreditation",
			name: "SEC Accreditation Service",
			jurisdiction: "United States",
			issuerType: "ACCREDITED_INVESTOR",
			active: true,
		},
		{
			contractId: "demo-issuer-3",
			issuer: "OFAC-Sanctions",
			name: "OFAC Sanctions Screening",
			jurisdiction: "United States",
			issuerType: "SANCTIONS_CLEARED",
			active: true,
		},
	];
}
