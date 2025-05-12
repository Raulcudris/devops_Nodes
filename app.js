const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) =>{
    res.send("Backend Node.js funcionando!!!");
});

app.listen(PORT, ()=>{
    console.log(
        "Servidor corriendo en https:localhost:"+PORT
    );
});

app.get('/', (req, res) =>{
    res.send("Backend Node.js funcionandoxxx!!!");
});