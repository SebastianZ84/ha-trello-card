# Trello Board Card

A custom Lovelace card to display Trello boards with drag & drop functionality in Home Assistant.

## Features

- 📋 **Interactive Kanban Board**: Visual board display with lists and cards
- 🖱️ **Drag & Drop**: Move cards between lists by dragging
- ➕ **Card Creation**: Add new cards with + buttons
- 🎨 **Theme Integration**: Matches your Home Assistant theme
- 🔄 **Real-time Updates**: Changes sync with Trello automatically

## Prerequisites

This card requires the **Trello Enhanced** integration to be installed and configured:
- Install from HACS: [Trello Enhanced Integration](https://github.com/SebastianZ84/ha-trello)
- Configure with your Trello API credentials
- Select boards to monitor

## Installation

### Via HACS (Recommended)
1. Add this repository as a custom repository in HACS
2. Install "Trello Board Card" 
3. Add the card to your dashboard

### Manual Installation
1. Download `ha-trello-card.js` and `ha-trello-card-editor.js`
2. Copy to `/config/www/community/ha-trello-card/`
3. Add to Lovelace resources:
```yaml
resources:
  - url: /local/community/ha-trello-card/ha-trello-card.js
    type: module
```

## Configuration

### Basic Configuration

```yaml
type: custom:trello-board
entity_id: "sensor.trello_board_your_board_name"
```

### Full Configuration Options

```yaml
type: custom:trello-board
entity_id: "sensor.trello_board_your_board_name"  # Recommended
show_header: true              # Show/hide board title header
show_card_counts: true         # Show/hide card count badges
card_background: "rgba(0,0,0,0.1)"  # Custom background color
card_transparency: 0.9         # Card transparency (0-1)
styles:                        # Custom styling for elements
  card:
    - background: "linear-gradient(45deg, #1e3c72, #2a5298)"
    - border-radius: "15px"
  board_title:
    - font-size: "28px"
    - font-weight: "800"
    - color: "var(--primary-color)"
  trello_card:
    - background: "rgba(255,255,255,0.1)"
    - border: "1px solid rgba(255,255,255,0.2)"
    - backdrop-filter: "blur(10px)"
  list_column:
    - background: "rgba(0,0,0,0.3)"
    - border-radius: "12px"
```

### Finding Your Board Entity

**Recommended Method (Entity ID):**
1. Go to **Developer Tools** → **States**
2. Find a sensor like `sensor.trello_board_[board_name]`  
3. Copy the full entity ID (e.g., `sensor.trello_board_my_project`)
4. Use this as `entity_id` in your card configuration

**Legacy Method (Board ID):**
1. In Developer Tools → States, find your Trello sensor
2. Check the `board_id` attribute  
3. Copy this value for `board_id` configuration (not recommended)

## Styling Options

### Available Elements for Styling

| Element | Description | Example |
|---------|-------------|---------|
| `card` | The entire card container | Background, borders, shadows |
| `board_container` | Main board content area | Padding, background |
| `board_header` | Board title header section | Display, margins |
| `board_title` | Board title text | Font size, color, weight |
| `board_lists` | Container for all lists | Spacing, overflow |
| `list_column` | Individual list columns | Background, borders, width |
| `list_header` | List header with title/count | Styling, alignment |
| `list_title` | List title text | Font styling |
| `card_count` | Card count badges | Colors, borders, size |
| `trello_card` | Individual cards | Background, hover effects |
| `card_title` | Card title text | Typography |
| `card_description` | Card description text | Color, size |
| `add_card_btn` | Add card buttons | Colors, hover states |

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity_id` | string | *recommended* | Home Assistant Trello board entity ID |
| `board_id` | string | *legacy* | Trello board ID (use entity_id instead) |
| `show_header` | boolean | `true` | Show board title header |
| `show_card_counts` | boolean | `true` | Show card count badges |
| `card_background` | string | `''` | Custom background color/image |
| `card_transparency` | number | `1` | Card opacity (0-1) |
| `styles` | object | `{}` | Custom CSS styles for elements |

### Style Format

Styles support both object and array formats:

```yaml
# Object format
styles:
  trello_card:
    background: "rgba(255,255,255,0.1)"
    border-radius: "8px"

# Array format (like Mushroom cards)
styles:
  board_title:
    - font-size: "24px"
    - font-weight: "bold"
    - color: "var(--primary-color)"
```

### Example Themes

#### Glass Theme
```yaml
type: custom:trello-board
entity_id: "sensor.trello_board_your_board"
card_background: "rgba(0,0,0,0.1)"
card_transparency: 0.9
styles:
  list_column:
    - background: "rgba(255,255,255,0.1)"
    - backdrop-filter: "blur(10px)"
    - border: "1px solid rgba(255,255,255,0.2)"
  trello_card:
    - background: "rgba(255,255,255,0.05)"
    - backdrop-filter: "blur(5px)"
```

#### Dark Theme
```yaml
type: custom:trello-board
entity_id: "sensor.trello_board_your_board"
styles:
  card:
    - background: "#1a1a1a"
  list_column:
    - background: "#2d2d2d"
    - border: "1px solid #404040"
  board_title:
    - color: "#ffffff"
```

#### Minimal Theme
```yaml
type: custom:trello-board
entity_id: "sensor.trello_board_your_board"
show_header: false
show_card_counts: false
styles:
  list_column:
    - background: "transparent"
    - border: "none"
  trello_card:
    - box-shadow: "none"
    - border: "1px solid var(--divider-color)"
```

## Usage

- **Drag cards** between lists to move them
- **Click +** button to add new cards to any list
- **View card details** including descriptions and due dates
- **Real-time sync** with your Trello board

## Troubleshooting

**Card not loading?**
- Ensure Trello Enhanced integration is installed and working
- Verify the board_id is correct
- Check browser console for JavaScript errors
- Clear browser cache and restart Home Assistant

**Drag & drop not working?**
- Make sure you have write permissions to the Trello board
- Check that the integration services are available
- Verify internet connection to Trello API

## Support

This card works with the [Trello Enhanced](https://github.com/SebastianZ84/ha-trello) integration.

For issues:
- Check the integration logs in Home Assistant
- Verify Trello API credentials and permissions
- Ensure board_id matches an active Trello board