# George's Calendar — Design System

## Brand
- App name: George's Calendar
- Audience: personal, single-user
- Vibe: editorial dark dashboard — clean, minimal, high contrast

## Colors
```
bg:           #0A0A0A   (page background)
surface:      #141414   (cards, panels)
surface-alt:  #1C1C1C   (hover states, inset areas)
border:       #2A2A2A
text-primary: #F0F0F0
text-muted:   #5A5A5A
accent:       #C8A96E   (gold — dates, headings, active states)
```

## Category Colors (left border accents)
```
40th Ward:    #5b8dee  (blue)
Elections:    #3b82f6  (bright blue)
HOA:          #818cf8  (indigo)
Recovery:     #e89a3a  (amber)
Health:       #56c596  (teal green)
Photography:  #C8A96E  (gold)
Learning:     #34d399  (emerald)
Finance:      #60a5fa  (sky blue)
Social:       #d96b8f  (pink)
Family:       #a78bfa  (violet)
Other:        #5A5A5A  (muted)
```

## Typography
- Display/Headers: `'Playfair Display', Georgia, serif` — used for app title
- Body/UI: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- Monospace: system mono (times/dates in timeline)
- Scale: 11px labels → 13px body → 16px subheads → 24px display

## Layout
- Max width: 1200px, centered
- Gutter: 24px sides, 32px top
- Card grid: `auto-fill, minmax(300px, 1fr)`, 20px gap
- Timeline: horizontal scroll, 1 column per day, events stacked vertically per day

## Components
- **Category Card**: dark surface, 3px colored left border, header with icon + label + count badge
- **Event Row**: date number (gold) + month label left, title + time + location right
- **TODAY badge**: gold filled, uppercase, 10px
- **Tab Switcher**: two tabs (Cards / Timeline), pill indicator, muted inactive
- **Timeline Day Column**: date header (day number + weekday), event chips below color-coded by category
- **Event Chip (timeline)**: small pill, category color bg at 20% opacity, colored left micro-border, truncated title

## Motion
- Tab switch: 150ms fade + slight translate
- Card hover: background lighten, no transform
- Auto-refresh: silent background refetch every 5 min, no flash

## UX Patterns
- Loading: skeleton shimmer on cards
- Empty category: hidden (no empty cards shown)
- Error: simple inline error state with retry button
- Timezone: always America/Chicago
