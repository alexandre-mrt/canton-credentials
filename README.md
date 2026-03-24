# Canton Credentials

On-chain **verifiable credential management** for KYC/AML compliance on Canton Network.

![Daml](https://img.shields.io/badge/Daml-3.4-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Canton](https://img.shields.io/badge/Canton-Network-0052ff)
![License](https://img.shields.io/badge/License-MIT-green)

## Problem

Institutional DeFi on Canton requires compliance (KYC/AML/accreditation) but:
- Traditional KYC is siloed per institution (repeated verification)
- Credential sharing lacks privacy (oversharing personal data)
- No on-chain proof of compliance status

## Solution

Canton Credentials provides a **privacy-preserving, reusable credential system** leveraging Canton's sub-transaction privacy:

- **Issue once, verify everywhere** — KYC providers issue credentials that any verifier can check
- **Privacy by default** — Only the verifier and subject see the verification result
- **Compliance gates** — Smart contracts that require specific credentials before allowing actions
- **Full lifecycle** — Issue, verify, revoke, renew, present

## Smart Contracts

### CredentialIssuer
Trusted authorities (KYC providers, regulators) register as issuers and can issue credentials.

### VerifiableCredential
On-chain credential with:
- **VerifyCredential** — Any verifier can check validity (creates on-chain proof)
- **RevokeCredential** — Issuer can revoke with reason
- **RenewCredential** — Issuer can extend expiry
- Contract key: `(issuer, subject, credentialType)` for unique lookups

### PresentationRequest
Selective disclosure flow:
1. Verifier creates request specifying required credential types
2. Subject responds by presenting credential contract IDs
3. Verification results created on-chain

### ComplianceGate
Composable compliance checks:
- Operator defines required credential types (e.g., KYC + AML for trading)
- CheckCompliance verifies all credentials are valid, not expired, not revoked
- Integrates with other Canton apps (OTC desk, tokenization platforms)

## Credential Types

| Type | Use Case |
|------|----------|
| `KYC` | Identity verification |
| `AML_CLEARED` | Anti-money laundering screening |
| `ACCREDITED_INVESTOR` | SEC accredited investor status |
| `SANCTIONS_CLEARED` | OFAC/sanctions screening |
| `QUALIFIED_PURCHASER` | Qualified purchaser status |
| `INSTITUTIONAL` | Institutional entity verification |

## Quick Start

### Smart Contracts

```bash
cd daml
curl -sSL https://get.daml.com | sh -s 3.4.0
daml build
daml test --all
daml start
```

### Frontend

```bash
cd typescript
bun install
bun run dev
```

## Architecture

```
          ┌────────────┐     ┌────────────┐
          │ KYC Provider│     │  Regulator  │
          │  (Issuer)   │     │  (Issuer)   │
          └──────┬──────┘     └──────┬──────┘
                 │ IssueCredential   │
                 ▼                   ▼
          ┌──────────────────────────────┐
          │   VerifiableCredential       │
          │   (on Canton ledger)         │
          │   - subject, type, claims    │
          │   - expiry, revocation       │
          └──────────────┬───────────────┘
                         │ VerifyCredential
                         ▼
          ┌──────────────────────────────┐
          │   ComplianceGate             │
          │   - CheckCompliance          │
          │   - Required: [KYC, AML]     │
          └──────────────┬───────────────┘
                         │ Access granted
                         ▼
          ┌──────────────────────────────┐
          │   Protected Application      │
          │   (OTC Desk, Tokenization)   │
          └──────────────────────────────┘
```

## Privacy Model

Canton's sub-transaction privacy ensures:
- **Issuers** see only the credentials they issued
- **Subjects** see their own credentials
- **Verifiers** see only the verification result, not raw claims
- **Network operators** see only metadata

This is fundamentally different from public blockchains where credential data would be visible to all.

## Integration with Other Canton Apps

```daml
-- In your OTC Desk contract:
choice PlaceTrade : ContractId TradeOffer
  with
    trader : Party
    complianceGateCid : ContractId ComplianceGate
    credentialCids : [ContractId VerifiableCredential]
  controller trader
  do
    -- Check compliance before allowing trade
    compliant <- exercise complianceGateCid CheckCompliance with
      subject = trader
      credentialCids = credentialCids
    assert compliant
    -- ... create trade offer
```

## Grant Eligibility

This project targets the [Canton Foundation Grants Program](https://canton.foundation/grants-program/):

- **Category:** Security + Reference Implementation
- **Focus:** Reusable KYC/AML infrastructure for the Canton ecosystem
- **Impact:** Every compliance check = network transaction = app rewards

## License

MIT

---

Built for the Canton ecosystem. Not affiliated with Digital Asset.
