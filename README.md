# Dialogflow CX Webhooks using NodeJS for WooCommerce's REST API
This repository provides an example implementation of Dialogflow CX webhooks built using Node.js. It integrates with a WooCommerce store (WordPress) to dynamically fetch product details, order statuses, and product categories during a conversation with a Dialogflow CX-powered chatbot.

The webhook listens for user intents and performs relevant API calls to WooCommerce's REST API to provide real-time data, making it possible to create highly interactive and personalized conversational experiences.

### Set Up Environment Variables
Create a .env file in the project root directory to store sensitive configuration such as API keys, WooCommerce store URL, and port number.

```
SHOP_URL=https://yourstore.com
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
PORT=4000
```

### Install Dependencies
To install the necessary packages

```
npm install
```

### Start the App
Once the dependencies are installed and the .env file is configured, start the app:

```
npm start
```

### Webhook Endpoints
<b>POST /webhook</b>

- <b>Description:</b> The main webhook endpoint that Dialogflow CX calls when a user interacts with the chatbot. It processes the user's intent and responds accordingly by querying the WooCommerce APIs.
  
- <b>Request Body: </b>The queryResult object containing user input and matched intent details from Dialogflow CX.

- <b>Response:</b> JSON response with a text message to send back to the user via Dialogflow CX.

<b>GET /products</b>

- <b>Description:</b> Fetches a list of products from the WooCommerce store. You can pass query parameters like per_page, search, category, and page.
- <b>Example Request:</b>
```
GET /products?search=shoes&category=10&page=1
```

<b>GET /products/categories</b>

- <b>Description:</b> Fetches a list of product categories from the WooCommerce store (currently a placeholder for future implementation).
- <b>Response:</b>A JSON array containing available product categories.

### Intent Handling Logic
<b>FetchProducts Intent</b>
This intent is triggered when a user asks to see products (e.g., "Show me shoes" or "Fetch products in category 10").

<b>Webhook Logic:</b>
- The webhook queries WooCommerce for products based on the user's search query or category.
- It returns a list of products, or a message saying no products were found.

<b>FetchOrderStatus Intent</b>
This intent is triggered when the user asks for the status of their order (e.g., "What is the status of order #12345?").

<b>Webhook Logic:</b>
- The webhook queries WooCommerce for the order status using the provided order ID.
- It returns the current status of the order, such as "Processing" or "Completed".

### Example Dialogflow CX Webhook Response
<b>FetchProducts Intent:</b>
```
{
  "fulfillmentText": "I found the following products: Shoe 1, Shoe 2, Shoe 3."
}
```

<b>FetchOrderStatus Intent:</b>
```
{
  "fulfillmentText": "The status of your order 12345 is: Completed."
}
```
