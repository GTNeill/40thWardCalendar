# WPCalendarCats — WordPress Installation Guide

**For:** WordPress site administrators
**Plugin:** WPCalendarCats v1.0.0
**What it does:** Embeds the 40th Ward community events calendar into any WordPress page or post via a shortcode.

---

## What you're installing

WPCalendarCats adds a `[wpcalendarcats]` shortcode that embeds the live calendar app in an iframe. The embed shows only the calendar itself — search bar, category filter chips, week/month toggle, and the cards/timeline view switch — with the calendar app's own site branding (its header logo and footer) removed, so it fits cleanly inside your WordPress page's own design.

The embed automatically resizes to fit its content, so you won't see a scrollbar or a big empty gap — no manual height tuning needed for most use cases.

---

## 1. Get the plugin files

You'll receive one of the following:

- `wpcalendarcats.zip` — ready to upload as-is, **or**
- a `wpcalendarcats/` folder — zip it yourself before uploading (skip if already zipped)

Do not unzip it yourself if installing via the WordPress admin — WordPress unzips it for you in the next step.

---

## 2. Install the plugin

**Option A — Upload via WordPress admin (recommended)**

1. Log in to the WordPress admin dashboard.
2. Go to **Plugins → Add New → Upload Plugin**.
3. Choose the `wpcalendarcats.zip` file and click **Install Now**.
4. Once installed, click **Activate Plugin**.

**Option B — Manual upload via FTP/SFTP**

1. Unzip `wpcalendarcats.zip` locally.
2. Upload the resulting `wpcalendarcats` folder to `/wp-content/plugins/` on your server.
3. In the WordPress admin, go to **Plugins**, find **WPCalendarCats**, and click **Activate**.

---

## 3. Configure the calendar URL

1. In the WordPress admin, go to **Settings → WPCalendarCats**.
2. Enter the **Calendar App URL** — the live URL where the calendar app is hosted (you'll be given this URL separately; it may change if the app moves to a new domain later).
3. Optionally adjust the **Default Height** — this is just the *initial* iframe height before it auto-resizes; 1000px works well for most pages.
4. Click **Save Changes**.

> **If the calendar app's URL ever changes** (e.g. it moves to a new domain), just update it here — every page using the shortcode updates automatically. No need to edit individual pages.

---

## 4. Add the calendar to a page

Edit any WordPress page or post and add:

```
[wpcalendarcats]
```

Publish or update the page — the calendar will appear embedded at that spot.

### Optional shortcode settings

You can override the settings-page defaults for a single embed:

| Attribute   | Purpose                                            | Example                     |
|-------------|-----------------------------------------------------|------------------------------|
| `url`       | Use a different calendar URL just for this embed     | `url="https://calendar2.example.com/"` |
| `height`    | Set a different initial height (px)                  | `height="800"`               |
| `max_width` | Cap how wide the embed can grow (px)                 | `max_width="1100"`           |

Example combining all three:

```
[wpcalendarcats url="https://calendar.example.com/" height="900" max_width="1100"]
```

---

## 5. Verify it's working

Visit the published page. You should see:

- A search bar and category filter chips
- Week/Month and Cards/Calendar toggle buttons
- The events themselves, laid out as cards or a timeline

You should **not** see the calendar app's own page title/logo bar or its footer — those are intentionally hidden in this embed.

If you see a red notice instead saying no calendar URL is configured, go back to **Settings → WPCalendarCats** and double-check the URL was saved.

---

## Troubleshooting

**The embed is blank / shows an error in the iframe.**
Confirm the Calendar App URL in Settings → WPCalendarCats is correct and reachable — open it directly in a browser tab to check.

**The embed height looks wrong (too short, scrollbar appears, or a big gap below it).**
This should resolve itself within a second as the auto-resize script runs. If it persists, check your browser's developer console for JavaScript errors — some page builders or caching/minification plugins can interfere with the resize script. Try excluding this page from JS minification/combination if that happens.

**I added the shortcode twice on one page — will they conflict?**
No. Each embed resizes independently; you can have multiple `[wpcalendarcats]` shortcodes on the same page.

**Do I need to keep the calendar app itself running for this to work?**
Yes — the plugin only embeds it; the calendar data and logic all live on the hosted app, not inside WordPress.

---

## Support

For issues with the plugin itself (install/shortcode/settings), contact the WordPress site administrator's usual support contact. For issues with the calendar app's content or data (wrong events, wrong categories), contact whoever manages the calendar app directly.
