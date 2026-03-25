import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PORT = 3996;
const BASE_URL = `http://localhost:${PORT}`;

let browser: Browser;
let page: Page;
let serverProcess: ChildProcess;

function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const check = () => {
			fetch(url)
				.then((res) => {
					if (res.ok) return resolve();
					throw new Error(`Status ${res.status}`);
				})
				.catch(() => {
					if (Date.now() - start > timeoutMs) {
						return reject(new Error(`Server did not start within ${timeoutMs}ms`));
					}
					setTimeout(check, 500);
				});
		};
		check();
	});
}

beforeAll(async () => {
	serverProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
		cwd: process.cwd(),
		stdio: "pipe",
		env: { ...process.env, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" },
	});

	serverProcess.stdout?.on("data", (data: Buffer) => {
		process.stderr.write(`[next] ${data.toString()}`);
	});

	serverProcess.stderr?.on("data", (data: Buffer) => {
		const msg = data.toString();
		process.stderr.write(`[next:err] ${msg}`);
		if (msg.includes("EADDRINUSE")) {
			throw new Error(`Port ${PORT} already in use`);
		}
	});

	await waitForServer(BASE_URL);

	browser = await puppeteer.launch({ headless: true });
	page = await browser.newPage();
	page.setDefaultTimeout(15_000);
}, 90_000);

afterAll(async () => {
	await page?.close().catch(() => {});
	await browser?.close().catch(() => {});
	if (serverProcess) {
		serverProcess.kill("SIGTERM");
		await new Promise<void>((resolve) => {
			serverProcess.on("close", () => resolve());
			setTimeout(resolve, 5_000);
		});
	}
});

describe("Canton Credentials E2E", () => {
	it("Test 1: Homepage loads with credential dashboard", async () => {
		await page.goto(BASE_URL, { waitUntil: "networkidle2" });

		const header = await page.$eval("h1", (el) => el.textContent);
		expect(header).toBe("Canton Credentials");

		const subtitle = await page.$eval("header p", (el) => el.textContent);
		expect(subtitle).toContain("On-Chain Verifiable KYC/AML");

		await page.waitForSelector(".badge-valid", { timeout: 10_000 });
		const validBadge = await page.$eval(".badge-valid", (el) => el.textContent);
		expect(validBadge).toContain("Valid");

		const revokedBadge = await page.$eval(".badge-revoked", (el) => el.textContent);
		expect(revokedBadge).toContain("Revoked");
	});

	it("Test 2: Credential cards display correctly", async () => {
		await page.goto(BASE_URL, { waitUntil: "networkidle2" });

		// Wait for credentials to render
		await page.waitForSelector(".card", { timeout: 10_000 });
		const cards = await page.$$(".card");
		expect(cards.length).toBeGreaterThan(0);

		// Check for KYC badge
		const badgeTexts = await page.$$eval(".badge-type", (els) =>
			els.map((el) => el.textContent?.trim()),
		);
		expect(badgeTexts.some((t) => t === "KYC")).toBe(true);

		// Check for Revoked status
		const statusTexts = await page.$$eval(".badge-revoked", (els) =>
			els.map((el) => el.textContent?.trim()),
		);
		expect(statusTexts.some((t) => t?.includes("Revoked"))).toBe(true);

		// Check claims section is visible
		const claimsVisible = await page.$$eval(".card", (cards) =>
			cards.some((card) => card.textContent?.includes("Claims")),
		);
		expect(claimsVisible).toBe(true);
	});

	it("Test 3: Tab navigation works", async () => {
		await page.goto(BASE_URL, { waitUntil: "networkidle2" });

		// Click Issuers tab
		const tabs = await page.$$("nav button");
		const issuersTab = tabs[1];
		await issuersTab.click();
		await page.waitForFunction(
			() => document.body.textContent?.includes("Trusted Issuers"),
			{ timeout: 10_000 },
		);
		const issuerContent = await page.$eval("main", (el) => el.textContent);
		expect(issuerContent).toContain("SwissKYC AG");

		// Click Verify tab
		const verifyTab = (await page.$$("nav button"))[2];
		await verifyTab.click();
		await page.waitForSelector("#cred-id", { timeout: 10_000 });
		const verifyButton = await page.$eval("main button", (el) => el.textContent);
		expect(verifyButton).toContain("Verify On-Chain");

		// Click Compliance Gates tab
		const complianceTab = (await page.$$("nav button"))[3];
		await complianceTab.click();
		await page.waitForFunction(
			() => document.body.textContent?.includes("Compliance Gates"),
			{ timeout: 10_000 },
		);
		const gateCards = await page.$$eval(".card", (els) =>
			els.map((el) => el.textContent),
		);
		expect(gateCards.some((t) => t?.includes("OTC Trading Access"))).toBe(true);
	});

	it("Test 4: Verify form interaction", async () => {
		await page.goto(BASE_URL, { waitUntil: "networkidle2" });

		// Navigate to Verify tab
		const verifyTab = (await page.$$("nav button"))[2];
		await verifyTab.click();
		await page.waitForSelector("#cred-id", { timeout: 10_000 });

		// Type a credential ID
		await page.type("#cred-id", "00abc123def456");

		// Click Verify On-Chain button
		const buttons = await page.$$("main button");
		const verifyButton = buttons.find(
			async (btn) => (await btn.evaluate((el) => el.textContent))?.includes("Verify On-Chain"),
		);
		// Find the button by text content
		for (const btn of buttons) {
			const text = await btn.evaluate((el) => el.textContent);
			if (text?.includes("Verify On-Chain")) {
				await btn.click();
				break;
			}
		}

		// Wait for result to appear (demo takes ~1s)
		await page.waitForFunction(
			() => {
				const el = document.querySelector(".bg-green-900\\/20, .bg-red-900\\/20");
				return el !== null;
			},
			{ timeout: 15_000 },
		);

		// Verify result shows Valid status (no "revoked" in ID means valid)
		const resultText = await page.$eval(
			".bg-green-900\\/20",
			(el) => el.textContent,
		);
		expect(resultText).toContain("Valid");
		expect(resultText).toContain("Credential is valid and not expired");
	});
});
