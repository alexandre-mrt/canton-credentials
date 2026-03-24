# Canton Credentials

## Overview
On-chain verifiable credential system for KYC/AML compliance on Canton Network. Daml smart contracts manage credential lifecycle; Next.js frontend provides management UI.

## Stack
- **Smart Contracts:** Daml (Canton SDK 3.4)
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS v4
- **Linter:** Biome, **Package manager:** bun

## Structure
```
daml/
  Credentials.daml       # Core: CredentialIssuer, VerifiableCredential, ComplianceGate
  CredentialsTest.daml   # Full test suite
  daml.yaml              # Project config
typescript/
  src/
    types/credentials.ts # TypeScript types
    lib/credential-client.ts  # JSON API client + demo data
    app/page.tsx          # Credential management UI
```

## Key Contracts
- **CredentialIssuer:** Issues credentials, can be deactivated
- **VerifiableCredential:** On-chain credential with verify, revoke, renew
- **PresentationRequest:** Verifier asks subject to prove credentials
- **ComplianceGate:** Requires multiple credentials before granting access
- **CredentialVerification:** On-chain proof of verification result
