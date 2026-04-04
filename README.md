# image-background-remover

AI-powered image background removal tool built with Next.js.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Create `.env.local` with:

```bash
REMOVE_BG_API_KEY=your_remove_bg_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
AUTH_SECRET=replace_with_a_long_random_string
```

## Google Login setup

In Google Cloud Console, add:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://imagebackgroundremover.asia`
- Authorized redirect URIs:
  - This project currently uses Google Identity Services on the frontend and verifies the returned credential on the backend, so no OAuth redirect URI is required for the login flow itself.

## Deployment

Set the same environment variables in your deployment platform before publishing.
