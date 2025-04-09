# Chromatic Tuner

A web-based chromatic tuner that uses your device's microphone to detect and display musical notes in real-time.

## Features

- Real-time pitch detection using the Web Audio API
- Accurate note identification and tuning display
- Visual tuning indicator with color feedback
- Responsive design that works on desktop and mobile devices
- No installation required - runs directly in your web browser

## How to Use

1. Open the tuner in a modern web browser (Chrome, Firefox, Safari, or Edge)
2. Click "Start Tuning" and allow microphone access when prompted
3. Play a note on your instrument or sing into the microphone
4. The display will show:
   - The detected frequency in Hertz
   - The closest musical note
   - How many cents the note is off from perfect tuning
   - A visual indicator showing whether you're sharp or flat

## Technical Details

The tuner uses:
- Web Audio API for audio processing
- Autocorrelation algorithm for pitch detection
- Equal temperament tuning system
- Responsive design with CSS variables for easy theming

## Browser Compatibility

This tuner works best in modern browsers that support the Web Audio API:
- Chrome 49+
- Firefox 36+
- Safari 11+
- Edge 79+

## Development

To run the project locally:
1. Clone this repository
2. Open `index.html` in your web browser
3. No build process or dependencies required

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.