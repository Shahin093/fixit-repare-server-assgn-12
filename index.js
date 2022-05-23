const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());




// user name : fixits-repaire
// pass : w-KN4N*P5p2a_VZ


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://fixits-repaire:w-KN4N*P5p2a_VZ@cluster0.2bt3n.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
    const collection = client.db("test").collection("devices");
    console.log('connnecteeed database .')
    // perform actions on the collection object
    client.close();
});


app.get('/', (req, res) => {
    res.send('Fixit Repair server starting..!!!');
})
app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})
