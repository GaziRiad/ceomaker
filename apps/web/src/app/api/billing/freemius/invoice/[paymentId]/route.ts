import { getAuth } from "@/lib/auth";
import { freemiusInvoice } from "@/lib/freemius";

/** One of the signed-in owner's invoices, as a PDF from Freemius. */
export async function GET(
  request: Request,
  context: RouteContext<"/api/billing/freemius/invoice/[paymentId]">,
) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return new Response("Sign in to see your invoices", { status: 401 });
  const { paymentId } = await context.params;
  if (!/^\d{1,20}$/.test(paymentId)) return new Response("Not found", { status: 404 });
  const pdf = await freemiusInvoice(session.user.id, paymentId).catch((error: unknown) => {
    console.error("Downloading an invoice failed", error);
    return null;
  });
  if (!pdf) return new Response("Not found", { status: 404 });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ceomaker-invoice-${paymentId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
