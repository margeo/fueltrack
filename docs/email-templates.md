# Supabase Email Templates

Go to **Supabase Dashboard** > **Authentication** > **Email Templates**

## 1. Confirm Signup

**Subject:** Welcome to FuelTrack! Confirm your email

**Body:**
```html
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#863bff;padding:32px 24px;text-align:center">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="38" fill="none" viewBox="0 0 48 46" style="display:inline-block;vertical-align:middle"><path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
    <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:8px">FuelTrack</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px">Plan → Track → Achieve!</div>
  </div>
  <div style="padding:32px 24px;text-align:center">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Welcome! 🎉</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      Thanks for signing up for FuelTrack. Please confirm your email address to get started.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#863bff;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
      Confirm Email
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;line-height:1.5">
      If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <span style="color:#9ca3af;font-size:11px">© {{ .SiteURL }} — FuelTrack</span>
  </div>
</div>
```

## 2. Reset Password

**Subject:** Reset your FuelTrack password

**Body:**
```html
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#863bff;padding:32px 24px;text-align:center">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="38" fill="none" viewBox="0 0 48 46" style="display:inline-block;vertical-align:middle"><path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
    <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:8px">FuelTrack</div>
  </div>
  <div style="padding:32px 24px;text-align:center">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Reset your password 🔑</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#863bff;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
      Reset Password
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;line-height:1.5">
      If you didn't request this, you can safely ignore this email. Your password won't change.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <span style="color:#9ca3af;font-size:11px">© {{ .SiteURL }} — FuelTrack</span>
  </div>
</div>
```

## 3. Magic Link

**Subject:** Your FuelTrack login link

**Body:**
```html
<div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#863bff;padding:32px 24px;text-align:center">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="38" fill="none" viewBox="0 0 48 46" style="display:inline-block;vertical-align:middle"><path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
    <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:8px">FuelTrack</div>
  </div>
  <div style="padding:32px 24px;text-align:center">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Your login link ✨</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      Click the button below to sign in to your FuelTrack account.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#863bff;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">
      Sign In
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;line-height:1.5">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <span style="color:#9ca3af;font-size:11px">© {{ .SiteURL }} — FuelTrack</span>
  </div>
</div>
```
