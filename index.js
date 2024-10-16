const { spotify_client_secret, spotify_client_id } = require('./config.json')

//Import express
const express = require('express');
const { access } = require('fs');
const app = express()
const port = 3000
const querystring = require("querystring");

const redirect_uri = "http://localhost:3000/login"
var access_code = ""
var access_token = ""
var refresh_token = ""
var refresh_time = 5000

const refreshTokenTimer = (time) => {
    setTimeout(() => {
        console.log("Refreshing access token")
        fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }),
        })
        .then((response) => response.json())
        .then((data) => {
            access_token = data.access_token
            refresh_time = data.expires_in
            console.log("Refreshed access token")
        })
        refreshTokenTimer((refresh_time * 1000) - 3)
    }, time)
}

app.use('/static', function(req, res, next) {

    if (access_code == "") { 
        console.log("No access code found, redirecting to login page")
        // Permission to read user current song
        var scope = 'user-read-currently-playing user-read-playback-state';
  
        res.redirect('https://accounts.spotify.com/authorize?' +
          querystring.stringify({
            response_type: 'code',
            client_id: spotify_client_id,
            scope: scope,
            redirect_uri: redirect_uri,
         }));
    } else if (access_token == "" && access_code != "") {

        //Get access and refresh tokens
        fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
            },
            body: querystring.stringify({
                grant_type: 'authorization_code',
                code: access_code,
                redirect_uri: redirect_uri
            }),
            json: true
        })
        .then((response) => response.json())
        .then((data) => {
            console.log("Got access token")
            console.log(data.error)
            access_token = data.access_token
            refresh_token = data.refresh_token
            refresh_time = data.expires_in
        }).catch((error) => {
            console.log(error)
        })

        refreshTokenTimer((refresh_time * 1000) - 3)
    }
    next();
});

//Get access token
app.use('/login', function(req, res) {
    console.log("Access code found, redirecting to static page")
    access_code = req.query.code
    res.redirect('/static');
});

app.get('/spotify', (req, res) => {
    console.log("Requesting data from spotify")
    // fetch data fromhttps://api.spotify.com/v1/me/player and return it
    fetch('https://api.spotify.com/v1/me/player', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    })
    .then((response) => response.json())
    .then((data) => {
        res.status(200).json({data: data})
    })
})

app.use('/static', express.static('public'))

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
