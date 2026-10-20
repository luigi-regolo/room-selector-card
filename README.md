# Room Selector Card

[![TikTok | Follow](assets/tiktok-segui.svg)](https://www.tiktok.com/@luigi.regolo)
[![License: GPL-3.0-only](https://img.shields.io/badge/license-GPL--3.0--only-blue?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/luigi-regolo/room-selector-card?style=flat-square)](https://github.com/luigi-regolo/room-selector-card/stargazers)

## Overview

**Room Selector Card** is a custom Home Assistant dashboard card designed to provide room selection and a compact overview of active smart home devices.

Its minimalist interface follows the Edera visual style, with responsive layouts, rounded surfaces, and native Home Assistant Material Design Icons.

**Current development version: 0.1.**

## Features

- **Room selection:** Switch between available options from an existing `input_select` or `select` entity.
- **Active indicators:** Display configured lights, heating, alarm, and washing machine indicators only when active.
- **Room icons:** Assign configurable `mdi:` icons to individual rooms.
- **Detail popup:** Open a compact panel showing configured device information.
- **Device controls:** Optionally turn off configured active lights and compatible heating devices, with confirmation.
- **Native controls:** Open Home Assistant entity details for alarm and washing machine management.
- **Energy information:** Optionally display monthly energy consumption from a configured sensor.
- **Visual editor:** Configure entities, appearance, and optional controls without writing YAML.
- **Edera appearance:** Automatic, Light, and Dark themes.
- **Responsive layout:** Designed for desktop, tablet, and smartphone dashboards.

Available features depend on the configured Home Assistant entities and integrations.

## Installation

### Manual installation

1. Download `dist/room-selector-card.js` from this repository.
2. Copy the file to the `www` directory of your Home Assistant configuration.
3. Open **Settings → Dashboards → Resources**.
4. Add `/local/room-selector-card.js` as a **JavaScript module**.
5. Reload the dashboard and add **Room Selector Card**.

## Configuration and Usage

Configure the card through the Home Assistant visual dashboard editor.

Select an existing `input_select` or `select` entity containing the available room names.

Optionally configure lights, climate entities, an alarm entity, a washing machine status entity, and a monthly energy sensor.

The card uses the selected entity to change the current room. Existing dashboard visibility conditions or automations can continue using that entity.

### Optional controls

Device commands are disabled by default.

When explicitly enabled, supported light and heating controls require confirmation before execution.

Alarm and washing machine operations use the native Home Assistant entity interface.

## Compatibility and Requirements

- Home Assistant with support for custom dashboard cards.
- An existing `input_select` or `select` entity.
- Compatible entities for optional indicators and controls.
- No additional JavaScript libraries or external cloud services.

Home Assistant interface compatibility testing is still pending.

## Copyright & License

Copyright © 2026 luigi-regolo.

Original project created and maintained by luigi-regolo.

Licensed under the **GNU General Public License version 3 only (GPL-3.0-only)**. See [LICENSE](LICENSE) for the complete terms.
