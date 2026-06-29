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
    const { productId } = await request.json();
    
    if (!productId || !PRODUCTS_MAP[productId]) {
      return new Response(JSON.stringify({ error: 'Produit invalide ou manquant.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const productDetails = PRODUCTS_MAP[productId];
    const origin = new URL(request.url).origin;

    // Préparation des lignes d'articles pour Stripe Checkout
    const line_items: any[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: productDetails.name,
            description: productDetails.description,
            images: [`${origin}/images/charger.png`],
          },
          unit_amount: Math.round(productDetails.price * 100),
        },
        quantity: 1,
      }
    ];

    // Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'LU', 'CH'],
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&formula_id=${productId}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        productId: productId,
        installAddon: 'false',
        formule: productId.includes('22') ? 'pro' : 'home'
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
