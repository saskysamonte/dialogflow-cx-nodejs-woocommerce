require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 4000;

const apiProducts = `${process.env.SHOP_URL}/wp-json/wc/v3/products`;
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
        console.log('Fetched products:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('Error fetching products:', error);
        return { error: 'Error fetching products' };
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
        return response.data;
    } catch (error) {
        console.error('Error fetching order details:', error);
        return { error: 'Error fetching order details' };
    }
};

app.get('/products', async (req, res) => {
    const queryParams = req.query;
    const products = await fetchProducts(queryParams);
    if (products.error) {
        return res.status(500).json(products);
    }
    return res.json(products);
});

app.get('/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }
    const orderDetails = await fetchOrderDetails(orderId);
    if (orderDetails.error) {
        return res.status(500).json(orderDetails);
    }
    res.json(orderDetails);
});

app.post('/webhook', async (req, res) => {
    const { queryResult } = req.body;
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    
    const intentName = queryResult?.intent?.displayName || 'Default';
    const parameters = queryResult?.parameters || {};
    const searchTerm = parameters.search || '';
    const orderId = parameters.orderId || '';
    
    console.log('Intent:', intentName, 'Search:', searchTerm, 'OrderId:', orderId);

    try {
        // Buscar productos por término de búsqueda
        if (searchTerm) {
            const queryParams = {
                per_page: 5,
                search: searchTerm,
                orderby: 'date',
                order: 'desc'
            };
            
            const products = await fetchProducts(queryParams);
            
            if (products.length === 0) {
                res.json({
                    fulfillmentText: `Lo siento, no encontré productos que coincidan con "${searchTerm}". ¿Te gustaría que te muestre nuestras categorías principales? Tenemos muebles para living, comedor, dormitorio y hermosas cortinas.`
                });
            } else {
                const productList = products.map(p => `• ${p.name} - ${p.price ? '$' + p.price : 'Consultar precio'}`).join('\n');
                res.json({
                    fulfillmentText: `¡Encontré estos productos para ti! Aquí están los más recientes que coinciden con "${searchTerm}":\n\n${productList}\n\n¿Te gustaría ver más detalles de alguno? Puedes visitar nuestra tienda en ${process.env.SHOP_URL}/tienda`
                });
            }
        }
        // Buscar estado de pedido
        else if (orderId) {
            const orderDetails = await fetchOrderDetails(orderId);
            
            if (orderDetails.error) {
                res.json({
                    fulfillmentText: `Lo siento, no pude encontrar el pedido #${orderId}. Por favor verifica el número e inténtalo de nuevo.`
                });
            } else {
                const statusMap = {
                    'pending': 'Pendiente de pago',
                    'processing': 'En proceso',
                    'on-hold': 'En espera',
                    'completed': 'Completado',
                    'cancelled': 'Cancelado',
                    'refunded': 'Reembolsado',
                    'failed': 'Fallido'
                };
                const status = statusMap[orderDetails.status] || orderDetails.status;
                res.json({
                    fulfillmentText: `El pedido #${orderId} se encuentra: ${status}. Fecha del pedido: ${orderDetails.date_created ? new Date(orderDetails.date_created).toLocaleDateString('es-CL') : 'No disponible'}. Total: $${orderDetails.total || 'N/A'}`
                });
            }
        }
        // Sin parámetros específicos
        else {
            const queryParams = {
                per_page: 5,
                orderby: 'date',
                order: 'desc'
            };
            
            const products = await fetchProducts(queryParams);
            
            if (products.length === 0) {
                res.json({
                    fulfillmentText: `¡Hola! Soy el asistente de Kāhiko Home. Actualmente no tengo productos para mostrar, pero puedes visitar nuestra tienda en ${process.env.SHOP_URL}/tienda para ver todo nuestro catálogo de muebles y cortinas premium.`
                });
            } else {
                const productList = products.map(p => `• ${p.name} - $${p.price || 'Consultar'}`).join('\n');
                res.json({
                    fulfillmentText: `¡Bienvenido a Kāhiko Home! Estos son algunos de nuestros productos destacados:\n\n${productList}\n\n¿Buscas algo en específico? Puedes decirme "busco muebles para living" o "quiero ver cortinas roller".`
                });
            }
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.json({
            fulfillmentText: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde o visita nuestra tienda en ' + process.env.SHOP_URL
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Connected to WooCommerce at: ${process.env.SHOP_URL}`);
});
