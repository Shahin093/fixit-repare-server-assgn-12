const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'forbidden' })
            }

        }

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

        app.get('/booking', verifyJWT, async (req, res) => {
            const users = req.query.patient;
            const decodedEmail = req.decoded.email;
            console.log(users);
            console.log('decode : ', decodedEmail);
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

        })

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
