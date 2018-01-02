import * as express from 'express';
import * as http from 'http';
import * as fallback from 'connect-history-api-fallback';
import * as path from "path";

let app = express();
let server = new http.Server(app);

/*******************************
 * Send the compressed version of the javascript file
 *******************************/
app.get('*.js', function(req, res, next){
    req.url = req.url + '.gz';
    res.set("Content-Encoding", "gzip");
    res.set("Content-Type", "application/javascript; charset=utf-8");
    next();
});

/*******************************
 * Sets up the static routing
 *******************************/
app.use(express.static(path.join(__dirname, '../dist')));
app.use(fallback({verbose:true}));
app.use(express.static(path.join(__dirname, '../dist')));


server.listen(3005, '0.0.0.0');