const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, name, mbtiType, pdfFile, paymentMethod } = JSON.parse(event.body || '{}');

    if (!email || !email.includes('@')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Valid email is required' }) };
    }

    if (!mbtiType || !pdfFile) {
      return { statusCode: 400, body: JSON.stringify({ error: 'MBTI result and PDF file are required' }) };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const siteUrl = process.env.SITE_URL || 'https://elegant-valkyrie-dd2c71.netlify.app';

    if (!stripeSecretKey || !priceId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe environment variables are missing' }) };
    }

    const stripe = Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: siteUrl + '/?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: siteUrl + '/?payment=cancelled',
      metadata: {
        email,
        name: name || '',
        mbtiType,
        pdfFile,
        paymentMethod: paymentMethod || 'card'
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
