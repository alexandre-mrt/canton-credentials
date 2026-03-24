import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Canton Credentials — On-Chain Verifiable KYC/AML",
	description: "Verifiable credential management on Canton Network. Issue, verify, and manage KYC/AML credentials with privacy-preserving smart contracts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return <html lang="en"><body>{children}</body></html>;
}
