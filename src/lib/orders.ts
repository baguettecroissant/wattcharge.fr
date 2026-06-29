import { supabaseAdmin } from './supabase';
import { resend } from './resend';

interface OrderParams {
  email: string;
  name: string;
  shippingAddress: any;
  productId: string;
  installAddon: boolean;
  totalAmount: number;
  paymentId: string;
  gateway: 'stripe' | 'paypal';
}

/**
 * Enregistre une commande payée en base de données et envoie les e-mails transactionnels (Client + Fournisseur).
 */
export async function processSuccessfulOrder(params: OrderParams) {
  const { email, name, shippingAddress, productId, installAddon, totalAmount, paymentId, gateway } = params;

  // 1. Vérifier si la commande a déjà été traitée (sécurité contre les rafraîchissements de page)
  const queryField = gateway === 'stripe' ? 'stripe_session_id' : 'paypal_order_id';
  
  try {
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq(queryField, paymentId)
      .maybeSingle();

    if (existingOrder) {
      console.log(`[Order Processing] Commande déjà enregistrée (ID: ${existingOrder.id}), statut: ${existingOrder.status}`);
      return { success: true, orderId: existingOrder.id, alreadyProcessed: true };
    }
  } catch (err) {
    console.warn("[Order Processing] Impossible de vérifier l'existence de la commande, tentative d'insertion directe:", err);
  }

  // 2. Insérer la commande dans la table `orders`
  const orderPayload: any = {
    customer_email: email,
    customer_name: name,
    shipping_address: shippingAddress,
    product_id: productId,
    total_amount: totalAmount,
    install_addon: installAddon,
    install_amount: installAddon ? 450.00 : 0.00,
    status: 'paid',
  };

  if (gateway === 'stripe') {
    orderPayload.stripe_session_id = paymentId;
  } else {
    orderPayload.paypal_order_id = paymentId;
  }

  const { data: insertedOrder, error: insertError } = await supabaseAdmin
    .from('orders')
    .insert([orderPayload])
    .select('id')
    .single();

  if (insertError) {
    console.error("[Order Processing] Erreur lors de l'enregistrement de la commande Supabase:", insertError);
    throw new Error(`DB Save Failed: ${insertError.message}`);
  }

  const orderId = insertedOrder.id;
  console.log(`[Order Processing] Commande insérée avec succès. ID: ${orderId}`);

  // Déterminer le libellé du produit
  let productName = 'Borne de recharge WattCharge';
  if (productId === 'wattcharge-home-7') productName = 'Borne WattCharge Home 7.4 kW';
  else if (productId === 'wattcharge-home-11') productName = 'Borne WattCharge Home 11 kW';
  else if (productId === 'wattcharge-pro-22') productName = 'Borne WattCharge Pro 22 kW';

  // 3. Envoyer l'e-mail de confirmation au client
  try {
    const emailFrom = import.meta.env.EMAIL_FROM || 'WattCharge <noreply@wattcharge.fr>';
    
    let installationInstructions = '';
    if (installAddon) {
      installationInstructions = `
        <div style="background-color: #1e1b4b; border: 1px solid #4f46e5; border-radius: 8px; padding: 20px; margin-top: 20px;">
          <h3 style="color: #a855f7; margin-top: 0;">🛠️ Étape obligatoire : Qualification de votre installation</h3>
          <p style="color: #d1d5db; font-size: 0.95rem; margin-bottom: 12px;">
            Vous avez choisi l'option d'installation agréée IRVE. Pour préparer l'intervention de notre électricien partenaire sous 10 jours, merci de remplir votre dossier technique :
          </p>
          <a href="${import.meta.env.SITE || 'http://localhost:4321'}/checkout/success?order_id=${orderId}&formula_id=${productId}" 
             style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #030712; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            Compléter mon dossier technique
          </a>
        </div>
      `;
    }

    const clientEmailHtml = `
      <div style="background-color: #0a0e17; color: #f3f4f6; font-family: sans-serif; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 2rem;">⚡ <span style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">WattCharge</span></h1>
          <p style="color: #9ca3af;">Confirmation de paiement sécurisé</p>
        </div>
        
        <h2 style="color: #ffffff;">Merci pour votre achat !</h2>
        <p>Bonjour ${name},</p>
        <p>Votre commande a été validée avec succès. Nous préparons l'expédition de votre borne de recharge.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <th style="text-align: left; padding: 12px; color: #9ca3af;">Numéro de commande</th>
            <td style="padding: 12px; text-align: right;"><strong>${orderId}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <th style="text-align: left; padding: 12px; color: #9ca3af;">Produit</th>
            <td style="padding: 12px; text-align: right;">${productName}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <th style="text-align: left; padding: 12px; color: #9ca3af;">Option d'installation</th>
            <td style="padding: 12px; text-align: right;">${installAddon ? 'Oui (Électricien IRVE qualifié)' : 'Non (Borne seule)'}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <th style="text-align: left; padding: 12px; color: #9ca3af;">Moyen de paiement</th>
            <td style="padding: 12px; text-align: right; text-transform: uppercase;">${gateway}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 12px; color: #9ca3af;">Montant total réglé</th>
            <td style="padding: 12px; text-align: right; color: #00f2fe; font-size: 1.2rem;"><strong>${totalAmount.toFixed(2)} €</strong></td>
          </tr>
        </table>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #ffffff;">Adresse de livraison :</h3>
          <p style="color: #d1d5db; line-height: 1.5; margin: 0;">
            ${name}<br />
            ${shippingAddress.line1 || shippingAddress.street || ''}<br />
            ${shippingAddress.postal_code || shippingAddress.postalCode || ''} ${shippingAddress.city || ''}<br />
            ${shippingAddress.country || ''}
          </p>
        </div>

        ${installationInstructions}

        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
        
        <p style="font-size: 0.9rem; color: #6b7280; text-align: center;">
          Besoin d'assistance ? Répondez à ce mail ou écrivez-nous sur <a href="mailto:support@wattcharge.fr" style="color: #00f2fe; text-decoration: none;">support@wattcharge.fr</a>
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

  // 4. Envoyer l'ordre de préparation dropshipping au fournisseur (AliExpress / Sourcing)
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
