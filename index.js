

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 4000;

const apiProducts = `${process.env.SHOP_URL}/wp-json/wc/v3/products`;
const apiCategories = `${process.env.SHOP_URL}/wp-json/wc/v3/products/categories`;
const apiOrders = `${process.env.SHOP_URL}/wp-json/wc/v3/orders`;

app.use(express.json());

const fetchProducts = async (queryParams) => {
    try {
        const response = await axios.get(apiProducts, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET
            },
            params: queryParams
        });
        console.log('Fetched products:', response.data);
        return response.data;  // Return product data
    } catch (error) {
        console.error('Error fetching products:', error);
        return { error: 'Error fetching products' };
    }
};

const fetchCategories = async () => {
    try {
        const response = await axios.get(apiCategories, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new Error('Could not fetch categories');
    }
};

const fetchOrderDetails = async (orderId) => {
    try {
        const response = await axios.get(`${apiOrders}/${orderId}`, {
            auth: {
                username: process.env.CONSUMER_KEY,
                password: process.env.CONSUMER_SECRET
            }
        });
        return response.data;  // Return order details
    } catch (error) {
        console.error('Error fetching order details:', error);
        return { error: 'Error fetching order details' };
    }
};

app.get('/products', async (req, res) => {
    const queryParams = req.query;  // Query parameters passed in the request

    const products = await fetchProducts(queryParams);

    if (products.error) {
        return res.status(500).json(products);
    }

    return res.json(products);
});

app.get('/products/categories', async (req, res) => {

});

app.get('/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }

    const orderDetails = await fetchOrderDetails(orderId);
    if (orderDetails.error) {
        return res.status(500).json(orderDetails); // If there's an error fetching order details
    }
    
    res.json(orderDetails); // Send the order details as a JSON response
});

app.post('/webhook', async (req, res) => {
    const { queryResult } = req.body;

    console.log(queryResult);

    const intentName = queryResult.intent.displayName;

    try {
        if (intentName === 'FetchProducts') {
            const queryParams = {
                per_page: 10, // Limit the results to 10 products
                page: 1,      // Page number
                search: queryResult.parameters.search || '', // Search query from user input
                category: queryResult.parameters.category || '', // Category filter
                orderby: 'date',
                order: 'desc'
            };

            const products = await fetchProducts(queryParams);

            if (products.length === 0) {
                res.json({
                    fulfillmentText: 'Sorry, I couldn’t find any products matching your search.',
                });
            } else {
                const productNames = products.map((product) => product.name).join(', ');
                res.json({
                    fulfillmentText: `I found the following products: ${productNames}.`,
                });
            }
        } else if (intentName === 'FetchOrderStatus') {
            const orderId = queryResult.parameters.orderId;

            if (!orderId) {
                return res.json({
                    fulfillmentText: 'Please provide a valid order ID.',
                });
            }

            const orderDetails = await fetchOrderDetails(orderId);

            if (orderDetails.error) {
                res.json({
                    fulfillmentText: 'Sorry, I couldn\'t fetch the order details.',
                });
            } else {
                const orderStatus = orderDetails.status;
                res.json({
                    fulfillmentText: `The status of your order ${orderId} is: ${orderStatus}.`,
                });
            }
        } else {
            res.json({
                fulfillmentText: 'Sorry, I didn\'t understand that request.',
            });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.json({
            fulfillmentText: 'Sorry, something went wrong while processing your request.',
        });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});