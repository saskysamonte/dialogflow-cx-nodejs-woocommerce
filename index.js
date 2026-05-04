require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 4000;

const apiProducts = `${process.env.SHOP_URL}/wp-json/wc/v3/products`;

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

        console.log('Fetched products:', response.data.length);
        return response.data;

    } catch (error) {
        console.error('Error fetching products:', error.message);
        return [];
    }
};

const buildProductCards = (products) => {
    return products.map(product => {
        const imageUrl = product.images?.[0]?.src || '';

        const price = product.price
            ? `$${parseFloat(product.price).toLocaleString('en-US')}`
            : 'Check price';

        return {
            type: "info",
            title: product.name,
            subtitle: price,
            image: { rawUrl: imageUrl },
            anchor: { href: product.permalink }
        };
    });
};

app.get('/products', async (req, res) => {
    const products = await fetchProducts(req.query);
    res.json(products);
});

app.post('/webhook', async (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    const searchTerm = req.body?.queryResult?.parameters?.search || '';
    console.log('Search term:', searchTerm);

    try {
        const queryParams = {
            per_page: 4,
            search: searchTerm,
            orderby: 'date',
            order: 'desc'
        };

        const products = await fetchProducts(queryParams);
        console.log('Products found:', products.length);

        if (!products || products.length === 0) {
            return res.json({
                fulfillment_response: {
                    messages: [{
                        text: {
                            text: [`No products found for "${searchTerm}". Visit ${STORE_URL}`]
                        }
                    }]
                }
            });
        }

        // Build visual cards
        const productCards = buildProductCards(products);

        // Build product list text
        const productListText = products
            .map(p => `• ${p.name} - ${p.price ? '$' + p.price : 'Check price'}`)
            .join('\n');

        return res.json({
            fulfillment_response: {
                messages: [
                    {
                        text: {
                            text: [
                                `I found these products for you!\n\n${productListText}\n\nCheck the cards to see images.`
                            ]
                        }
                    },
                    {
                        payload: { richContent: [productCards] }
                    }
                ]
            }
        });

    } catch (error) {
        console.error('Error:', error.message);

        return res.json({
            fulfillment_response: {
                messages: [{
                    text: {
                        text: [`An error occurred. Visit ${STORE_URL}`]
                    }
                }]
            }
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});