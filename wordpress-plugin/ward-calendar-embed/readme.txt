=== 40th Ward Calendar Embed ===
Contributors: 40thward
Tags: calendar, iframe, embed, events
Requires at least: 5.0
Tested up to: 6.6
Stable tag: 1.0.0
License: GPLv2 or later

Embeds the 40th Ward Community Events Calendar app on any WordPress page via a simple shortcode.

== Description ==

This plugin embeds the hosted 40th Ward calendar app (built separately, e.g. on Railway) into any
WordPress page or post using an iframe. No calendar logic runs inside WordPress itself — this is a
lightweight embed wrapper only.

== Installation ==

1. Upload the `ward-calendar-embed` folder to `/wp-content/plugins/`
2. Activate the plugin through the WordPress admin "Plugins" menu
3. Go to Settings → Ward Calendar and enter the hosted calendar app's URL
4. Add the shortcode `[ward_calendar]` to any page or post

== Shortcode ==

Basic usage:
    [ward_calendar]

Override height per-embed:
    [ward_calendar height="800px" min_height="600px"]

== Frequently Asked Questions ==

= Does this plugin store or fetch calendar data itself? =

No. It only renders an iframe pointing at the hosted calendar app's URL, which you configure under
Settings → Ward Calendar. All calendar logic, data fetching, and category management happens on the
hosted app itself.

= What if I change the calendar app's domain later? =

Update the URL under Settings → Ward Calendar — every page using the shortcode updates automatically,
no need to edit individual pages.

== Changelog ==

= 1.0.0 =
* Initial release — shortcode-based iframe embed with configurable URL and height.
