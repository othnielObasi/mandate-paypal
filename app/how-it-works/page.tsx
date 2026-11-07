import type { Metadata } from "next";
import NextLink from "next/link";
import { Mark } from "../components/icons";
import { BackLink } from "./BackLink";
import { MandateMap } from "./MandateMap";

export const metadata: Metadata = {
  title: "Mandate Map",
  description: "How every purchase gets checked: your rules, the 7-rule policy gate, PayPal payment, signed receipts and the controls you keep.",
};

const REPO = "https://github.com/othnielObasi/mandate-paypal";

export default function HowItWorks() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="site-nav">
        <div className="wrap site-nav-in">
          <NextLink href="/" className="brand">
            <Mark />
            Mandate
          </NextLink>
          <span className="grow" />
          <NextLink className="btn btn-ghost hide-sm" href="/developers">
            Developers
          </NextLink>
          <NextLink className="btn btn-primary" href="/app">
            Open the app
          </NextLink>
        </div>
      </header>
      <main className="wrap page mm" id="main">
        <div className="mm-root-top">
          <BackLink />
        </div>
        <MandateMap />
        <div className="mm-end">
          <NextLink className="btn btn-primary" href="/app">
            Open the app
          </NextLink>
          <NextLink className="btn" href="/">
            Back to home
          </NextLink>
        </div>
      </main>
      <footer className="footer">
        <div className="wrap footer-in">
          <span>Sandbox demo. An independent open-source project, not affiliated with or endorsed by PayPal or Google.</span>
          <nav aria-label="Footer">
            <NextLink href="/">Home</NextLink>
            <NextLink href="/seller">Seller check</NextLink>
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
