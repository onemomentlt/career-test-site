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

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('customer_email', email);
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', siteUrl + '/?payment=success&session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', siteUrl + '/?payment=cancelled');
    params.append('metadata[email]', email);
    params.append('metadata[name]', name || '');
    params.append('metadata[mbtiType]', mbtiType);
    params.append('metadata[pdfFile]', pdfFile);
    params.append('metadata[paymentMethod]', paymentMethod || 'card');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stripeSecretKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: session.error?.message || 'Stripe checkout could not be created' })
      };
    }

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
