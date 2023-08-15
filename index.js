const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
var jwt = require('jsonwebtoken');


// middleware   


app.use(cors());
app.use(express.json());



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

        // get user 

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })
        // 

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