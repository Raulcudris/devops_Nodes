const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) =>{
    res.send("Backend Node.js funcionando!")
});

app.listen(PORT, ()=>{
    console.log(
        "Servidor corriendo en https:localhost:"+PORT
    )
});