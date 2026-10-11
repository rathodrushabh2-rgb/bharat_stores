# WhatsApp setup

## 1. Sending bills & reminders (works now, no setup)
On a bill, **WhatsApp** opens WhatsApp with the bill text in Hindi, ready to send to the customer.
On a customer's page, **WhatsApp याद दिलाएं** sends a payment reminder with the due amount.

## 2. Orders written by hand (works now)
**More → WhatsApp orders → Add order manually**: paste or type an order you received, then tap
**Make bill**. If the phone number matches a saved customer, the customer is filled in automatically.

## 3. Receiving WhatsApp orders automatically (optional, needs Meta setup)
This uses the official **WhatsApp Business Cloud API** (free for messages customers send to you).
The shop needs a phone number that is **not** already used in the normal WhatsApp / WhatsApp Business app.

1. Go to <https://developers.facebook.com/apps>, then **Create app → Business**, and add the **WhatsApp** product.
2. Under WhatsApp → API Setup, add and verify the shop's phone number.
3. In **App settings → Basic**, copy the **App Secret**.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `WHATSAPP_VERIFY_TOKEN`: any long random word you make up
   - `WHATSAPP_APP_SECRET`: the App Secret from step 3
   Then redeploy.
5. In WhatsApp → Configuration → Webhook:
   - Callback URL: `https://<your-app>.vercel.app/api/whatsapp/webhook`
   - Verify token: the same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **messages** field.

New messages now appear in **More → WhatsApp orders** with a red badge.
Each request is checked with the App Secret signature, so nobody else can post fake orders.
