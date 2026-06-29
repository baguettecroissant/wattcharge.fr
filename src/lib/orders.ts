import { resend } from './resend';

interface OrderParams {
  email: string;
  name: string;
  shippingAddress: any;
  productId: string;
  totalAmount: number;
  paymentId: string;
  gateway: 'stripe' | 'paypal';
}

/**
 * Traite une commande payée : génère un ID, envoie les e-mails transactionnels (Client + Fournisseur dropshipping).
 */
export async function processSuccessfulOrder(params: OrderParams) {
  const { email, name, shippingAddress, productId, totalAmount, paymentId, gateway } = params;

  // Génération d'un identifiant de commande unique pour le suivi
  const orderId = `wc_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
  console.log(`[Order Processing] Traitement de la commande ${orderId} initiée par ${gateway}`);

  // Déterminer le libellé du produit
  let productName = 'Borne de recharge WattCharge';
  if (productId === 'wattcharge-home-7') productName = 'Borne WattCharge Home 7.4 kW';
  else if (productId === 'wattcharge-home-11') productName = 'Borne WattCharge Home 11 kW';
  else if (productId === 'wattcharge-pro-22') productName = 'Borne WattCharge Pro 22 kW';

  // 1. Envoyer l'e-mail de confirmation au client
  try {
    const emailFrom = import.meta.env.EMAIL_FROM || 'WattCharge <noreply@wattcharge.fr>';

    const clientEmailHtml = `
      <div style="background-color: #f8fafc; color: #0f172a; font-family: sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0f172a; margin: 0; font-size: 2rem;">⚡ <span style="color: #53B7A8;">WattCharge</span></h1>
          <p style="color: #64748b; font-size: 0.9rem;">Confirmation de paiement sécurisé</p>
        </div>
        
        <h2 style="color: #0f172a; margin-bottom: 16px;">Merci pour votre achat !</h2>
        <p>Bonjour ${name},</p>
        <p>Votre commande a été validée avec succès. Nous préparons actuellement l'expédition de votre borne de recharge.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px; color: #64748b; font-weight: 600;">Numéro de commande</th>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: #0f172a;">${orderId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px; color: #64748b; font-weight: 600;">Produit</th>
            <td style="padding: 12px; text-align: right; color: #0f172a;">${productName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px; color: #64748b; font-weight: 600;">Moyen de paiement</th>
            <td style="padding: 12px; text-align: right; text-transform: uppercase; color: #0f172a;">${gateway}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 12px; color: #64748b; font-weight: 600;">Montant total réglé</th>
            <td style="padding: 12px; text-align: right; color: #53B7A8; font-size: 1.2rem;"><strong>${totalAmount.toFixed(2).replace('.', ',')} €</strong></td>
          </tr>
        </table>
        
        <div style="margin: 20px 0; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 1rem;">Adresse de livraison :</h3>
          <p style="color: #334155; line-height: 1.5; margin: 0; font-size: 0.95rem;">
            <strong>${name}</strong><br />
            ${shippingAddress.line1 || shippingAddress.street || ''}<br />
            ${shippingAddress.postal_code || shippingAddress.postalCode || ''} ${shippingAddress.city || ''}<br />
            ${shippingAddress.country || ''}
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        
        <p style="font-size: 0.85rem; color: #64748b; text-align: center;">
          Besoin d'assistance ? Répondez à ce mail ou écrivez-nous sur <a href="mailto:support@wattcharge.fr" style="color: #53B7A8; text-decoration: none;">support@wattcharge.fr</a>
        </p>
      </div>
    `;

    await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `⚡ Commande confirmée - WattCharge #${orderId.substring(0, 8)}`,
      html: clientEmailHtml
    });
    console.log(`[Order Processing] E-mail de confirmation envoyé au client: ${email}`);
  } catch (emailErr) {
    console.error("[Order Processing] Erreur d'envoi du mail client:", emailErr);
  }

  // 2. Envoyer l'ordre de préparation dropshipping au fournisseur (AliExpress / Sourcing)
  try {
    const supplierEmail = import.meta.env.SUPPLIER_EMAIL || 'orders@aliexpress-supplier-placeholder.com';
    const emailFrom = import.meta.env.EMAIL_FROM || 'WattCharge <noreply@wattcharge.fr>';

    // Description AliExpress spécifique au produit
    let supplierProductDesc = '';
    if (productId === 'wattcharge-home-7') {
      supplierProductDesc = '7.6KW 32A 1 phase EV Charger (Smart App Tuya version, with Type 2 5m cable, EU plug, integrated RCD DC 6mA)';
    } else if (productId === 'wattcharge-home-11') {
      supplierProductDesc = '11KW 16A 3 phase EV Charger (Smart App Tuya version, with Type 2 5m cable, EU plug, integrated RCD DC 6mA)';
    } else if (productId === 'wattcharge-pro-22') {
      supplierProductDesc = '22KW 32A 3 phase EV Charger (Smart App Tuya version, with Type 2 5m cable, EU plug, integrated RCD DC 6mA)';
    }

    const supplierEmailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; padding: 20px;">
        <h2>NEW ORDER - WattCharge.fr - #${orderId.substring(0, 8)}</h2>
        <p>Hello,</p>
        <p>Please process the following dropshipping order immediately from the <strong>European Warehouse</strong> (Spain, Poland, Germany or France) for guaranteed fast delivery.</p>
        
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Product Specifications:</h3>
          <p><strong>Item:</strong> ${supplierProductDesc}</p>
          <p><strong>CRITICAL REQUIREMENT:</strong> Must include integrated <strong>RCD DC 6mA</strong> leakage protection.</p>
          <p><strong>Quantity:</strong> 1</p>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 8px;">Shipping Address:</h3>
          <p style="margin: 0; font-size: 1.1rem; line-height: 1.5;">
            <strong>Recipient Name:</strong> ${name}<br />
            <strong>Street:</strong> ${shippingAddress.line1 || shippingAddress.street || ''}<br />
            <strong>ZIP Code / City:</strong> ${shippingAddress.postal_code || shippingAddress.postalCode || ''} ${shippingAddress.city || ''}<br />
            <strong>Country:</strong> ${shippingAddress.country || ''}<br />
            <strong>Payer Contact Email:</strong> ${email}
          </p>
        </div>

        <p>Please send us the tracking number (DHL, GLS, Chronopost, DPD, etc.) as soon as it is shipped.</p>
        <p>Best regards,<br />Logistics Team - WattCharge.fr</p>
      </div>
    `;

    await resend.emails.send({
      from: emailFrom,
      to: supplierEmail,
      subject: `[AliExpress Sourcing] New Order WattCharge - #${orderId.substring(0, 8)}`,
      html: supplierEmailHtml
    });
    console.log(`[Order Processing] E-mail dropship envoyé au fournisseur: ${supplierEmail}`);
  } catch (supplierErr) {
    console.error("[Order Processing] Erreur lors de l'envoi du mail fournisseur:", supplierErr);
  }

  return { success: true, orderId: orderId, alreadyProcessed: false };
}
