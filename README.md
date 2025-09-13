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

Add the card to your Lovelace dashboard:

```yaml
type: custom:trello-board
board_id: "your_board_id_here"
```

### Finding Your Board ID

1. Go to **Developer Tools** → **States**
2. Find a sensor like `sensor.trello_enhanced_[board_name]_board`  
3. Check the `board_id` attribute
4. Copy this value for your card configuration

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