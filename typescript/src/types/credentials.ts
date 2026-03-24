export interface CredentialIssuer {
	contractId: string;
	issuer: string;
	name: string;
	jurisdiction: string;
	issuerType: CredentialType;
	active: boolean;
}

export type CredentialType =
	| "KYC"
	| "AML_CLEARED"
	| "ACCREDITED_INVESTOR"
	| "SANCTIONS_CLEARED"
	| "QUALIFIED_PURCHASER"
	| "INSTITUTIONAL";

export interface VerifiableCredential {
	contractId: string;
	issuer: string;
	subject: string;
	credentialType: CredentialType;
	claims: Record<string, unknown>;
	issuedAt: string;
	expiresAt: string;
	revoked: boolean;
	revocationReason: string;
}

export interface CredentialVerification {
	contractId: string;
	issuer: string;
	subject: string;
	verifier: string;
	credentialType: CredentialType;
	isValid: boolean;
	verifiedAt: string;
	reason: string;
}

export interface PresentationRequest {
	contractId: string;
	verifier: string;
	subject: string;
	requiredCredentials: CredentialType[];
	purpose: string;
	expiresAt: string;
}

export interface ComplianceGate {
	contractId: string;
	operator: string;
	gateName: string;
	requiredCredentialTypes: CredentialType[];
	description: string;
}

export interface ComplianceCheckResult {
	subject: string;
	gate: string;
	compliant: boolean;
	checkedAt: string;
	missingCredentials: CredentialType[];
	validCredentials: CredentialType[];
}
