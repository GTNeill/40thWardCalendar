<?php
/**
 * Plugin Name: 40th Ward Calendar Embed
 * Description: Embeds the 40th Ward Community Events Calendar (hosted app) via shortcode, e.g. [ward_calendar]. Configure the calendar URL under Settings → Ward Calendar.
 * Version: 1.0.0
 * Author: 40th Ward
 * License: GPL v2 or later
 * Text Domain: ward-calendar-embed
 */

if (!defined('ABSPATH')) {
    exit; // No direct access.
}

define('WCE_OPTION_URL', 'wce_calendar_url');
define('WCE_OPTION_HEIGHT', 'wce_calendar_height');
define('WCE_OPTION_MIN_HEIGHT', 'wce_calendar_min_height');

/**
 * ── Settings page ──────────────────────────────────────────────────────────
 */
add_action('admin_menu', function () {
    add_options_page(
        'Ward Calendar Settings',
        'Ward Calendar',
        'manage_options',
        'ward-calendar-embed',
        'wce_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('wce_settings_group', WCE_OPTION_URL, [
        'sanitize_callback' => 'esc_url_raw',
        'default' => '',
    ]);
    register_setting('wce_settings_group', WCE_OPTION_HEIGHT, [
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '100vh',
    ]);
    register_setting('wce_settings_group', WCE_OPTION_MIN_HEIGHT, [
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '900px',
    ]);
});

function wce_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $url = get_option(WCE_OPTION_URL, '');
    $height = get_option(WCE_OPTION_HEIGHT, '100vh');
    $min_height = get_option(WCE_OPTION_MIN_HEIGHT, '900px');
    ?>
    <div class="wrap">
        <h1>Ward Calendar Settings</h1>
        <p>Configure the hosted calendar app URL. Once set, use the shortcode <code>[ward_calendar]</code> on any page or post to embed it.</p>
        <form method="post" action="options.php">
            <?php settings_fields('wce_settings_group'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="<?php echo esc_attr(WCE_OPTION_URL); ?>">Calendar App URL</label></th>
                    <td>
                        <input type="url" id="<?php echo esc_attr(WCE_OPTION_URL); ?>" name="<?php echo esc_attr(WCE_OPTION_URL); ?>"
                               value="<?php echo esc_attr($url); ?>" class="regular-text"
                               placeholder="https://calendar.40thward.org" />
                        <p class="description">The public URL where the calendar app is hosted (e.g. your Railway deployment or custom domain).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="<?php echo esc_attr(WCE_OPTION_HEIGHT); ?>">Iframe Height</label></th>
                    <td>
                        <input type="text" id="<?php echo esc_attr(WCE_OPTION_HEIGHT); ?>" name="<?php echo esc_attr(WCE_OPTION_HEIGHT); ?>"
                               value="<?php echo esc_attr($height); ?>" class="regular-text"
                               placeholder="100vh" />
                        <p class="description">CSS height value, e.g. <code>100vh</code>, <code>900px</code>, or <code>85vh</code>.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="<?php echo esc_attr(WCE_OPTION_MIN_HEIGHT); ?>">Minimum Height</label></th>
                    <td>
                        <input type="text" id="<?php echo esc_attr(WCE_OPTION_MIN_HEIGHT); ?>" name="<?php echo esc_attr(WCE_OPTION_MIN_HEIGHT); ?>"
                               value="<?php echo esc_attr($min_height); ?>" class="regular-text"
                               placeholder="900px" />
                        <p class="description">Ensures the calendar doesn't get squeezed too short on small screens.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <?php if (!empty($url)) : ?>
            <h2>Preview</h2>
            <?php echo do_shortcode('[ward_calendar]'); ?>
        <?php else : ?>
            <p><em>Enter a Calendar App URL above and save to preview the embed here.</em></p>
        <?php endif; ?>
    </div>
    <?php
}

/**
 * ── Shortcode: [ward_calendar] ────────────────────────────────────────────
 * Optional attributes override the saved settings for a single embed:
 *   [ward_calendar height="800px" min_height="600px"]
 */
add_shortcode('ward_calendar', function ($atts) {
    $atts = shortcode_atts([
        'height' => get_option(WCE_OPTION_HEIGHT, '100vh'),
        'min_height' => get_option(WCE_OPTION_MIN_HEIGHT, '900px'),
    ], $atts, 'ward_calendar');

    $url = get_option(WCE_OPTION_URL, '');

    if (empty($url)) {
        if (current_user_can('manage_options')) {
            return '<p style="padding:16px;border:1px solid #d63638;background:#fcf0f1;color:#d63638;">' .
                'Ward Calendar: no URL configured. Set it under <a href="' . esc_url(admin_url('options-general.php?page=ward-calendar-embed')) . '">Settings &rarr; Ward Calendar</a>.' .
                '</p>';
        }
        return '';
    }

    $height = esc_attr($atts['height']);
    $min_height = esc_attr($atts['min_height']);
    $src = esc_url($url);

    return sprintf(
        '<div class="wce-calendar-wrap" style="width:100%%;">' .
        '<iframe src="%s" title="40th Ward Community Events Calendar" ' .
        'style="width:100%%;height:%s;min-height:%s;border:none;display:block;" ' .
        'loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' .
        '</div>',
        $src,
        $height,
        $min_height
    );
});
