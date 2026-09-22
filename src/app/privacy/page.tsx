import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy Policy | EcomOS" };

const CONTACT = "rreyes325@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 22, 2026">
      <p>
        This policy explains what EcomOS (&quot;we,&quot; &quot;us,&quot; the &quot;Service&quot;) collects, why, and how you can
        get it deleted. EcomOS is operated by Ranser Reyes. If you represent a company that should be
        named here instead of an individual, update this line before relying on this policy.
      </p>

      <H2>What we collect</H2>
      <p>
        <strong className="text-hi">Account data:</strong> your email address and login, via Supabase
        Auth. We never see or store your password ourselves.
      </p>
      <p>
        <strong className="text-hi">Shopify store data:</strong> once you connect a store, we read
        products, variants, orders, customers and inventory levels through Shopify&apos;s API, scoped to
        read-only access unless you explicitly enable AI-generated product copy publishing. We do not
        request access to payment details.
      </p>
      <p>
        <strong className="text-hi">Meta advertising data:</strong> if you connect a Meta ad account,
        we read your ad campaigns, spend and performance metrics, and — only where you take an action
        in the app that requires it — create, pause or adjust campaign budgets on your behalf.
      </p>
      <p>
        <strong className="text-hi">Usage data:</strong> an audit log of actions taken in your
        workspace (who did what, when), used for security and support, not analytics or advertising.
      </p>
      <p>
        We do not use tracking or advertising cookies. The only cookie the Service sets is your
        session cookie, required to keep you signed in.
      </p>

      <H2>Who we share it with</H2>
      <p>
        We don&apos;t sell your data. We share it only with the services that make EcomOS work:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Shopify and Meta, to sync the data you&apos;ve connected</li>
        <li>Supabase, for authentication and database hosting</li>
        <li>Vercel, for application hosting</li>
        <li>Resend, to deliver transactional email (invitations, notifications)</li>
        <li>
          Anthropic, only when you use an AI feature (product copy, creative concepts) — the specific
          product text involved is sent to generate that content, nothing else
        </li>
      </ul>
      <p>
        If we&apos;ve configured internal error alerting, error messages may be relayed to a private
        Slack or Discord channel for our own monitoring; we redact anything that looks like a token,
        password or API key before that happens.
      </p>

      <H2>How long we keep it</H2>
      <p>
        Store and account data is kept while your workspace is active. You can delete a workspace
        (and everything in it) yourself at any time — see our{" "}
        <a href="/data-deletion" className="text-gold-hi underline">
          Data Deletion
        </a>{" "}
        page for exactly what that does and how.
      </p>

      <H2>Your rights</H2>
      <p>
        You can request a copy of what we hold, or ask us to delete it, by emailing{" "}
        <a href={`mailto:${CONTACT}`} className="text-gold-hi underline">
          {CONTACT}
        </a>
        . If your store&apos;s customers submit a data request or deletion request through Shopify
        directly, we handle that automatically — see the Data Deletion page for detail.
      </p>

      <H2>Changes to this policy</H2>
      <p>
        If this policy changes materially, we&apos;ll update the date at the top of this page. Continued
        use of the Service after a change means you accept the update.
      </p>

      <H2>Contact</H2>
      <p>
        Questions about this policy:{" "}
        <a href={`mailto:${CONTACT}`} className="text-gold-hi underline">
          {CONTACT}
        </a>
        .
      </p>
    </LegalPage>
  );
}
