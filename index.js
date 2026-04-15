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

// Función para construir tarjetas visuales de productos
const buildProductCards = (products) => {
    const cards = products.map(product => {
        // Obtener la imagen del producto
        let imageUrl = '';
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0].src;
        }
        
        // Formatear precio
        const price = product.price ? `$${parseFloat(product.price).toLocaleString('es-CL')}` : 'Consultar precio';
        
        // Crear tarjeta
        return {
            type: "info",
            title: product.name,
            subtitle: price,
            image: {
                rawUrl: imageUrl
            },
            anchor: {
                href: product.permalink
            }
        };
    });
    
    return cards;
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
    
    const parameters = queryResult?.parameters || {};
    const searchTerm = parameters.search || '';
    const orderId = parameters.orderId || '';
    
    console.log('Search:', searchTerm, 'OrderId:', orderId);

    try {
        // Buscar productos por término de búsqueda
        if (searchTerm) {
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
                            text: {
                                text: [`Lo siento, no encontré productos que coincidan con "${searchTerm}". ¿Te gustaría que te muestre nuestras categorías principales? Tenemos muebles para living, comedor, dormitorio y hermosas cortinas.`]
                            }
                        }]
                    }
                });
            } else {
                const productCards = buildProductCards(products);
                
                res.json({
                    fulfillment_response: {
                        messages: [
                            {
                                text: {
                                    text: [`¡Encontré estos productos para ti! Aquí están los que coinciden con "${searchTerm}":`]
                                }
                            },
                            {
                                payload: {
                                    richContent: [productCards]
                                }
                            },
                            {
                                text: {
                                    text: [`¿Te gustaría ver más detalles de alguno? Haz clic en la tarjeta para ir al producto.`]
                                }
                            }
                        ]
                    }
                });
            }
        }
        // Buscar estado de pedido
        else if (orderId) {
            const orderDetails = await fetchOrderDetails(orderId);
            
            if (orderDetails.error) {
                res.json({
                    fulfillment_response: {
                        messages: [{
                            text: {
                                text: [`Lo siento, no pude encontrar el pedido #${orderId}. Por favor verifica el número e inténtalo de nuevo.`]
                            }
                        }]
                    }
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
                const orderDate = orderDetails.date_created ? new Date(orderDetails.date_created).toLocaleDateString('es-CL') : 'No disponible';
                
                res.json({
                    fulfillment_response: {
                        messages: [{
                            text: {
                                text: [`📦 Información de tu pedido #${orderId}:\n\n• Estado: ${status}\n• Fecha: ${orderDate}\n• Total: $${orderDetails.total || 'N/A'}\n\nPuedes ver más detalles en tu cuenta en ${process.env.SHOP_URL}/mi-cuenta`]
                            }
                        }]
                    }
                });
            }
        }
        // Sin parámetros específicos - mostrar productos destacados
        else {
            const queryParams = {
                per_page: 4,
                orderby: 'date',
                order: 'desc'
            };
            
            const products = await fetchProducts(queryParams);
            
            if (products.length === 0) {
                res.json({
                    fulfillment_response: {
                        messages: [{
                            text: {
                                text: [`¡Hola! Soy el asistente de Kāhiko Home. Actualmente no tengo productos para mostrar, pero puedes visitar nuestra tienda en ${process.env.SHOP_URL}/tienda para ver todo nuestro catálogo de muebles y cortinas premium.`]
                            }
                        }]
                    }
                });
            } else {
                const productCards = buildProductCards(products);
                
                res.json({
                    fulfillment_response: {
                        messages: [
                            {
                                text: {
                                    text: [`¡Bienvenido a Kāhiko Home! ✨ Estos son algunos de nuestros productos destacados:`]
                                }
                            },
                            {
                                payload: {
                                    richContent: [productCards]
                                }
                            },
                            {
                                text: {
                                    text: [`¿Buscas algo en específico? Puedes decirme "busco muebles para living" o "quiero ver cortinas roller". Haz clic en las tarjetas para ver más detalles.`]
                                }
                            }
                        ]
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.json({
            fulfillment_response: {
                messages: [{
                    text: {
                        text: [`Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde o visita nuestra tienda en ${process.env.SHOP_URL}`]
                    }
                }]
            }
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Connected to WooCommerce at: ${process.env.SHOP_URL}`);
});
