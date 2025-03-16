const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    headerBackground: '#f0f0f0', // Helle Hintergrundfarbe für Header
    headerText: '#000', // Dunkle Textfarbe für Header
    buttonBackground: '#eee', // Helle Hintergrundfarbe für Buttons
    buttonText: '#000', // Dunkle Textfarbe für Buttons
    buttonDisabled: '#ccc',
    buttonTextDisabled: '#555',
    border: '#ccc',
    progressBar: 'blue',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    headerBackground: '#222', // Dunkle Hintergrundfarbe für Header
    headerText: '#fff', // Helle Textfarbe für Header
    buttonBackground: '#333', // Dunkle Hintergrundfarbe für Buttons
    buttonText: '#fff', // Helle Textfarbe für Buttons
    buttonDisabled: '#333',
    buttonTextDisabled: '#999',
    border: '#333',
    progressBar: 'blue',
  },
};
