const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.Payment_Secret_key);
var jwt = require('jsonwebtoken');


// middleware   


app.use(cors());
app.use(express.json());

// JWT



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9z7i3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // we find and operate menu from here.

        const menuCollection = client.db("CreatiqueCommerceDb").collection("menu");

        app.get('/menu', async (req, res) => {

            const result = await menuCollection.find().toArray();
            res.send(result)

        });

        app.post('/menu', async (req, res) => {

            const newItem = req.body;
            const result = await menuCollection.insertOne(newItem)
            res.send(result);

        });

        app.delete('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })

        // close menu operate here

        const reviewsCollection = client.db("CreatiqueCommerceDb").collection("reviews");

        app.get('/reviews', async (req, res) => {

            const result = await reviewsCollection.find().toArray();
            res.send(result);

        });

        // cart colletion
        const cartCollection = client.db("CreatiqueCommerceDb").collection("carts");

        // get Collection of cart Data

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            console.log(email)
            if (!email) {
                res.send([])
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        // post cart collection

        app.post('/carts', async (req, res) => {

            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        // delete

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result)
        });

        // users collection

        const usersCollection = client.db("CreatiqueCommerceDb").collection("users");

        // users api 





        app.post('/users', async (req, res) => {

            const user = req.body;
            // user already exist?

            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            console.log('exisiitng', existingUser)
            if (existingUser) {
                return res.send({ massage: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        });



        // verify admin funtion 

        const verifyAdminHere = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })


            }
            next()
        }

        // get user 

        // secure user using jwt

        app.get('/users', verifyJWT, verifyAdminHere, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })


        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })



        // admin setup

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result);


        });

        // jwt token

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send(token)
        })

        // Create Payment Intent

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            console.log(price, amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']

            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })

        });

        const paymentsCollection = client.db("CreatiqueCommerceDb").collection("payments");
        // Payment relataed API

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentsCollection.insertOne(payment);
            // operate delete Here also

            const query = {_id: {$in: payment.cartItems.map(id=> new ObjectId(id))}}
            const deletedResult = await cartCollection.deleteMany(query)

            // here normal call for post..
            res.send({insertResult, deletedResult})
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// get resonse 
app.get('/', (req, res) => {
    res.send('boss is sitting')
});



app.listen(port, () => {
    console.log(`Boss is Sitting ${port}`)
})