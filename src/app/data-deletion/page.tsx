import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata = { title: "Data Deletion | EcomOS" };

const CONTACT = "rreyes325@gmail.com";

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion" updated="September 22, 2026">
      <p>
        EcomOS gives you two ways to delete data: a self-serve option you control, and automatic
        handling of requests that come through Shopify.
      </p>

      <H2>Delete your whole workspace</H2>
      <p>
        Any workspace owner can permanently delete the workspace from the Team page. Deleting a
        workspace removes every store connection, product, order, campaign, teammate and audit log
        tied to it — immediately, with no recovery period. Your login itself is not deleted; you can
        start a new workspace afterward. We ask you to type the workspace&apos;s name to confirm before
        this runs, because it can&apos;t be undone.
      </p>

      <H2>If you&apos;re a customer of a store using EcomOS</H2>
      <p>
        If a store you shopped with connects it to EcomOS, Shopify may forward two kinds of requests
        to us on your behalf, and we handle both automatically:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong className="text-hi">A request for the data we hold about you</strong> — we notify
          the store owner so they can respond to you directly.
        </li>
        <li>
          <strong className="text-hi">A request to erase your data</strong> — we delete your customer
          record from our database. Your past orders stay in the store owner&apos;s records for their
          own accounting and legal obligations, but are no longer linked to your name or contact info
          on our side.
        </li>
      </ul>
      <p>
        If a store disconnects entirely, Shopify tells us and we delete everything tied to that store
        from our database — products, orders, customers, and inventory records — within the same flow.
      </p>

      <H2>What isn&apos;t covered</H2>
      <p>
        We don&apos;t control data inside Shopify or Meta themselves — deleting your EcomOS workspace
        doesn&apos;t delete your Shopify store or Meta ad account. Use those platforms&apos; own tools
        for that.
      </p>

      <H2>Questions or a request we haven&apos;t automated</H2>
      <p>
        Email{" "}
        <a href={`mailto:${CONTACT}`} className="text-gold-hi underline">
          {CONTACT}
        </a>{" "}
        and we&apos;ll handle it directly.
      </p>
    </LegalPage>
  );
}
