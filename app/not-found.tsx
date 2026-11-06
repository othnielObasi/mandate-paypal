import NextLink from "next/link";
import { Mark } from "./components/icons";

export default function NotFound() {
  return (
    <main id="main" className="nf">
      <NextLink href="/" className="brand" aria-label="Mandate home">
        <Mark size={24} />
        Mandate
      </NextLink>
      <p className="kicker">404</p>
      <h1>This page isn&rsquo;t here</h1>
      <p className="nf-text">The link may be old, or the address may have a typo.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <NextLink className="btn btn-primary" href="/">
          Go to the home page
        </NextLink>
        <NextLink className="btn" href="/app">
          Open the app
        </NextLink>
      </div>
    </main>
  );
}
