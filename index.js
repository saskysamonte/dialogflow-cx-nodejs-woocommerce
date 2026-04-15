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
        console.error('Error fetching products:', error);
        return { error: 'Error fetching products' };
    }
};

// Función para construir tarjetas visuales
const buildProductCards = (products) => {
    return products.map(product => {
        let imageUrl = '';
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].src;
        }
        
        const price = product.price ? `$${parseFloat(product.price).toLocaleString('es-CL')}` : 'Consultar precio';
        
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
    
    const parameters = req.body?.queryResult?.parameters || {};
    const searchTerm = parameters.search || '';

    try {
        const queryParams = {
            per_page: 4,
            search: searchTerm,
            orderby: 'date',
            order: 'desc'
        };
        
        const products = await fetchProducts(queryParams);
        
        if (products.length === 0) {
            res.json({
                fulfillment_response: {
                    messages: [{
                        text: { text: [`No encontré productos con "${searchTerm}". Visita https://kahiko.cl/tienda`] }
                    }]
                }
            });
            return;
        }
        
        const productCards = buildProductCards(products);
        
        res.json({
            fulfillment_response: {
                messages: [
                    {
                        text: { text: [`¡Encontré estos productos para ti!`] }
                    },
                    {
                        payload: { richContent: [productCards] }
                    }
                ]
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({
            fulfillment_response: {
                messages: [{
                    text: { text: [`Error. Visita https://kahiko.cl/tienda`] }
                }]
            }
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
