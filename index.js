const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());




// user name : fixits-repaire
// pass : w-KN4N*P5p2a_VZ



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2bt3n.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: `UnAuthorized access` });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        client.connect();
        const fixitsCollection = client.db("fixits-repaire").collection("services");
        const userCollection = client.db("fixits-repaire").collection("users");
        const userPurchase = client.db("fixits-repaire").collection("purchase");
        const reviewCollection = client.db("fixits-repaire").collection("review");


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        }

        // payment getwaye
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })

        });

        // api data load
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = fixitsCollection.find(query);
            const fasion = await cursor.toArray();
            res.send(fasion);
        });

        // purchase
        app.post('/purchase', async (req, res) => {
            const booking = req.body;
            const result = await userPurchase.insertOne(booking);
            res.send(result);
        });

        // review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // load review api 
        app.get('/review', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const allReview = await cursor.toArray();
            res.send(allReview);
        });

        // purchase with Update Service quantity

        app.put('/tools/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const avaiable_quantity = req.body;
            const result = await fixitsCollection.updateOne({
                _id: ObjectId(id)
            },
                { $set: avaiable_quantity }

            );
            res.send(result);
        });

        // findOne service
        app.get('/servicePurchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await fixitsCollection.findOne(query);
            res.send(service);
        });

        // order 
        app.get('/purchase', async (req, res) => {
            const bookingMan = req.query.bookingMan;
            const decodedEmail = req.decoded.email;
            if (bookingMan === decodedEmail) {
                const query = { bookingMan: bookingMan };
                const bookings = await userPurchase.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'Forbidden aceess' });
            }
        });

        // Order updatae
        app.put('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { paid: 'success' },
            };
            const result = await userPurchase.updateOne(filter, updateDoc);
            res.send(result);
        });

        // order delete
        app.delete('/order/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userPurchase.deleteOne(query);
            res.send(result);
        });

        app.get('/booking', verifyJWT, async (req, res) => {
            const users = req.query.patient;
            const decodedEmail = req.decoded.email;
            // res.send(users);
            if (users === decodedEmail) {
                const query = { bookingMan: users };
                const bookings = await userPurchase.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            // 01854256704doly
        });

        app.get('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await userPurchase.findOne(query);
            res.send(booking);
        })


        // user update and token get
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        });



        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);

        });

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        });


        app.get('/product', verifyJWT, async (req, res) => {
            const product = await fixitsCollection.find().toArray();
            res.send(product);

        });
        // add  a product 
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await fixitsCollection.insertOne(doctor);
            res.send(result);
        });

        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {

            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await fixitsCollection.deleteOne(query);
            res.send(result);
        });

    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Fixit Repair server starting..!!!');
})
app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})
