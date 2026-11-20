let latestRequest = 0;
document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  const request = ++latestRequest;
  const result = document.querySelector('#result');
  const input = document.querySelector('#celsius').value;
  try {
    const response = await fetch('/api/convert?celsius=' + encodeURIComponent(input));
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    if (request === latestRequest) result.textContent = data.fahrenheit + ' °F';
  } catch (error) {
    if (request === latestRequest) result.textContent = error.message;
  }
});
