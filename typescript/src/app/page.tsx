"use client";

import {
	getDemoCredentials,
	getDemoIssuers,
} from "@/lib/credential-client";
import type { CredentialType, VerifiableCredential } from "@/types/credentials";
import {
	CheckCircle,
	Clock,
	FileCheck,
	Key,
	Shield,
	ShieldAlert,
	ShieldCheck,
	UserCheck,
	XCircle,
} from "lucide-react";
import { useState } from "react";

type Tab = "credentials" | "issuers" | "verify" | "compliance";

export default function CredentialsPage() {
	const [activeTab, setActiveTab] = useState<Tab>("credentials");
	const credentials = getDemoCredentials();
	const issuers = getDemoIssuers();

	const validCount = credentials.filter(
		(c) => !c.revoked && new Date(c.expiresAt) > new Date(),
	).length;
	const revokedCount = credentials.filter((c) => c.revoked).length;

	return (
		<div className="min-h-screen">
			<header className="border-b border-[var(--border)] bg-[var(--card)]">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<ShieldCheck className="text-[var(--blue)]" size={24} />
							<div>
								<h1 className="text-lg font-bold">Canton Credentials</h1>
								<p className="text-xs text-[var(--muted)]">
									On-Chain Verifiable KYC/AML
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3 text-sm">
							<span className="badge badge-valid">
								<CheckCircle size={12} /> {validCount} Valid
							</span>
							<span className="badge badge-revoked">
								<XCircle size={12} /> {revokedCount} Revoked
							</span>
						</div>
					</div>

					<nav className="flex gap-1 mt-4 -mb-[1px]">
						{(
							[
								{ id: "credentials", label: "My Credentials", icon: <Key size={14} /> },
								{ id: "issuers", label: "Issuers", icon: <Shield size={14} /> },
								{ id: "verify", label: "Verify", icon: <FileCheck size={14} /> },
								{ id: "compliance", label: "Compliance Gates", icon: <ShieldAlert size={14} /> },
							] as const
						).map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
									activeTab === tab.id
										? "text-white border-b-2 border-[var(--blue)] font-medium"
										: "text-[var(--muted)] hover:text-white"
								}`}
							>
								{tab.icon} {tab.label}
							</button>
						))}
					</nav>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
				{activeTab === "credentials" && (
					<CredentialsList credentials={credentials} />
				)}
				{activeTab === "issuers" && <IssuersList />}
				{activeTab === "verify" && <VerifyPanel />}
				{activeTab === "compliance" && <CompliancePanel />}
			</main>

			<footer className="border-t border-[var(--border)] mt-12">
				<div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-[var(--muted)]">
					<p>
						Canton Credentials — Privacy-preserving verifiable credentials on Canton Network
					</p>
					<p className="mt-1">
						Sub-transaction privacy ensures only authorized parties see credential data.
					</p>
				</div>
			</footer>
		</div>
	);
}

function CredentialsList({
	credentials,
}: {
	credentials: VerifiableCredential[];
}) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-bold">Verifiable Credentials</h2>
				<button type="button" className="bg-[var(--blue)] text-white px-4 py-2 rounded-md text-sm font-medium">
					Request Credential
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{credentials.map((cred) => (
					<CredentialCard key={cred.contractId} credential={cred} />
				))}
			</div>
		</div>
	);
}

function CredentialCard({
	credential,
}: {
	credential: VerifiableCredential;
}) {
	const isExpired = new Date(credential.expiresAt) < new Date();
	const status = credential.revoked
		? "revoked"
		: isExpired
			? "expired"
			: "valid";

	const statusConfig = {
		valid: { badge: "badge-valid", icon: <CheckCircle size={14} />, label: "Valid" },
		revoked: { badge: "badge-revoked", icon: <XCircle size={14} />, label: "Revoked" },
		expired: { badge: "badge-expired", icon: <Clock size={14} />, label: "Expired" },
	}[status];

	return (
		<div className="card">
			<div className="flex items-start justify-between mb-3">
				<div>
					<span className="badge badge-type">{credential.credentialType}</span>
					<span className={`badge ${statusConfig.badge} ml-2`}>
						{statusConfig.icon} {statusConfig.label}
					</span>
				</div>
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-[var(--muted)]">Issuer</span>
					<span className="font-mono text-xs">{credential.issuer}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-[var(--muted)]">Subject</span>
					<span className="font-mono text-xs">{credential.subject}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-[var(--muted)]">Issued</span>
					<span className="text-xs">
						{new Date(credential.issuedAt).toLocaleDateString()}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-[var(--muted)]">Expires</span>
					<span className="text-xs">
						{new Date(credential.expiresAt).toLocaleDateString()}
					</span>
				</div>
			</div>

			{credential.claims && (
				<div className="mt-3 pt-3 border-t border-[var(--border)]">
					<p className="text-xs text-[var(--muted)] mb-2">Claims</p>
					<div className="space-y-1">
						{Object.entries(credential.claims).map(([key, value]) => (
							<div
								key={key}
								className="flex justify-between text-xs"
							>
								<span className="text-[var(--muted)]">{key}</span>
								<span className="font-mono">{String(value)}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{credential.revoked && credential.revocationReason && (
				<div className="mt-3 pt-3 border-t border-[var(--border)]">
					<p className="text-xs text-[var(--red)]">
						Revocation reason: {credential.revocationReason}
					</p>
				</div>
			)}

			<div className="flex gap-2 mt-4">
				{status === "valid" && (
					<>
						<button type="button" className="flex-1 bg-[var(--blue)] text-white py-1.5 rounded text-xs font-medium">
							Present
						</button>
						<button type="button" className="flex-1 border border-[var(--border)] py-1.5 rounded text-xs text-[var(--muted)]">
							Share Proof
						</button>
					</>
				)}
				{status === "expired" && (
					<button type="button" className="flex-1 bg-[var(--yellow)] text-black py-1.5 rounded text-xs font-medium">
						Request Renewal
					</button>
				)}
			</div>
		</div>
	);
}

function IssuersList() {
	const issuers = getDemoIssuers();
	return (
		<div className="space-y-4">
			<h2 className="text-lg font-bold">Trusted Issuers</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{issuers.map((issuer) => (
					<div key={issuer.contractId} className="card">
						<div className="flex items-center gap-2 mb-3">
							<Shield size={20} className="text-[var(--blue)]" />
							<h3 className="font-semibold">{issuer.name}</h3>
						</div>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-[var(--muted)]">Type</span>
								<span className="badge badge-type">{issuer.issuerType}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-[var(--muted)]">Jurisdiction</span>
								<span>{issuer.jurisdiction}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-[var(--muted)]">Status</span>
								<span className="badge badge-valid">
									<CheckCircle size={10} /> Active
								</span>
							</div>
						</div>
						<button type="button" className="w-full mt-4 border border-[var(--border)] py-2 rounded text-xs text-[var(--muted)] hover:text-white hover:border-[var(--blue)] transition-colors">
							Request Credential
						</button>
					</div>
				))}
			</div>
		</div>
	);
}

function VerifyPanel() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div className="card">
				<h2 className="text-lg font-bold mb-4">Verify a Credential</h2>
				<p className="text-sm text-[var(--muted)] mb-6">
					Enter a credential contract ID to verify its validity on the Canton ledger.
					Verification creates an on-chain proof.
				</p>

				<div className="space-y-4">
					<div>
						<label htmlFor="cred-id" className="block text-xs text-[var(--muted)] mb-1">
							Credential Contract ID
						</label>
						<input
							id="cred-id"
							type="text"
							placeholder="00xx...xxxx"
							className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono"
						/>
					</div>
					<button type="button" className="w-full bg-[var(--blue)] text-white py-3 rounded font-medium text-sm">
						Verify On-Chain
					</button>
				</div>

				<div className="mt-6 p-4 bg-[var(--bg)] rounded border border-[var(--border)]">
					<h3 className="font-semibold text-sm mb-2">How it works</h3>
					<ol className="space-y-2 text-xs text-[var(--muted)]">
						<li>1. The credential smart contract is fetched from the ledger</li>
						<li>2. Expiry and revocation status are checked on-chain</li>
						<li>3. A CredentialVerification contract is created as proof</li>
						<li>4. Only you and the subject see the verification result (privacy)</li>
					</ol>
				</div>
			</div>

			<div className="card">
				<h2 className="text-lg font-bold mb-4">Request Presentation</h2>
				<p className="text-sm text-[var(--muted)] mb-6">
					Ask a party to present specific credentials for verification.
				</p>

				<div className="space-y-4">
					<div>
						<label htmlFor="subject-party" className="block text-xs text-[var(--muted)] mb-1">
							Subject Party ID
						</label>
						<input
							id="subject-party"
							type="text"
							placeholder="Party ID"
							className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono"
						/>
					</div>
					<div>
						<label className="block text-xs text-[var(--muted)] mb-2">
							Required Credentials
						</label>
						<div className="flex flex-wrap gap-2">
							{["KYC", "AML_CLEARED", "ACCREDITED_INVESTOR", "SANCTIONS_CLEARED"].map(
								(type) => (
									<label key={type} className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input type="checkbox" className="accent-[var(--blue)]" />
										{type}
									</label>
								),
							)}
						</div>
					</div>
					<div>
						<label htmlFor="purpose" className="block text-xs text-[var(--muted)] mb-1">
							Purpose
						</label>
						<input
							id="purpose"
							type="text"
							placeholder="Account onboarding, trade access..."
							className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm"
						/>
					</div>
					<button type="button" className="w-full bg-[var(--purple)] text-white py-3 rounded font-medium text-sm">
						Send Presentation Request
					</button>
				</div>
			</div>
		</div>
	);
}

function CompliancePanel() {
	const gates = [
		{
			name: "OTC Trading Access",
			required: ["KYC", "AML_CLEARED"],
			description: "Required to place or take OTC trade offers",
		},
		{
			name: "Tokenized Securities",
			required: ["KYC", "AML_CLEARED", "ACCREDITED_INVESTOR"],
			description: "Required to trade tokenized equities and bonds",
		},
		{
			name: "Cross-Border Settlement",
			required: ["KYC", "AML_CLEARED", "SANCTIONS_CLEARED"],
			description: "Required for international settlement operations",
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-bold">Compliance Gates</h2>
				<button type="button" className="bg-[var(--blue)] text-white px-4 py-2 rounded-md text-sm font-medium">
					Create Gate
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{gates.map((gate) => (
					<div key={gate.name} className="card">
						<div className="flex items-center gap-2 mb-3">
							<ShieldAlert size={18} className="text-[var(--yellow)]" />
							<h3 className="font-semibold text-sm">{gate.name}</h3>
						</div>
						<p className="text-xs text-[var(--muted)] mb-4">
							{gate.description}
						</p>
						<div className="space-y-2">
							<p className="text-xs text-[var(--muted)]">Required:</p>
							<div className="flex flex-wrap gap-1">
								{gate.required.map((req) => (
									<span key={req} className="badge badge-type text-[10px]">
										{req}
									</span>
								))}
							</div>
						</div>
						<button type="button" className="w-full mt-4 border border-[var(--border)] py-2 rounded text-xs text-[var(--muted)] hover:text-white hover:border-[var(--green)] transition-colors">
							Check My Compliance
						</button>
					</div>
				))}
			</div>

			<div className="card">
				<h3 className="font-bold mb-4">How Compliance Gates Work</h3>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{[
						{ step: "1", title: "Gate Created", desc: "Operator defines required credential types" },
						{ step: "2", title: "User Requests Access", desc: "Presents credential contract IDs" },
						{ step: "3", title: "On-Chain Verification", desc: "Smart contract checks validity, expiry, revocation" },
						{ step: "4", title: "Access Granted/Denied", desc: "Result stored on-chain as proof" },
					].map((item) => (
						<div key={item.step} className="text-center">
							<div className="w-8 h-8 rounded-full bg-[var(--blue)] text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold">
								{item.step}
							</div>
							<h4 className="text-sm font-semibold">{item.title}</h4>
							<p className="text-xs text-[var(--muted)] mt-1">{item.desc}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
