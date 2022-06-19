const express = require('express');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql');
const fs = require('fs');
const readline = require('readline');
const app = express();
var engines = require('consolidate');

const db = mysql.createConnection({
    host : '127.0.0.1',
    user: 'root',
    password : 'password',
    database : 'profiler'
});

db.connect(function (err) {
    if (err) throw err;
    console.log('DB 연결 성공');
});

module.exports = db;

app.set('port', process.env.PORT || 3000);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
});

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, done) {
            done(null, 'uploads/');
        },
        filename(req, file, done) {
            const ext = path.extname(file.originalname);
            done(null, path.basename(file.originalname));
        },
    }),
});

app.engine('html', engines.mustache);
app.set('view engine', 'html');

app.post('/uploadFile', upload.single('attachment'), (req, res) => {
    console.log('파일 읽기 시도')
    function processFile(filename) {
        var instream = fs.createReadStream(filename);
        var reader = readline.createInterface(instream, null);
       
        var pageNo = 0;
        var coreNo = 0;
       
        reader.on('line', function(line) {
            if (line.indexOf("task1") !== -1 )
                pageNo += 1;
       
            coreNo = 0;
            if (line.indexOf("core1") !== -1 ) coreNo = 1;
            if (line.indexOf("core2") !== -1 ) coreNo = 2;
            if (line.indexOf("core3") !== -1 ) coreNo = 3;
            if (line.indexOf("core4") !== -1 ) coreNo = 4;
            if (line.indexOf("core5") !== -1 ) coreNo = 5;
           
            if(coreNo > 0 && pageNo > 0) {
                var tokens = line.split('\t');
                if (tokens != undefined && tokens.length > 0) {
                    for(var i=1; i<tokens.length-1; ++i) {
                        sql = 'INSERT INTO t_score_board VALUES(?,?,?,?)';
                        db.query(sql, [pageNo, coreNo, i, tokens[i]], function (err, rows) {
                        if(err)
                            console.log('query is not excuted. select fail...\n' + err);
                        });
                    }
                }
            }
        });
       
        reader.on('close', function(line) {
            console.log('파일 읽기 성공');
        });
    }
   
    var filename = req.file.originalname;
    processFile(filename);

    var all_sql = `(SELECT core, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE task=1 GROUP BY core) union all
                    (SELECT core, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE task=2 GROUP BY core) union all
                    (SELECT core, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE task=3 GROUP BY core) union all
                    (SELECT core, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE task=4 GROUP BY core) union all
                    (SELECT core, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE task=5 GROUP BY core) union all
                    (SELECT task, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE core=1 GROUP BY task) union all
                    (SELECT task, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE core=2 GROUP BY task) union all
                    (SELECT task, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE core=3 GROUP BY task) union all
                    (SELECT task, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE core=4 GROUP BY task) union all
                    (SELECT task, MIN(score) AS min, MAX(score) AS max, AVG(score) AS avg, STD(score) AS std FROM t_score_board WHERE core=5 GROUP BY task)`;


    db.query(all_sql, function (err, rows) {
        if(err)
            console.log('query is not excuted. select fail...\n' + err);

        var maxData = []
        var minData = []
        var avgData = []
        var stdData = []

        if(rows) {
            rows.forEach(function(val) {
                maxData.push(val.max);
                minData.push(val.min);
                avgData.push(val.avg);
                stdData.push(val.std);
            });
        } else {
            maxData.max="";
            minData.min="";
            avgData.avg="";
            stdData.std="";
        }
        res.render('graph', { maxData, minData, avgData, stdData });
    })
});

app.listen(app.get('port'), () => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    console.log(app.get('port'), '번 포트에서 대기 중');
})
