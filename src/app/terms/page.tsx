import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms of Service | EcomOS" };

const CONTACT = "rreyes325@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 22, 2026">
      <p>
        These terms cover your use of EcomOS. By creating a workspace you agree to them. EcomOS is
        operated by Ranser Reyes — if you represent a registered company that should be named here
        instead, update this line before relying on these terms.
      </p>

      <H2>What EcomOS does</H2>
      <p>
        EcomOS connects to your Shopify store and Meta ad account so you can see orders, inventory,
        and ad performance in one place, and optionally take actions (publishing product copy,
        adjusting campaign budgets) that we then push back to Shopify or Meta on your behalf.
      </p>

      <H2>Your account</H2>
      <p>
        You&apos;re responsible for what happens under your workspace, including actions taken by
        teammates you invite. Keep your login credentials to yourself. You must have the right to
        connect any Shopify store or Meta ad account you link to EcomOS.
      </p>

      <H2>Acceptable use</H2>
      <p>
        Don&apos;t use EcomOS to violate Shopify&apos;s or Meta&apos;s own terms of service, to store
        data you don&apos;t have the right to hold, or to attempt to access another workspace&apos;s
        data. We may suspend access for accounts that do.
      </p>

      <H2>AI-generated content</H2>
      <p>
        Product copy and creative concepts generated through EcomOS are produced by a third-party AI
        model. Review AI-generated content before publishing it — we don&apos;t guarantee its accuracy,
        and you&apos;re responsible for what you publish to your store or ad accounts.
      </p>

      <H2>No warranty</H2>
      <p>
        EcomOS is provided as-is. We don&apos;t guarantee it will be uninterrupted or error-free, or
        that data from Shopify or Meta will always sync correctly — those are third-party systems
        outside our control. We are not liable for lost sales, ad spend, or data arising from your use
        of the Service.
      </p>

      <H2>Termination</H2>
      <p>
        You can stop using EcomOS and delete your workspace at any time from the Team page — see our{" "}
        <a href="/data-deletion" className="text-gold-hi underline">
          Data Deletion
        </a>{" "}
        page. We may suspend or terminate a workspace that violates these terms.
      </p>

      <H2>Changes</H2>
      <p>
        We may update these terms as the Service changes. Continued use after an update means you
        accept the new terms.
      </p>

      <H2>Contact</H2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${CONTACT}`} className="text-gold-hi underline">
          {CONTACT}
        </a>
        .
      </p>
    </LegalPage>
  );
}
