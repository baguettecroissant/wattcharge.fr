import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';

export const prerender = false;

const PRODUCTS_MAP: Record<string, { name: string; price: number; description: string }> = {
  'wattcharge-home-7': {
    name: 'WattCharge Home 7.4',
    price: 389.00,
    description: 'Borne de recharge 7.4kW monophasée connectée WiFi'
  },
  'wattcharge-home-11': {
    name: 'WattCharge Home 11',
    price: 449.00,
    description: 'Borne de recharge 11kW triphasée connectée WiFi'
  },
  'wattcharge-pro-22': {
    name: 'WattCharge Pro 22',
    price: 489.00,
    description: 'Borne de recharge 22kW triphasée connectée WiFi'
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const items = body.items || (body.productId ? [{ id: body.productId, quantity: 1 }] : []);
    const promoCode = body.promoCode;

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'Panier vide ou invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const origin = new URL(request.url).origin;
    const line_items: any[] = [];

    for (const item of items) {
      const productDetails = PRODUCTS_MAP[item.id];
      if (!productDetails) {
        return new Response(JSON.stringify({ error: `Produit ${item.id} inconnu.` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let price = productDetails.price;
      if (promoCode === 'WATT10') {
        price = price * 0.9;
      }

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: productDetails.name + (promoCode === 'WATT10' ? ' (Promo WATT10)' : ''),
            description: productDetails.description,
            images: [`${origin}/images/charger.png`],
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      });
    }

    // Ajout des frais de port fixes de 30 €
    line_items.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Livraison Standard',
          description: 'Expédition sécurisée par DHL / GLS',
        },
        unit_amount: 3000,
      },
      quantity: 1,
    });

    const firstProduct = items[0].id;

    // Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'LU', 'CH'],
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&formula_id=${firstProduct}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        items: JSON.stringify(items),
        installAddon: 'false',
        promoCode: promoCode || ''
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur Stripe Checkout Session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
