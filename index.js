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
        return [];
    }
};

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
                        text: { text: [`No encontré productos con "${searchTerm}". Visita https://kahiko.cl/tienda`] }
                    }]
                }
            });
        }
        
        // Crear las tarjetas visuales
        const productCards = buildProductCards(products);
        
        // Crear lista de nombres de productos para el mensaje de texto
        const productListText = products.map(p => `• ${p.name} - ${p.price ? '$' + p.price : 'Consultar'}`).join('\n');

        return res.json({
            fulfillment_response: {
                messages: [
                    {
                        text: { 
                            text: [`¡Encontré estos productos para ti!\n\n${productListText}\n\nMira las tarjetas para ver las imágenes.`] 
                        }
                    },
                    {
                        payload: { richContent: [productCards] }
                    }
                ]
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        return res.json({
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
