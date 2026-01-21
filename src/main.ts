import './style.css'

// Get the content container element
const contentElement = document.querySelector<HTMLDivElement>('#content')!

// Function to add content to the page
function addContent(text: string): void {
  const paragraph = document.createElement('p')
  paragraph.textContent = text
  contentElement.appendChild(paragraph)
}

// Function to add a button that adds more content
function setupButton(): void {
  const button = document.createElement('button')
  button.textContent = 'Content hinzufügen'
  button.type = 'button'
  
  button.addEventListener('click', () => {
    const timestamp = new Date().toLocaleTimeString('de-DE')
    addContent(`Neuer Inhalt hinzugefügt um ${timestamp}`)
  })
  
  contentElement.appendChild(button)
}

// Initialize the page with some content
addContent('Willkommen zu dieser Vite + TypeScript App!')
addContent('Dies ist eine einfache HTML-Seite ohne Frameworks.')
setupButton()
